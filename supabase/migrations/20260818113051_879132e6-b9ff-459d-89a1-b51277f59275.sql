BEGIN;

-- 1. Task attachments: no more anonymous public read
DROP POLICY IF EXISTS "Anyone can read task attachments" ON storage.objects;

CREATE POLICY "Task attachment owners and admins can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 2. app_settings: admin-only, except the public intake deadline key
DROP POLICY IF EXISTS "Authenticated can read app settings" ON public.app_settings;

CREATE POLICY "Admins can read app settings"
ON public.app_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated can read intake deadline"
ON public.app_settings FOR SELECT TO authenticated
USING (key = 'intake_deadline');

-- 3. SECURITY DEFINER function exposure
-- 3a. Trigger functions are never called directly through the API
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 3b. Internal helpers must not be callable by API roles
REVOKE ALL ON FUNCTION public.emit_trip_activity(uuid, uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emit_user_notification(uuid, uuid, uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notification_category_enabled(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_invites_for_user_deletion(uuid) FROM PUBLIC, anon, authenticated;

-- 3c. Signed-out callers keep access only to the invite preview
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND p.proname <> 'get_trip_invite_preview'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- Restore grants for authenticated on functions that were only revoked via PUBLIC
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_organizer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_username(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_trip_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_trip_with_owner(text, text, date, date, integer, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trip_invite_preview(text) TO anon, authenticated;

-- 4. Rotatable trip invite codes
CREATE OR REPLACE FUNCTION public.regenerate_trip_invite_code(p_trip_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_user_id uuid := auth.uid(); v_code text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_trip_organizer(v_user_id, p_trip_id) OR public.has_role(v_user_id, 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'invite_code_rotate_forbidden' USING ERRCODE='42501';
  END IF;
  v_code := encode(extensions.gen_random_bytes(9), 'hex');
  UPDATE public.trip SET invite_code = v_code WHERE id = p_trip_id;
  RETURN v_code;
END $$;

REVOKE ALL ON FUNCTION public.regenerate_trip_invite_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_trip_invite_code(uuid) TO authenticated;

-- Removing a member invalidates the old shared code automatically
CREATE OR REPLACE FUNCTION public.rotate_invite_code_on_member_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.trip
  SET invite_code = encode(extensions.gen_random_bytes(9), 'hex')
  WHERE id = OLD.trip_id;
  RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION public.rotate_invite_code_on_member_removal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_rotate_invite_code_on_member_removal ON public.trip_members;
CREATE TRIGGER trg_rotate_invite_code_on_member_removal
AFTER DELETE ON public.trip_members
FOR EACH ROW EXECUTE FUNCTION public.rotate_invite_code_on_member_removal();

COMMIT;