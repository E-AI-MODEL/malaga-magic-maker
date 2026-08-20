-- 1. Admin bypass on plan limits
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(p_name text, p_description text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_group_size integer DEFAULT 1, p_destination_name text DEFAULT NULL::text, p_destination_country text DEFAULT NULL::text, p_timezone text DEFAULT NULL::text, p_currency text DEFAULT 'EUR'::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    IF v_active_owned >= 1 THEN RAISE EXCEPTION 'trip_limit_reached' USING ERRCODE = '42501'; END IF;
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

CREATE OR REPLACE FUNCTION public.reserve_trip_document(p_trip_id uuid, p_trip_item_id uuid, p_filename text, p_mime_type text, p_document_type text DEFAULT 'other'::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  v_user_id uuid:=auth.uid();
  v_id uuid:=gen_random_uuid();
  v_path text;
  v_admin boolean;
  v_pro boolean;
  v_limit integer;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  v_admin := public.has_role(v_user_id,'admin'::public.app_role);
  IF NOT (public.is_trip_member(v_user_id,p_trip_id) OR v_admin) THEN RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501'; END IF;
  IF p_filename IS NULL OR length(btrim(p_filename)) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'invalid_filename' USING ERRCODE='23514'; END IF;
  IF p_mime_type NOT IN('application/pdf','image/jpeg','image/png','image/webp') THEN RAISE EXCEPTION 'unsupported_document_type' USING ERRCODE='23514'; END IF;
  IF p_document_type NOT IN('booking_confirmation','ticket','voucher','insurance','other') THEN RAISE EXCEPTION 'invalid_document_type' USING ERRCODE='23514'; END IF;
  IF p_trip_item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.trip_items i WHERE i.id=p_trip_item_id AND i.trip_id=p_trip_id) THEN RAISE EXCEPTION 'document_item_trip_mismatch' USING ERRCODE='23514'; END IF;

  v_pro := v_admin OR public.is_pro_user(v_user_id)
    OR EXISTS (SELECT 1 FROM public.trip_members m WHERE m.trip_id = p_trip_id AND m.role = 'organizer' AND public.is_pro_user(m.user_id));
  v_limit := CASE WHEN v_admin THEN 100000 WHEN v_pro THEN 200 ELSE 5 END;

  SELECT count(*) INTO v_count FROM public.trip_documents d WHERE d.trip_id = p_trip_id;
  IF v_count >= v_limit THEN RAISE EXCEPTION 'document_limit_reached' USING ERRCODE='42501'; END IF;

  v_path:=p_trip_id::text||'/'||v_id::text;
  INSERT INTO public.trip_documents(id,trip_id,trip_item_id,uploaded_by,filename,mime_type,document_type,storage_path)
  VALUES(v_id,p_trip_id,p_trip_item_id,v_user_id,btrim(p_filename),p_mime_type,p_document_type,v_path);
  RETURN jsonb_build_object('id',v_id,'storage_path',v_path);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_plan_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    'trip_limit', CASE WHEN v_pro THEN NULL ELSE 1 END,
    'can_create_trip', v_pro OR v_owned < 1,
    'hansie_used_today', v_day_count,
    'hansie_day_limit', CASE WHEN v_pro THEN 150 ELSE 12 END,
    'document_limit_per_trip', CASE WHEN v_admin THEN 100000 WHEN v_pro THEN 200 ELSE 5 END
  );
END;
$function$;

-- 2. Platform settings
INSERT INTO public.app_settings(key, value) VALUES
  ('signups_open','true'),
  ('hansie_enabled','true'),
  ('payments_enabled','true'),
  ('maintenance_mode','false')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read intake deadline" ON public.app_settings;
CREATE POLICY "Authenticated can read platform switches"
ON public.app_settings FOR SELECT TO authenticated
USING (key IN ('signups_open','hansie_enabled','payments_enabled','maintenance_mode','intake_deadline'));

CREATE POLICY "Anon can read platform switches"
ON public.app_settings FOR SELECT TO anon
USING (key IN ('signups_open','maintenance_mode','payments_enabled'));

GRANT SELECT ON public.app_settings TO anon;

CREATE OR REPLACE FUNCTION public.ops_list_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  RETURN COALESCE((SELECT jsonb_object_agg(s.key, s.value) FROM public.app_settings s), '{}'::jsonb);
END $function$;

CREATE OR REPLACE FUNCTION public.ops_set_setting(p_key text, p_value text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_actor uuid := auth.uid(); v_old text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF p_key NOT IN ('signups_open','hansie_enabled','payments_enabled','maintenance_mode','sandbox_pro_enabled') THEN RAISE EXCEPTION 'unknown_setting' USING ERRCODE='23514'; END IF;
  IF p_value NOT IN ('true','false') THEN RAISE EXCEPTION 'invalid_setting_value' USING ERRCODE='23514'; END IF;
  SELECT value INTO v_old FROM public.app_settings WHERE key = p_key;
  INSERT INTO public.app_settings(key, value) VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'setting.changed', 'app_setting', p_key, jsonb_build_object('from', v_old, 'to', p_value));
  RETURN true;
END $function$;

-- 3. Pro grant / revoke
CREATE OR REPLACE FUNCTION public.ops_grant_pro(p_user_id uuid, p_note text DEFAULT NULL::text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.entitlements(user_id, product_id, price_id, stripe_session_id, amount_cents, currency, environment)
  VALUES (p_user_id, 'vakansie_pro', 'admin_grant', 'admin_grant_' || gen_random_uuid()::text, 0, 'eur', 'live');
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'pro.granted', 'user', p_user_id::text, jsonb_build_object('note', p_note));
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.ops_revoke_pro(p_user_id uuid, p_note text DEFAULT NULL::text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_actor uuid := auth.uid(); v_count integer;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  UPDATE public.entitlements SET expires_at = now(), updated_at = now()
  WHERE user_id = p_user_id AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'pro.revoked', 'user', p_user_id::text, jsonb_build_object('note', p_note, 'revoked_count', v_count));
  RETURN true;
END $function$;

-- 4. Destructive ops
CREATE OR REPLACE FUNCTION public.ops_delete_trip(p_trip_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_actor uuid := auth.uid(); v_name text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  SELECT name INTO v_name FROM public.trip WHERE id = p_trip_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'trip_not_found' USING ERRCODE='P0002'; END IF;

  DELETE FROM public.expense_splits WHERE expense_id IN (SELECT id FROM public.expenses WHERE trip_id = p_trip_id);
  DELETE FROM public.expenses WHERE trip_id = p_trip_id;
  DELETE FROM public.decision_votes WHERE decision_id IN (SELECT id FROM public.decisions WHERE trip_id = p_trip_id);
  DELETE FROM public.decision_options WHERE decision_id IN (SELECT id FROM public.decisions WHERE trip_id = p_trip_id);
  DELETE FROM public.decisions WHERE trip_id = p_trip_id;
  DELETE FROM public.task_votes WHERE task_id IN (SELECT id FROM public.tasks WHERE trip_id = p_trip_id);
  DELETE FROM public.tasks WHERE trip_id = p_trip_id;
  DELETE FROM public.trip_documents WHERE trip_id = p_trip_id;
  DELETE FROM public.trip_items WHERE trip_id = p_trip_id;
  DELETE FROM public.trip_invite_uses WHERE invite_id IN (SELECT id FROM public.trip_invites WHERE trip_id = p_trip_id);
  DELETE FROM public.trip_invites WHERE trip_id = p_trip_id;
  DELETE FROM public.notifications WHERE trip_id = p_trip_id;
  DELETE FROM public.activity_events WHERE trip_id = p_trip_id;
  DELETE FROM public.activity_log WHERE trip_id = p_trip_id;
  DELETE FROM public.client_error_events WHERE trip_id = p_trip_id;
  DELETE FROM public.ai_usage_events WHERE trip_id = p_trip_id;
  DELETE FROM public.comments WHERE trip_id = p_trip_id;
  DELETE FROM public.reactions WHERE trip_id = p_trip_id;
  DELETE FROM public.submissions WHERE trip_id = p_trip_id;
  DELETE FROM public.travel_legs WHERE trip_id = p_trip_id;
  DELETE FROM public.accommodations WHERE trip_id = p_trip_id;
  DELETE FROM public.pois WHERE category_id IN (SELECT id FROM public.poi_categories WHERE trip_id = p_trip_id);
  DELETE FROM public.poi_categories WHERE trip_id = p_trip_id;
  DELETE FROM public.trip_members WHERE trip_id = p_trip_id;
  DELETE FROM public.trip WHERE id = p_trip_id;

  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'trip.deleted', 'trip', p_trip_id::text, jsonb_build_object('name', v_name));
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.ops_delete_user(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_actor uuid := auth.uid(); v_email text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF p_user_id = v_actor THEN RAISE EXCEPTION 'cannot_delete_self' USING ERRCODE='23514'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'cannot_delete_platform_admin' USING ERRCODE='42501';
  END IF;

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
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'user.deleted', 'user', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN true;
END $function$;

-- 5. Hansie global switch + admin exemption
CREATE OR REPLACE FUNCTION public.consume_hansie_quota(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_admin boolean;
  v_hour_count integer;
  v_day_count integer;
  v_pro boolean;
  v_hour_limit integer;
  v_day_limit integer;
  v_retry integer := 0;
  v_oldest timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  v_admin := public.has_role(v_user_id,'admin'::public.app_role);
  IF NOT(public.is_trip_member(v_user_id,p_trip_id) OR v_admin) THEN RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501'; END IF;

  IF NOT v_admin AND COALESCE((SELECT value FROM public.app_settings WHERE key='hansie_enabled'),'true') <> 'true' THEN
    RETURN jsonb_build_object('allowed',false,'reason','hansie_disabled','plan','free','retry_after_seconds',0,'hour_count',0,'day_count',0,'hour_limit',0,'day_limit',0);
  END IF;

  v_pro := public.is_pro_user(v_user_id) OR v_admin;
  v_hour_limit := CASE WHEN v_admin THEN 500 WHEN v_pro THEN 30 ELSE 8 END;
  v_day_limit := CASE WHEN v_admin THEN 2000 WHEN v_pro THEN 150 ELSE 12 END;

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

-- 6. Admin write access on trip-owned tables where INSERT lacked it
DROP POLICY IF EXISTS "Trip members can create decisions" ON public.decisions;
CREATE POLICY "Trip members can create decisions" ON public.decisions FOR INSERT TO authenticated
WITH CHECK ((public.is_trip_member(auth.uid(), trip_id) OR public.has_role(auth.uid(),'admin'::public.app_role)) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Trip members can insert own expenses" ON public.expenses;
CREATE POLICY "Trip members can insert own expenses" ON public.expenses FOR INSERT TO authenticated
WITH CHECK ((public.is_trip_member(auth.uid(), trip_id) OR public.has_role(auth.uid(),'admin'::public.app_role)) AND created_by = auth.uid());

REVOKE EXECUTE ON FUNCTION public.ops_list_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_set_setting(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_grant_pro(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_revoke_pro(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_delete_trip(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ops_delete_user(uuid) FROM anon;