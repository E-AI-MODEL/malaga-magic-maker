CREATE OR REPLACE FUNCTION public.choose_trip_idea(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.trip_items%ROWTYPE;
  v_trip public.trip%ROWTYPE;
  v_tz text;
  v_removed jsonb := '[]'::jsonb;
  v_decision_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_item FROM public.trip_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
  IF NOT (public.is_trip_organizer(v_uid, v_item.trip_id) OR public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF v_item.status <> 'idea' THEN RAISE EXCEPTION 'not_an_idea'; END IF;
  SELECT * INTO v_trip FROM public.trip WHERE id = v_item.trip_id;
  IF v_trip.status = 'archived' THEN RAISE EXCEPTION 'trip_archived'; END IF;
  v_tz := coalesce(nullif(v_item.timezone, ''), nullif(v_trip.timezone, ''), 'Europe/Amsterdam');

  IF v_item.type = 'stay' AND v_trip.start_date IS NOT NULL AND v_trip.end_date IS NOT NULL THEN
    UPDATE public.trip_items SET status = 'planned',
      start_at = (v_trip.start_date + time '15:00') AT TIME ZONE v_tz,
      end_at = (v_trip.end_date + time '11:00') AT TIME ZONE v_tz
    WHERE id = v_item.id;
  ELSE
    UPDATE public.trip_items SET status = 'planned' WHERE id = v_item.id;
  END IF;

  IF v_item.type = 'stay' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_removed
    FROM public.trip_items t
    WHERE t.trip_id = v_item.trip_id AND t.type = 'stay' AND t.status = 'idea' AND t.id <> v_item.id;
    DELETE FROM public.trip_items t
    WHERE t.trip_id = v_item.trip_id AND t.type = 'stay' AND t.status = 'idea' AND t.id <> v_item.id
      AND NOT EXISTS (SELECT 1 FROM public.trip_documents d WHERE d.trip_item_id = t.id);
    SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_removed
    FROM jsonb_array_elements(v_removed) r
    WHERE NOT EXISTS (SELECT 1 FROM public.trip_items x WHERE x.id = (r->>'id')::uuid);

    SELECT id INTO v_decision_id FROM public.decisions
    WHERE trip_id = v_item.trip_id AND status = 'open' AND btrim(title) = 'Waar verblijven we?'
    ORDER BY created_at LIMIT 1;
    IF v_decision_id IS NOT NULL THEN
      UPDATE public.decisions SET status = 'closed' WHERE id = v_decision_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'item', jsonb_build_object('id', v_item.id, 'status', v_item.status, 'start_at', v_item.start_at, 'end_at', v_item.end_at),
    'removed', v_removed,
    'closed_decision_id', v_decision_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_trip_idea_choice(p_trip_id uuid, p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item_id uuid := (p_payload->'item'->>'id')::uuid;
  v_item public.trip_items%ROWTYPE;
  v_decision_id uuid := nullif(p_payload->>'closed_decision_id', '')::uuid;
  r jsonb;
  v_row public.trip_items%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT (public.is_trip_organizer(v_uid, p_trip_id) OR public.has_role(v_uid, 'admin')) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_item FROM public.trip_items WHERE id = v_item_id AND trip_id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
  IF v_item.status <> 'planned' OR v_item.updated_at < now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'undo_expired';
  END IF;

  UPDATE public.trip_items SET status = 'idea',
    start_at = nullif(p_payload->'item'->>'start_at', '')::timestamptz,
    end_at = nullif(p_payload->'item'->>'end_at', '')::timestamptz
  WHERE id = v_item.id;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_payload->'removed', '[]'::jsonb)) LOOP
    v_row := jsonb_populate_record(NULL::public.trip_items, r);
    IF v_row.trip_id IS DISTINCT FROM p_trip_id OR v_row.type <> 'stay' OR v_row.status <> 'idea' THEN CONTINUE; END IF;
    IF v_row.created_by IS NOT NULL AND NOT public.is_trip_member(v_row.created_by, p_trip_id) THEN
      v_row.created_by := NULL;
    END IF;
    INSERT INTO public.trip_items SELECT v_row.* ON CONFLICT (id) DO NOTHING;
  END LOOP;

  IF v_decision_id IS NOT NULL THEN
    UPDATE public.decisions SET status = 'open'
    WHERE id = v_decision_id AND trip_id = p_trip_id AND status = 'closed';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.choose_trip_idea(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_trip_idea_choice(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_trip_idea(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_trip_idea_choice(uuid, jsonb) TO authenticated;