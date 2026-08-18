-- BUILD 09 live foundation: internal platform operations.
-- This file restores source control for migration version 20260818100000,
-- already applied in production. Later hardening migrations may replace
-- individual functions with additional observability fields.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (length(btrim(action)) > 0),
  target_type text NOT NULL CHECK (length(btrim(target_type)) > 0),
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx ON public.admin_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;

DROP POLICY IF EXISTS "Platform admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Platform admins can read audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.ops_search_users(p_query text DEFAULT '', p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_query text := lower(btrim(COALESCE(p_query, '')));
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT u.created_at, jsonb_build_object(
      'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'display_name', p.display_name, 'username', p.username,
      'roles', COALESCE((SELECT jsonb_agg(r.role::text ORDER BY r.role::text) FROM public.user_roles r WHERE r.user_id = u.id), '[]'::jsonb),
      'trip_count', (SELECT count(*) FROM public.trip_members tm WHERE tm.user_id = u.id)
    ) AS row_data
    FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
    WHERE v_query = ''
       OR lower(COALESCE(u.email, '')) LIKE '%' || v_query || '%'
       OR lower(COALESCE(p.display_name, '')) LIKE '%' || v_query || '%'
       OR lower(COALESCE(p.username, '')) LIKE '%' || v_query || '%'
    ORDER BY u.created_at DESC LIMIT v_limit
  ) rows;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_get_user_overview(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'display_name', p.display_name, 'username', p.username,
    'roles', COALESCE((SELECT jsonb_agg(r.role::text ORDER BY r.role::text) FROM public.user_roles r WHERE r.user_id = u.id), '[]'::jsonb),
    'memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'trip_id', t.id, 'trip_name', t.name, 'destination_name', t.destination_name,
        'trip_status', t.status, 'role', tm.role, 'joined_at', tm.joined_at
      ) ORDER BY t.start_date NULLS LAST, t.created_at DESC)
      FROM public.trip_members tm JOIN public.trip t ON t.id = tm.trip_id WHERE tm.user_id = u.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = p_user_id;
  IF v_result IS NULL THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_search_trips(p_query text DEFAULT '', p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_query text := lower(btrim(COALESCE(p_query, '')));
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT t.created_at, jsonb_build_object(
      'id', t.id, 'name', t.name, 'destination_name', t.destination_name, 'destination_country', t.destination_country,
      'start_date', t.start_date, 'end_date', t.end_date, 'status', t.status, 'created_by', t.created_by,
      'creator_name', p.display_name,
      'member_count', (SELECT count(*) FROM public.trip_members tm WHERE tm.trip_id = t.id),
      'item_count', (SELECT count(*) FROM public.trip_items i WHERE i.trip_id = t.id),
      'open_task_count', (SELECT count(*) FROM public.tasks x WHERE x.trip_id = t.id AND x.status <> 'done' AND COALESCE(x.progress, 0) < 100),
      'document_count', (SELECT count(*) FROM public.trip_documents d WHERE d.trip_id = t.id AND d.status = 'ready')
    ) AS row_data
    FROM public.trip t LEFT JOIN public.profiles p ON p.id = t.created_by
    WHERE v_query = ''
       OR lower(COALESCE(t.name, '')) LIKE '%' || v_query || '%'
       OR lower(COALESCE(t.destination_name, '')) LIKE '%' || v_query || '%'
       OR lower(COALESCE(t.destination_country, '')) LIKE '%' || v_query || '%'
    ORDER BY t.created_at DESC LIMIT v_limit
  ) rows;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_get_trip_overview(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'id', t.id, 'name', t.name, 'destination_name', t.destination_name, 'destination_country', t.destination_country,
    'start_date', t.start_date, 'end_date', t.end_date, 'status', t.status, 'created_by', t.created_by, 'created_at', t.created_at,
    'member_count', (SELECT count(*) FROM public.trip_members tm WHERE tm.trip_id = t.id),
    'item_count', (SELECT count(*) FROM public.trip_items i WHERE i.trip_id = t.id),
    'open_task_count', (SELECT count(*) FROM public.tasks x WHERE x.trip_id = t.id AND x.status <> 'done' AND COALESCE(x.progress, 0) < 100),
    'open_decision_count', (SELECT count(*) FROM public.decisions d WHERE d.trip_id = t.id AND d.status = 'open'),
    'document_count', (SELECT count(*) FROM public.trip_documents d WHERE d.trip_id = t.id AND d.status = 'ready'),
    'active_invite_count', (SELECT count(*) FROM public.trip_invites i WHERE i.trip_id = t.id AND i.revoked_at IS NULL AND i.expires_at > now() AND i.use_count < i.max_uses),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', tm.user_id, 'display_name', p.display_name, 'email', u.email,
        'role', tm.role, 'joined_at', tm.joined_at
      ) ORDER BY tm.joined_at)
      FROM public.trip_members tm
      LEFT JOIN public.profiles p ON p.id = tm.user_id
      LEFT JOIN auth.users u ON u.id = tm.user_id
      WHERE tm.trip_id = t.id
    ), '[]'::jsonb)
  ) INTO v_result FROM public.trip t WHERE t.id = p_trip_id;
  IF v_result IS NULL THEN RAISE EXCEPTION 'trip_not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_set_trip_status(p_trip_id uuid, p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_old_status text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('planning','active','completed','archived') THEN
    RAISE EXCEPTION 'invalid_trip_status' USING ERRCODE = '23514';
  END IF;
  SELECT status INTO v_old_status FROM public.trip WHERE id = p_trip_id FOR UPDATE;
  IF v_old_status IS NULL THEN RAISE EXCEPTION 'trip_not_found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.trip SET status = p_status WHERE id = p_trip_id;
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'trip.status_changed', 'trip', p_trip_id::text, jsonb_build_object('from', v_old_status, 'to', p_status));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_revoke_trip_invite(p_invite_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_trip_id uuid; v_was_revoked timestamptz;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  SELECT trip_id, revoked_at INTO v_trip_id, v_was_revoked FROM public.trip_invites WHERE id = p_invite_id FOR UPDATE;
  IF v_trip_id IS NULL THEN RAISE EXCEPTION 'invite_not_found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.trip_invites SET revoked_at = COALESCE(revoked_at, now()) WHERE id = p_invite_id;
  IF v_was_revoked IS NULL THEN
    INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
    VALUES (v_actor, 'invite.revoked', 'trip_invite', p_invite_id::text, jsonb_build_object('trip_id', v_trip_id));
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_get_system_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM auth.users),
    'trips', (SELECT count(*) FROM public.trip),
    'active_trips', (SELECT count(*) FROM public.trip WHERE status IN ('planning','active')),
    'archived_trips', (SELECT count(*) FROM public.trip WHERE status = 'archived'),
    'trip_items', (SELECT count(*) FROM public.trip_items),
    'open_tasks', (SELECT count(*) FROM public.tasks WHERE status <> 'done' AND COALESCE(progress,0) < 100),
    'ready_documents', (SELECT count(*) FROM public.trip_documents WHERE status = 'ready'),
    'active_invites', (SELECT count(*) FROM public.trip_invites WHERE revoked_at IS NULL AND expires_at > now() AND use_count < max_uses),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_search_users(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_get_user_overview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_search_trips(text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_get_trip_overview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_set_trip_status(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_revoke_trip_invite(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ops_get_system_summary() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ops_search_users(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_get_user_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_search_trips(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_get_trip_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_set_trip_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_revoke_trip_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_get_system_summary() TO authenticated;
