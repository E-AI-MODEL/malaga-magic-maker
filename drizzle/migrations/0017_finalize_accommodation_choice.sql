CREATE OR REPLACE FUNCTION public.finalize_accommodation_choice(p_decision_id uuid, p_option_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_uid uuid := auth.uid(); v_decision public.decisions%ROWTYPE; v_option public.decision_options%ROWTYPE;
 v_trip public.trip%ROWTYPE; v_item_id uuid; v_url text; v_tz text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 SELECT * INTO v_decision FROM public.decisions WHERE id = p_decision_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'decision_not_found'; END IF;
 IF NOT (public.is_trip_organizer(v_uid, v_decision.trip_id) OR public.has_role(v_uid, 'admin')) THEN
  RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
 END IF;
 IF btrim(v_decision.title) <> 'Waar verblijven we?' THEN RAISE EXCEPTION 'not_accommodation_decision'; END IF;
 SELECT * INTO v_trip FROM public.trip WHERE id = v_decision.trip_id;
 IF v_trip.status = 'archived' THEN RAISE EXCEPTION 'trip_archived'; END IF;
 SELECT * INTO v_option FROM public.decision_options WHERE id = p_option_id AND decision_id = v_decision.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'option_not_found'; END IF;
 SELECT id INTO v_item_id FROM public.trip_items
 WHERE trip_id = v_decision.trip_id AND type = 'stay' AND metadata->>'decision_id' = v_decision.id::text
 ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF v_decision.status = 'closed' AND v_item_id IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM public.trip_items WHERE id = v_item_id AND metadata->>'selected_option_id' = v_option.id::text) THEN RETURN v_item_id; END IF;
  RAISE EXCEPTION 'decision_already_final';
 END IF;
 v_url := substring(coalesce(v_option.description, '') FROM '(https?://[^[:space:]]+)');
 v_tz := coalesce(nullif(v_trip.timezone, ''), 'Europe/Amsterdam');
 IF v_item_id IS NULL THEN
  INSERT INTO public.trip_items (trip_id, type, title, status, start_at, end_at, timezone, booking_url, notes, metadata, created_by)
  VALUES (v_decision.trip_id, 'stay', v_option.label, 'planned',
   (v_trip.start_date + time '15:00') AT TIME ZONE v_tz, (v_trip.end_date + time '11:00') AT TIME ZONE v_tz,
   v_tz, v_url, v_option.description, jsonb_build_object('decision_id', v_decision.id, 'selected_option_id', v_option.id), v_uid)
  RETURNING id INTO v_item_id;
 ELSE
  UPDATE public.trip_items SET title = v_option.label, status = 'planned', booking_url = v_url, notes = v_option.description,
   metadata = metadata || jsonb_build_object('selected_option_id', v_option.id)
  WHERE id = v_item_id AND trip_id = v_decision.trip_id;
 END IF;
 UPDATE public.decisions SET status = 'closed' WHERE id = v_decision.id AND trip_id = v_decision.trip_id;
 RETURN v_item_id;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_accommodation_choice(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_accommodation_choice(uuid, uuid) TO authenticated;