CREATE TABLE public.calendar_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX calendar_feeds_trip_user_idx ON public.calendar_feeds (trip_id, user_id);
CREATE UNIQUE INDEX calendar_feeds_one_active_idx ON public.calendar_feeds (trip_id, user_id) WHERE revoked_at IS NULL;

GRANT SELECT ON public.calendar_feeds TO authenticated;
GRANT ALL ON public.calendar_feeds TO service_role;
ALTER TABLE public.calendar_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own calendar feeds" ON public.calendar_feeds
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_calendar_feed(p_trip_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_user uuid := auth.uid(); v_token text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_trip_member(v_user, p_trip_id) THEN RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501'; END IF;
  UPDATE public.calendar_feeds SET revoked_at = now()
   WHERE trip_id = p_trip_id AND user_id = v_user AND revoked_at IS NULL;
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  INSERT INTO public.calendar_feeds(trip_id, user_id, token_hash)
  VALUES (p_trip_id, v_user, encode(extensions.digest(v_token, 'sha256'), 'hex'));
  RETURN v_token;
END $function$;

CREATE OR REPLACE FUNCTION public.revoke_calendar_feed(p_trip_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  UPDATE public.calendar_feeds SET revoked_at = now()
   WHERE trip_id = p_trip_id AND user_id = v_user AND revoked_at IS NULL;
  RETURN FOUND;
END $function$;

-- Server-only lookup: returns the trip for an active feed whose owner is still a member.
CREATE OR REPLACE FUNCTION public.resolve_calendar_feed(p_token_hash text)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT f.trip_id FROM public.calendar_feeds f
   WHERE f.token_hash = p_token_hash AND f.revoked_at IS NULL
     AND public.is_trip_member(f.user_id, f.trip_id)
   LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.create_calendar_feed(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_calendar_feed(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_calendar_feed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_calendar_feed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_calendar_feed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_calendar_feed(text) TO service_role;

CREATE OR REPLACE FUNCTION public.ops_delete_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid := auth.uid(); v_email text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF p_user_id = v_actor THEN RAISE EXCEPTION 'cannot_delete_self' USING ERRCODE='23514'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'cannot_delete_platform_admin' USING ERRCODE='42501';
  END IF;

  DELETE FROM public.calendar_feeds WHERE user_id = p_user_id;
  DELETE FROM public.trip_traveler_profiles WHERE user_id = p_user_id;
  DELETE FROM public.trip_members WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = p_user_id;
  DELETE FROM public.decision_votes WHERE user_id = p_user_id;
  DELETE FROM public.expense_splits WHERE user_id = p_user_id;
  DELETE FROM public.entitlements WHERE user_id = p_user_id;
  DELETE FROM public.ai_usage_events WHERE user_id = p_user_id;
  DELETE FROM public.activity_log WHERE user_id = p_user_id;
  DELETE FROM public.client_error_events WHERE user_id = p_user_id;
  DELETE FROM public.trip_invite_uses WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.payment_details WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'user.deleted', 'user', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN true;
END $function$;