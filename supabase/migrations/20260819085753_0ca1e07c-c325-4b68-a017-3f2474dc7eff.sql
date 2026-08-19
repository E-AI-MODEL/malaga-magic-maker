CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'vakansie_pro',
  price_id text NOT NULL,
  stripe_customer_id text,
  stripe_session_id text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  environment text NOT NULL DEFAULT 'sandbox',
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_environment_check CHECK (environment IN ('sandbox','live')),
  CONSTRAINT entitlements_session_unique UNIQUE (stripe_session_id)
);

CREATE INDEX idx_entitlements_user_env ON public.entitlements(user_id, environment);

GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlements"
  ON public.entitlements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_pro_access(_user_id uuid, _environment text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE user_id = _user_id
      AND environment = _environment
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.has_pro_access(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_pro_access(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid, text) TO service_role;