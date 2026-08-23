CREATE OR REPLACE FUNCTION public.create_decision_with_options(p_trip_id uuid, p_title text, p_description text, p_options jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_decision_id uuid;
  v_option_count integer;
  v_invalid_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_trip_member(v_user_id, p_trip_id) THEN RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501'; END IF;
  IF p_title IS NULL OR length(btrim(p_title))=0 THEN RAISE EXCEPTION 'decision_title_required' USING ERRCODE='23514'; END IF;
  IF p_options IS NULL OR jsonb_typeof(p_options)<>'array' THEN RAISE EXCEPTION 'decision_options_required' USING ERRCODE='23514'; END IF;

  SELECT count(*), count(*) FILTER (WHERE length(btrim(o.label))=0)
    INTO v_option_count, v_invalid_count
    FROM jsonb_to_recordset(p_options) o(label text);

  IF v_option_count < 2 OR v_invalid_count > 0 THEN RAISE EXCEPTION 'decision_requires_two_valid_options' USING ERRCODE='23514'; END IF;

  INSERT INTO public.decisions(trip_id,title,description,created_by,max_choices)
  VALUES(p_trip_id, btrim(p_title), NULLIF(btrim(p_description),''), v_user_id, 1)
  RETURNING id INTO v_decision_id;

  INSERT INTO public.decision_options(decision_id,label,description,sort_order)
  SELECT v_decision_id,
         btrim(o.label),
         NULLIF(btrim(o.description),''),
         (o.idx - 1)::int
  FROM (
    SELECT elem, row_number() OVER () AS idx
    FROM jsonb_array_elements(p_options) AS elem
  ) src
  CROSS JOIN LATERAL jsonb_to_record(src.elem) AS o(label text, description text)
  ORDER BY src.idx;

  RETURN v_decision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_decision_with_options(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_decision_with_options(uuid, text, text, jsonb) TO authenticated;