-- Health data consent: diet and allergies are only stored with explicit consent.
ALTER TABLE public.trip_traveler_profiles ADD COLUMN IF NOT EXISTS health_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_traveler_health_consent()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.health_consent_at IS NULL THEN
    NEW.diet := '{}';
    NEW.allergies := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trip_traveler_profiles_health_consent ON public.trip_traveler_profiles;
CREATE TRIGGER trip_traveler_profiles_health_consent
BEFORE INSERT OR UPDATE ON public.trip_traveler_profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_traveler_health_consent();

-- Self-deletion is logged without an actor once the account is gone.
ALTER TABLE public.admin_audit_log ALTER COLUMN actor_user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.delete_my_account(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_trip record;
  v_paths text[] := '{}';
  v_deleted_trips int := 0;
  v_transferred int := 0;
  v_heir uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  IF v_email IS NULL THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  IF lower(trim(coalesce(p_email,''))) <> lower(v_email) THEN RAISE EXCEPTION 'email_mismatch' USING ERRCODE='22023'; END IF;
  IF public.has_role(v_user, 'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_cannot_self_delete' USING ERRCODE='42501'; END IF;

  FOR v_trip IN SELECT m.trip_id, m.role FROM public.trip_members m WHERE m.user_id = v_user LOOP
    IF NOT EXISTS (SELECT 1 FROM public.trip_members o WHERE o.trip_id = v_trip.trip_id AND o.user_id <> v_user) THEN
      -- Only member: the whole trip goes, including document files (returned for storage removal).
      v_paths := v_paths || coalesce((SELECT array_agg(d.storage_path) FROM public.trip_documents d WHERE d.trip_id = v_trip.trip_id), '{}');
      DELETE FROM public.expense_splits WHERE expense_id IN (SELECT id FROM public.expenses WHERE trip_id = v_trip.trip_id);
      DELETE FROM public.expenses WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.decision_votes WHERE decision_id IN (SELECT id FROM public.decisions WHERE trip_id = v_trip.trip_id);
      DELETE FROM public.decision_options WHERE decision_id IN (SELECT id FROM public.decisions WHERE trip_id = v_trip.trip_id);
      DELETE FROM public.decisions WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.task_votes WHERE task_id IN (SELECT id FROM public.tasks WHERE trip_id = v_trip.trip_id);
      DELETE FROM public.tasks WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.trip_documents WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.trip_items WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.trip_invite_uses WHERE invite_id IN (SELECT id FROM public.trip_invites WHERE trip_id = v_trip.trip_id);
      DELETE FROM public.trip_invites WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.notifications WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.activity_events WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.activity_log WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.client_error_events WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.ai_usage_events WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.comments WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.reactions WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.submissions WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.travel_legs WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.accommodations WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.pois WHERE category_id IN (SELECT id FROM public.poi_categories WHERE trip_id = v_trip.trip_id);
      DELETE FROM public.poi_categories WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.trip_members WHERE trip_id = v_trip.trip_id;
      DELETE FROM public.trip WHERE id = v_trip.trip_id;
      v_deleted_trips := v_deleted_trips + 1;
    ELSIF v_trip.role = 'organizer' AND NOT EXISTS (
      SELECT 1 FROM public.trip_members o WHERE o.trip_id = v_trip.trip_id AND o.user_id <> v_user AND o.role = 'organizer'
    ) THEN
      -- Sole organizer with other members: the longest-present member takes over.
      SELECT o.user_id INTO v_heir FROM public.trip_members o
      WHERE o.trip_id = v_trip.trip_id AND o.user_id <> v_user
      ORDER BY o.joined_at ASC NULLS LAST, o.id ASC LIMIT 1;
      UPDATE public.trip_members SET role = 'organizer' WHERE trip_id = v_trip.trip_id AND user_id = v_heir;
      v_transferred := v_transferred + 1;
    END IF;
  END LOOP;

  DELETE FROM public.push_subscriptions WHERE user_id = v_user;
  DELETE FROM public.reminder_deliveries WHERE user_id = v_user;
  DELETE FROM public.reminder_test_events WHERE user_id = v_user;
  DELETE FROM public.calendar_feeds WHERE user_id = v_user;
  DELETE FROM public.trip_traveler_profiles WHERE user_id = v_user;
  DELETE FROM public.trip_members WHERE user_id = v_user;
  DELETE FROM public.notifications WHERE user_id = v_user;
  DELETE FROM public.notification_preferences WHERE user_id = v_user;
  DELETE FROM public.decision_votes WHERE user_id = v_user;
  DELETE FROM public.expense_splits WHERE user_id = v_user;
  DELETE FROM public.entitlements WHERE user_id = v_user;
  DELETE FROM public.ai_usage_events WHERE user_id = v_user;
  DELETE FROM public.activity_log WHERE user_id = v_user;
  DELETE FROM public.client_error_events WHERE user_id = v_user;
  DELETE FROM public.trip_invite_uses WHERE user_id = v_user;
  DELETE FROM public.user_roles WHERE user_id = v_user;
  DELETE FROM public.payment_details WHERE user_id = v_user;
  DELETE FROM public.profiles WHERE id = v_user;
  DELETE FROM auth.users WHERE id = v_user;

  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (NULL, 'user.self_deleted', 'user', v_user::text,
    jsonb_build_object('deleted_trips', v_deleted_trips, 'organizer_transfers', v_transferred));

  RETURN jsonb_build_object('storage_paths', to_jsonb(v_paths), 'deleted_trips', v_deleted_trips, 'organizer_transfers', v_transferred);
END $function$;

REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;