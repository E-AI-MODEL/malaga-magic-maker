-- Allow sandbox (test) payments to unlock Pro, switchable via app_settings.
INSERT INTO public.app_settings (key, value)
VALUES ('sandbox_pro_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_pro_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_pro_access(_user_id, 'live')
     OR (
       COALESCE((SELECT value FROM public.app_settings WHERE key = 'sandbox_pro_enabled'), 'true') = 'true'
       AND public.has_pro_access(_user_id, 'sandbox')
     );
$$;

REVOKE ALL ON FUNCTION public.is_pro_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_plan_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_pro boolean;
  v_owned integer;
  v_day_count integer;
  v_env text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  v_pro := is_pro_user(v_user_id);

  SELECT e.environment INTO v_env
  FROM entitlements e
  WHERE e.user_id = v_user_id
    AND (e.expires_at IS NULL OR e.expires_at > now())
  ORDER BY (e.environment = 'live') DESC, e.granted_at DESC
  LIMIT 1;

  SELECT count(*) INTO v_owned
  FROM trip_members m JOIN trip t ON t.id = m.trip_id
  WHERE m.user_id = v_user_id AND m.role = 'organizer' AND COALESCE(t.status,'active') <> 'archived';

  SELECT count(*) INTO v_day_count
  FROM ai_usage_events WHERE user_id = v_user_id AND feature = 'hansie' AND created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'plan', CASE WHEN v_pro THEN 'pro' ELSE 'free' END,
    'pro_environment', CASE WHEN v_pro THEN v_env ELSE NULL END,
    'trips_owned', v_owned,
    'trip_limit', CASE WHEN v_pro THEN NULL ELSE 1 END,
    'can_create_trip', v_pro OR v_owned < 1,
    'hansie_used_today', v_day_count,
    'hansie_day_limit', CASE WHEN v_pro THEN 150 ELSE 12 END,
    'document_limit_per_trip', CASE WHEN v_pro THEN 200 ELSE 5 END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_plan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan_status() TO authenticated, service_role;