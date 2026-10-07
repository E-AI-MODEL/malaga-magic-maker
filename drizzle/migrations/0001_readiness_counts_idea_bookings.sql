DO $$
DECLARE v_def text := pg_get_functiondef('public.get_trip_readiness'::regproc);
BEGIN
  IF position('i.status=''planned''' in v_def) > 0 THEN
    EXECUTE replace(v_def, 'i.status=''planned''', 'i.status IN (''idea'',''planned'')');
  END IF;
END $$;