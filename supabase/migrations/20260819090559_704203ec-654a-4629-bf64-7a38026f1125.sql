-- Plan limits: free vs Pro. Pro is granted by a real (live) payment only.
CREATE OR REPLACE FUNCTION public.is_pro_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_pro_access(_user_id, 'live');
$$;

REVOKE ALL ON FUNCTION public.is_pro_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pro_user(uuid) TO authenticated, service_role;

-- Trip creation limit -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(p_name text, p_description text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_group_size integer DEFAULT 1, p_destination_name text DEFAULT NULL::text, p_destination_country text DEFAULT NULL::text, p_timezone text DEFAULT NULL::text, p_currency text DEFAULT 'EUR'::text)
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'trip_name_required';
  END IF;

  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_trip_dates';
  END IF;

  IF NOT public.is_pro_user(v_user_id) THEN
    SELECT count(*) INTO v_active_owned
    FROM public.trip_members m
    JOIN public.trip t ON t.id = m.trip_id
    WHERE m.user_id = v_user_id
      AND m.role = 'organizer'
      AND COALESCE(t.status, 'active') <> 'archived';

    IF v_active_owned >= 1 THEN
      RAISE EXCEPTION 'trip_limit_reached' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.trip (
    name, description, start_date, end_date, group_size, created_by,
    destination_name, destination_country, timezone, currency
  )
  VALUES (
    trim(p_name),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    p_start_date,
    p_end_date,
    GREATEST(COALESCE(p_group_size, 1), 1),
    v_user_id,
    NULLIF(trim(COALESCE(p_destination_name, '')), ''),
    NULLIF(trim(COALESCE(p_destination_country, '')), ''),
    NULLIF(trim(COALESCE(p_timezone, '')), ''),
    COALESCE(NULLIF(upper(trim(COALESCE(p_currency, ''))), ''), 'EUR')
  )
  RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'organizer');

  RETURN v_trip_id;
END;
$function$;

-- Hansie quota: plan aware --------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_hansie_quota(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_hour_count integer;
  v_day_count integer;
  v_pro boolean;
  v_hour_limit integer;
  v_day_limit integer;
  v_retry integer := 0;
  v_oldest timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT(public.is_trip_member(v_user_id,p_trip_id) OR public.has_role(v_user_id,'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501';
  END IF;

  v_pro := public.is_pro_user(v_user_id) OR public.has_role(v_user_id,'admin'::public.app_role);
  v_hour_limit := CASE WHEN v_pro THEN 30 ELSE 8 END;
  v_day_limit := CASE WHEN v_pro THEN 150 ELSE 12 END;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text||':hansie'));
  SELECT count(*) INTO v_hour_count FROM public.ai_usage_events WHERE user_id=v_user_id AND feature='hansie' AND created_at>now()-interval '1 hour';
  SELECT count(*) INTO v_day_count FROM public.ai_usage_events WHERE user_id=v_user_id AND feature='hansie' AND created_at>now()-interval '24 hours';

  IF v_hour_count>=v_hour_limit THEN
    SELECT min(created_at) INTO v_oldest FROM public.ai_usage_events WHERE user_id=v_user_id AND feature='hansie' AND created_at>now()-interval '1 hour';
    v_retry:=GREATEST(1,CEIL(EXTRACT(EPOCH FROM(v_oldest+interval '1 hour'-now())))::integer);
    RETURN jsonb_build_object('allowed',false,'reason','hourly_limit','plan',CASE WHEN v_pro THEN 'pro' ELSE 'free' END,'retry_after_seconds',v_retry,'hour_count',v_hour_count,'day_count',v_day_count,'hour_limit',v_hour_limit,'day_limit',v_day_limit);
  END IF;

  IF v_day_count>=v_day_limit THEN
    SELECT min(created_at) INTO v_oldest FROM public.ai_usage_events WHERE user_id=v_user_id AND feature='hansie' AND created_at>now()-interval '24 hours';
    v_retry:=GREATEST(1,CEIL(EXTRACT(EPOCH FROM(v_oldest+interval '24 hours'-now())))::integer);
    RETURN jsonb_build_object('allowed',false,'reason','daily_limit','plan',CASE WHEN v_pro THEN 'pro' ELSE 'free' END,'retry_after_seconds',v_retry,'hour_count',v_hour_count,'day_count',v_day_count,'hour_limit',v_hour_limit,'day_limit',v_day_limit);
  END IF;

  INSERT INTO public.ai_usage_events(user_id,trip_id,feature) VALUES(v_user_id,p_trip_id,'hansie');
  RETURN jsonb_build_object('allowed',true,'plan',CASE WHEN v_pro THEN 'pro' ELSE 'free' END,'retry_after_seconds',0,'hour_count',v_hour_count+1,'day_count',v_day_count+1,'hour_limit',v_hour_limit,'day_limit',v_day_limit);
END $function$;

-- Document storage limit ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_trip_document(p_trip_id uuid, p_trip_item_id uuid, p_filename text, p_mime_type text, p_document_type text DEFAULT 'other'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid:=auth.uid();
  v_id uuid:=gen_random_uuid();
  v_path text;
  v_pro boolean;
  v_limit integer;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_trip_member(v_user_id,p_trip_id) THEN RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501'; END IF;
  IF p_filename IS NULL OR length(btrim(p_filename)) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'invalid_filename' USING ERRCODE='23514'; END IF;
  IF p_mime_type NOT IN('application/pdf','image/jpeg','image/png','image/webp') THEN RAISE EXCEPTION 'unsupported_document_type' USING ERRCODE='23514'; END IF;
  IF p_document_type NOT IN('booking_confirmation','ticket','voucher','insurance','other') THEN RAISE EXCEPTION 'invalid_document_type' USING ERRCODE='23514'; END IF;
  IF p_trip_item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.trip_items i WHERE i.id=p_trip_item_id AND i.trip_id=p_trip_id) THEN RAISE EXCEPTION 'document_item_trip_mismatch' USING ERRCODE='23514'; END IF;

  v_pro := public.is_pro_user(v_user_id)
    OR EXISTS (
      SELECT 1 FROM public.trip_members m
      WHERE m.trip_id = p_trip_id AND m.role = 'organizer' AND public.is_pro_user(m.user_id)
    );
  v_limit := CASE WHEN v_pro THEN 200 ELSE 5 END;

  SELECT count(*) INTO v_count FROM public.trip_documents d WHERE d.trip_id = p_trip_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'document_limit_reached' USING ERRCODE='42501';
  END IF;

  v_path:=p_trip_id::text||'/'||v_id::text;
  INSERT INTO public.trip_documents(id,trip_id,trip_item_id,uploaded_by,filename,mime_type,document_type,storage_path)
  VALUES(v_id,p_trip_id,p_trip_item_id,v_user_id,btrim(p_filename),p_mime_type,p_document_type,v_path);
  RETURN jsonb_build_object('id',v_id,'storage_path',v_path);
END;
$function$;

-- Plan status for the UI ----------------------------------------------------
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  v_pro := is_pro_user(v_user_id);

  SELECT count(*) INTO v_owned
  FROM trip_members m JOIN trip t ON t.id = m.trip_id
  WHERE m.user_id = v_user_id AND m.role = 'organizer' AND COALESCE(t.status,'active') <> 'archived';

  SELECT count(*) INTO v_day_count
  FROM ai_usage_events WHERE user_id = v_user_id AND feature = 'hansie' AND created_at > now() - interval '24 hours';

  RETURN jsonb_build_object(
    'plan', CASE WHEN v_pro THEN 'pro' ELSE 'free' END,
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