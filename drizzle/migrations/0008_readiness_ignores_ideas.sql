CREATE OR REPLACE FUNCTION public.get_trip_readiness(p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid:=auth.uid();
  v_trip public.trip%ROWTYPE;
  v_missing_dates integer;
  v_missing_destination integer;
  v_open_tasks integer;
  v_open_decisions integer;
  v_unconfirmed_bookings integer;
  v_item_count integer;
  v_document_count integer;
  v_member_count integer;
  v_attention integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT(public.is_trip_member(v_user_id,p_trip_id) OR public.has_role(v_user_id,'admin'::public.app_role)) THEN RAISE EXCEPTION 'not_trip_member' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_trip FROM public.trip WHERE id=p_trip_id;
  IF v_trip.id IS NULL THEN RAISE EXCEPTION 'trip_not_found' USING ERRCODE='P0002'; END IF;
  v_missing_dates:=CASE WHEN v_trip.start_date IS NULL OR v_trip.end_date IS NULL THEN 1 ELSE 0 END;
  v_missing_destination:=CASE WHEN NULLIF(btrim(v_trip.destination_name),'') IS NULL THEN 1 ELSE 0 END;
  SELECT count(*) INTO v_open_tasks FROM public.tasks t WHERE t.trip_id=p_trip_id AND t.status<>'done' AND COALESCE(t.progress,0)<100;
  SELECT count(*) INTO v_open_decisions FROM public.decisions d WHERE d.trip_id=p_trip_id AND d.status='open';
  -- Ideas are never bookings: only 'planned' counts as not yet confirmed.
  SELECT count(*) INTO v_unconfirmed_bookings FROM public.trip_items i WHERE i.trip_id=p_trip_id AND i.type IN('flight','train','ferry','stay','rental_car','transfer','ticket') AND i.status = 'planned';
  SELECT count(*) INTO v_item_count FROM public.trip_items i WHERE i.trip_id=p_trip_id AND i.status NOT IN ('idea','cancelled');
  SELECT count(*) INTO v_document_count FROM public.trip_documents d WHERE d.trip_id=p_trip_id AND d.status='ready';
  SELECT count(*) INTO v_member_count FROM public.trip_members m WHERE m.trip_id=p_trip_id;
  v_attention:=v_missing_dates+v_missing_destination+v_open_tasks+v_open_decisions+v_unconfirmed_bookings;
  RETURN jsonb_build_object(
    'status',CASE WHEN v_attention=0 THEN 'ready' ELSE 'attention' END,
    'attention_count',v_attention,
    'checks',jsonb_build_array(
      jsonb_build_object('key','dates','attention_count',v_missing_dates),
      jsonb_build_object('key','destination','attention_count',v_missing_destination),
      jsonb_build_object('key','tasks','attention_count',v_open_tasks),
      jsonb_build_object('key','decisions','attention_count',v_open_decisions),
      jsonb_build_object('key','bookings','attention_count',v_unconfirmed_bookings)
    ),
    'facts',jsonb_build_object('trip_item_count',v_item_count,'document_count',v_document_count,'member_count',v_member_count)
  );
END;
$function$;