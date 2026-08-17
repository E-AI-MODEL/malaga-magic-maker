-- Malaga is intentionally admin-only. The original prototype participant accounts
-- have been removed; keep public account creation blocked at the database boundary.

CREATE OR REPLACE FUNCTION public.block_non_hans_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id <> '638d717f-4943-4993-9b79-b9a79f6f69ec'::uuid
     OR lower(coalesce(NEW.email, '')) <> 'admin@local.app' THEN
    RAISE EXCEPTION 'New accounts are disabled for this project';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.block_non_hans_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS block_non_hans_auth_user ON auth.users;
CREATE TRIGGER block_non_hans_auth_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.block_non_hans_auth_user();
