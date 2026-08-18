-- BUILD 12 live foundation: minimal observability and production hardening.
-- This file restores source control for migration version 20260818130000,
-- which is already applied in production.

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  feature text NOT NULL DEFAULT 'hansie' CHECK (feature = 'hansie'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_trip_created_idx
ON public.ai_usage_events(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_feature_created_idx
ON public.ai_usage_events(user_id, feature, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_events FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.client_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trip(id) ON DELETE CASCADE,
  area text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_error_events_created_idx
ON public.client_error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS client_error_events_user_created_idx
ON public.client_error_events(user_id, created_at DESC);

ALTER TABLE public.client_error_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_error_events FROM anon, authenticated;
GRANT SELECT ON public.client_error_events TO authenticated;

DROP POLICY IF EXISTS "Platform admins can read client errors" ON public.client_error_events;
CREATE POLICY "Platform admins can read client errors"
ON public.client_error_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.record_client_error(
  p_area text,
  p_message text,
  p_trip_id uuid DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_recent integer;
  v_area text;
  v_message text;
  v_context jsonb := COALESCE(p_context,'{}'::jsonb);
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  IF p_trip_id IS NOT NULL AND NOT (
    public.is_trip_member(v_user_id,p_trip_id)
    OR public.has_role(v_user_id,'admin'::public.app_role)
  ) THEN RETURN false; END IF;

  v_area := left(regexp_replace(COALESCE(p_area,'client'),'[\r\n\t]+',' ','g'),80);
  v_message := left(regexp_replace(COALESCE(p_message,'Unknown client error'),'[\r\n\t]+',' ','g'),500);
  IF octet_length(v_context::text) > 4096 THEN
    v_context := jsonb_build_object('truncated',true);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text||':client-errors'));
  SELECT count(*) INTO v_recent
  FROM public.client_error_events
  WHERE user_id=v_user_id AND created_at>now()-interval '1 hour';
  IF v_recent>=20 THEN RETURN false; END IF;

  INSERT INTO public.client_error_events(user_id,trip_id,area,message,context)
  VALUES(v_user_id,p_trip_id,v_area,v_message,v_context);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_client_error(text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_client_error(text,text,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.ops_get_system_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid:=auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.has_role(v_user_id,'admin'::public.app_role) THEN
    RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'users',(SELECT count(*) FROM auth.users),
    'trips',(SELECT count(*) FROM public.trip),
    'active_trips',(SELECT count(*) FROM public.trip WHERE status IN('planning','active')),
    'archived_trips',(SELECT count(*) FROM public.trip WHERE status='archived'),
    'trip_items',(SELECT count(*) FROM public.trip_items),
    'open_tasks',(SELECT count(*) FROM public.tasks WHERE status<>'done' AND COALESCE(progress,0)<100),
    'ready_documents',(SELECT count(*) FROM public.trip_documents WHERE status='ready'),
    'active_invites',(SELECT count(*) FROM public.trip_invites WHERE revoked_at IS NULL AND expires_at>now() AND use_count<max_uses),
    'hansie_requests_24h',(SELECT count(*) FROM public.ai_usage_events WHERE created_at>now()-interval '24 hours'),
    'client_errors_24h',(SELECT count(*) FROM public.client_error_events WHERE created_at>now()-interval '24 hours'),
    'generated_at',now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_get_system_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_get_system_summary() TO authenticated;
