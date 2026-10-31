-- Rate limit for bonnetje scans by visitors without an account. Only a salted hash of the network address is kept, for at most two days.
CREATE TABLE public.guest_receipt_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_receipt_events TO service_role;
ALTER TABLE public.guest_receipt_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX guest_receipt_events_hash_time ON public.guest_receipt_events (ip_hash, created_at);

CREATE OR REPLACE FUNCTION public.consume_guest_receipt_quota(p_ip_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mine integer;
  v_all integer;
BEGIN
  IF p_ip_hash IS NULL OR length(p_ip_hash) < 32 THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('guest_receipt_quota'));
  DELETE FROM public.guest_receipt_events WHERE created_at < now() - interval '2 days';
  SELECT count(*) INTO v_mine FROM public.guest_receipt_events WHERE ip_hash = p_ip_hash AND created_at > now() - interval '1 day';
  SELECT count(*) INTO v_all FROM public.guest_receipt_events WHERE created_at > now() - interval '1 day';
  IF v_mine >= 10 OR v_all >= 1000 THEN
    RETURN false;
  END IF;
  INSERT INTO public.guest_receipt_events (ip_hash) VALUES (p_ip_hash);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_guest_receipt_quota(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_guest_receipt_quota(text) TO service_role;