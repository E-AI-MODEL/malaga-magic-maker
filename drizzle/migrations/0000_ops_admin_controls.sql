CREATE OR REPLACE FUNCTION public.ops_grant_pro_until(p_user_id uuid, p_expires_at timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN RAISE EXCEPTION 'expiry_in_past' USING ERRCODE='22023'; END IF;
  INSERT INTO public.entitlements(user_id, product_id, price_id, stripe_session_id, amount_cents, currency, environment, expires_at)
  VALUES (p_user_id, 'vakansie_pro', 'admin_grant', 'admin_grant_' || gen_random_uuid()::text, 0, 'eur', 'live', p_expires_at);
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'pro.granted', 'user', p_user_id::text, jsonb_build_object('note', p_note, 'expires_at', p_expires_at));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.ops_grant_pro_until(uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_grant_pro_until(uuid, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ops_get_user_access(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'is_admin', public.has_role(p_user_id,'admin'::public.app_role),
    'banned_until', (SELECT u.banned_until FROM auth.users u WHERE u.id = p_user_id),
    'pro_active', EXISTS(SELECT 1 FROM public.entitlements e WHERE e.user_id = p_user_id AND e.product_id='vakansie_pro' AND (e.expires_at IS NULL OR e.expires_at > now())),
    'pro_until', (SELECT CASE WHEN bool_or(e.expires_at IS NULL) THEN NULL ELSE max(e.expires_at) END FROM public.entitlements e WHERE e.user_id = p_user_id AND e.product_id='vakansie_pro' AND (e.expires_at IS NULL OR e.expires_at > now()))
  );
END $$;
REVOKE ALL ON FUNCTION public.ops_get_user_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_get_user_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ops_set_admin_role(p_user_id uuid, p_admin boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  IF p_admin THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id,'admin') ON CONFLICT DO NOTHING;
  ELSE
    IF p_user_id = v_actor THEN RAISE EXCEPTION 'cannot_remove_own_admin' USING ERRCODE='42501'; END IF;
    IF (SELECT count(*) FROM public.user_roles WHERE role='admin') <= 1 THEN RAISE EXCEPTION 'last_admin' USING ERRCODE='42501'; END IF;
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role='admin';
  END IF;
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, CASE WHEN p_admin THEN 'role.admin_granted' ELSE 'role.admin_revoked' END, 'user', p_user_id::text, '{}'::jsonb);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.ops_set_admin_role(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_set_admin_role(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.ops_add_trip_member(p_trip_id uuid, p_user_id uuid, p_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF p_role NOT IN ('organizer','member') THEN RAISE EXCEPTION 'invalid_role' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.trip t WHERE t.id = p_trip_id) THEN RAISE EXCEPTION 'trip_not_found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.trip_members(trip_id, user_id, role, joined_at) VALUES (p_trip_id, p_user_id, p_role, now())
  ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'trip.member_added', 'trip', p_trip_id::text, jsonb_build_object('user_id', p_user_id, 'role', p_role));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.ops_add_trip_member(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_add_trip_member(uuid, uuid, text) TO authenticated;