-- Free plan may hold three separate cost pots (Knaakies) instead of one.
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(
  p_name text,
  p_description text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_group_size integer DEFAULT 1,
  p_destination_name text DEFAULT NULL,
  p_destination_country text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_currency text DEFAULT 'EUR'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_active_owned integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN RAISE EXCEPTION 'trip_name_required'; END IF;
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN RAISE EXCEPTION 'invalid_trip_dates'; END IF;

  IF NOT (public.is_pro_user(v_user_id) OR public.has_role(v_user_id, 'admin'::public.app_role)) THEN
    SELECT count(*) INTO v_active_owned
    FROM public.trip_members m JOIN public.trip t ON t.id = m.trip_id
    WHERE m.user_id = v_user_id AND m.role = 'organizer' AND COALESCE(t.status, 'active') <> 'archived';
    IF v_active_owned >= 3 THEN RAISE EXCEPTION 'trip_limit_reached' USING ERRCODE = '42501'; END IF;
  END IF;

  INSERT INTO public.trip (name, description, start_date, end_date, group_size, created_by, destination_name, destination_country, timezone, currency)
  VALUES (trim(p_name), NULLIF(trim(COALESCE(p_description, '')), ''), p_start_date, p_end_date, GREATEST(COALESCE(p_group_size, 1), 1), v_user_id,
          NULLIF(trim(COALESCE(p_destination_name, '')), ''), NULLIF(trim(COALESCE(p_destination_country, '')), ''), NULLIF(trim(COALESCE(p_timezone, '')), ''),
          COALESCE(NULLIF(upper(trim(COALESCE(p_currency, ''))), ''), 'EUR'))
  RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_members (trip_id, user_id, role) VALUES (v_trip_id, v_user_id, 'organizer');
  RETURN v_trip_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_plan_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin boolean;
  v_pro boolean;
  v_owned integer;
  v_day_count integer;
  v_env text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  v_admin := has_role(v_user_id,'admin'::public.app_role);
  v_pro := v_admin OR is_pro_user(v_user_id);

  SELECT e.environment INTO v_env FROM entitlements e
  WHERE e.user_id = v_user_id AND (e.expires_at IS NULL OR e.expires_at > now())
  ORDER BY (e.environment = 'live') DESC, e.granted_at DESC LIMIT 1;

  SELECT count(*) INTO v_owned FROM trip_members m JOIN trip t ON t.id = m.trip_id
  WHERE m.user_id = v_user_id AND m.role = 'organizer' AND COALESCE(t.status,'active') <> 'archived';

  SELECT count(*) INTO v_day_count FROM ai_usage_events
  WHERE user_id = v_user_id AND feature = 'hansie' AND created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'plan', CASE WHEN v_admin THEN 'admin' WHEN v_pro THEN 'pro' ELSE 'free' END,
    'is_platform_admin', v_admin,
    'pro_environment', CASE WHEN v_admin THEN NULL WHEN v_pro THEN v_env ELSE NULL END,
    'trips_owned', v_owned,
    'trip_limit', CASE WHEN v_pro THEN NULL ELSE 3 END,
    'can_create_trip', v_pro OR v_owned < 3,
    'hansie_used_today', v_day_count,
    'hansie_day_limit', CASE WHEN v_pro THEN 150 ELSE 12 END,
    'document_limit_per_trip', CASE WHEN v_admin THEN 100000 WHEN v_pro THEN 200 ELSE 5 END
  );
END;
$function$;