-- BUILD 05 follow-up: atomic customer-facing decision operations.

CREATE OR REPLACE FUNCTION public.create_decision_with_options(
  p_trip_id uuid,
  p_title text,
  p_description text,
  p_options jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_decision_id uuid;
  v_option_count integer;
  v_invalid_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_trip_member(v_user_id, p_trip_id) THEN
    RAISE EXCEPTION 'not_trip_member' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR length(btrim(p_title)) = 0 THEN
    RAISE EXCEPTION 'decision_title_required' USING ERRCODE = '23514';
  END IF;
  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'decision_options_required' USING ERRCODE = '23514';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE length(btrim(o.label)) = 0)
  INTO v_option_count, v_invalid_count
  FROM jsonb_to_recordset(p_options) AS o(label text);

  IF v_option_count < 2 OR v_invalid_count > 0 THEN
    RAISE EXCEPTION 'decision_requires_two_valid_options' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.decisions (trip_id, title, description, created_by, max_choices)
  VALUES (p_trip_id, btrim(p_title), NULLIF(btrim(p_description), ''), v_user_id, 1)
  RETURNING id INTO v_decision_id;

  INSERT INTO public.decision_options (decision_id, label, description, sort_order)
  SELECT
    v_decision_id,
    btrim(o.label),
    NULLIF(btrim(o.description), ''),
    o.ordinality - 1
  FROM jsonb_to_recordset(p_options) WITH ORDINALITY AS o(label text, description text, ordinality bigint);

  RETURN v_decision_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_decision_vote(
  p_decision_id uuid,
  p_option_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_status text;
  v_vote_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT d.trip_id, d.status
  INTO v_trip_id, v_status
  FROM public.decisions d
  WHERE d.id = p_decision_id;

  IF v_trip_id IS NULL OR NOT public.is_trip_member(v_user_id, v_trip_id) THEN
    RAISE EXCEPTION 'decision_vote_forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'decision_closed' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.decision_options o
    WHERE o.id = p_option_id AND o.decision_id = p_decision_id
  ) THEN
    RAISE EXCEPTION 'invalid_decision_option' USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.decision_votes
  WHERE decision_id = p_decision_id AND user_id = v_user_id;

  INSERT INTO public.decision_votes (decision_id, option_id, user_id)
  VALUES (p_decision_id, p_option_id, v_user_id)
  RETURNING id INTO v_vote_id;

  RETURN v_vote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_decision_with_options(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_decision_vote(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_decision_with_options(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_decision_vote(uuid, uuid) TO authenticated;
