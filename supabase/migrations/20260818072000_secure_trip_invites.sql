-- BUILD 06: secure, revocable trip invitations.
-- Raw invitation tokens are returned once and never stored. Only SHA-256 hashes
-- are persisted. Client code can never choose the membership role.

CREATE TABLE IF NOT EXISTS public.trip_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  email_normalized text,
  role text NOT NULL DEFAULT 'member' CHECK (role = 'member'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0 AND max_uses <= 50),
  use_count integer NOT NULL DEFAULT 0 CHECK (use_count >= 0 AND use_count <= max_uses),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_invite_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.trip_invites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, user_id)
);

CREATE INDEX IF NOT EXISTS trip_invites_trip_id_idx ON public.trip_invites (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trip_invites_active_idx ON public.trip_invites (trip_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS trip_invite_uses_invite_id_idx ON public.trip_invite_uses (invite_id);
CREATE INDEX IF NOT EXISTS trip_invite_uses_user_id_idx ON public.trip_invite_uses (user_id);

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invite_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip organizers can read invite metadata" ON public.trip_invites;
CREATE POLICY "Trip organizers can read invite metadata"
ON public.trip_invites
FOR SELECT
TO authenticated
USING (
  public.is_trip_organizer(auth.uid(), trip_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Users and organizers can read invite uses" ON public.trip_invite_uses;
CREATE POLICY "Users and organizers can read invite uses"
ON public.trip_invite_uses
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.trip_invites i
    WHERE i.id = invite_id
      AND (
        public.is_trip_organizer(auth.uid(), i.trip_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

REVOKE ALL ON public.trip_invites FROM anon, authenticated;
REVOKE ALL ON public.trip_invite_uses FROM anon, authenticated;
GRANT SELECT ON public.trip_invites TO authenticated;
GRANT SELECT ON public.trip_invite_uses TO authenticated;

CREATE OR REPLACE FUNCTION public.create_trip_invite(
  p_trip_id uuid,
  p_email text DEFAULT NULL,
  p_expires_hours integer DEFAULT 168,
  p_max_uses integer DEFAULT 1
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_token text;
  v_hash text;
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_trip_organizer(v_user_id, p_trip_id)
    OR public.has_role(v_user_id, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'invite_create_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_expires_hours IS NULL OR p_expires_hours < 1 OR p_expires_hours > 720 THEN
    RAISE EXCEPTION 'invalid_invite_expiry' USING ERRCODE = '23514';
  END IF;

  IF p_max_uses IS NULL OR p_max_uses < 1 OR p_max_uses > 50 THEN
    RAISE EXCEPTION 'invalid_invite_max_uses' USING ERRCODE = '23514';
  END IF;

  v_email := NULLIF(lower(btrim(p_email)), '');
  IF v_email IS NOT NULL AND p_max_uses <> 1 THEN
    RAISE EXCEPTION 'email_invite_must_be_single_use' USING ERRCODE = '23514';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.trip_invites (
    trip_id,
    token_hash,
    email_normalized,
    role,
    created_by,
    expires_at,
    max_uses
  ) VALUES (
    p_trip_id,
    v_hash,
    v_email,
    'member',
    v_user_id,
    now() + make_interval(hours => p_expires_hours),
    p_max_uses
  );

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trip_invite_preview(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash text;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT jsonb_build_object(
    'valid', true,
    'trip_name', t.name,
    'destination_name', t.destination_name,
    'start_date', t.start_date,
    'end_date', t.end_date,
    'email_restricted', i.email_normalized IS NOT NULL
  )
  INTO v_result
  FROM public.trip_invites i
  JOIN public.trip t ON t.id = i.trip_id
  WHERE i.token_hash = v_hash
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
    AND i.use_count < i.max_uses;

  RETURN COALESCE(v_result, jsonb_build_object('valid', false));
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_trip_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_hash text;
  v_invite public.trip_invites%ROWTYPE;
  v_inserted_use integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'invalid_invite' USING ERRCODE = '23514';
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_invite
  FROM public.trip_invites
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite' USING ERRCODE = '23514';
  END IF;

  -- An already accepted invitation remains idempotent even if it later expires,
  -- is revoked or reaches its use limit.
  IF EXISTS (
    SELECT 1
    FROM public.trip_invite_uses u
    WHERE u.invite_id = v_invite.id AND u.user_id = v_user_id
  ) THEN
    RETURN v_invite.trip_id;
  END IF;

  -- Existing trip members do not consume another invite use.
  IF public.is_trip_member(v_user_id, v_invite.trip_id) THEN
    RETURN v_invite.trip_id;
  END IF;

  IF v_invite.revoked_at IS NOT NULL
     OR v_invite.expires_at <= now()
     OR v_invite.use_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'invite_unavailable' USING ERRCODE = '23514';
  END IF;

  IF v_invite.email_normalized IS NOT NULL THEN
    SELECT lower(email) INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS DISTINCT FROM v_invite.email_normalized THEN
      RAISE EXCEPTION 'invite_email_mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_invite.trip_id, v_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  INSERT INTO public.trip_invite_uses (invite_id, user_id)
  VALUES (v_invite.id, v_user_id)
  ON CONFLICT (invite_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_use = ROW_COUNT;

  IF v_inserted_use = 1 THEN
    UPDATE public.trip_invites
    SET use_count = use_count + 1
    WHERE id = v_invite.id;
  END IF;

  RETURN v_invite.trip_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_trip_invite(p_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT trip_id INTO v_trip_id
  FROM public.trip_invites
  WHERE id = p_invite_id;

  IF v_trip_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (
    public.is_trip_organizer(v_user_id, v_trip_id)
    OR public.has_role(v_user_id, 'admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'invite_revoke_forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.trip_invites
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE id = p_invite_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_trip_invite(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_trip_invite_preview(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_trip_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_trip_invite(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_trip_invite(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trip_invite_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trip_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_trip_invite(uuid) TO authenticated;
