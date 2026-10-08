CREATE TABLE public.payment_details (
  user_id uuid PRIMARY KEY,
  iban text,
  account_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_details TO authenticated;
GRANT ALL ON public.payment_details TO service_role;

ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage only their own payment details"
  ON public.payment_details
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.ops_delete_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_actor uuid := auth.uid(); v_email text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'platform_admin_required' USING ERRCODE='42501'; END IF;
  IF p_user_id = v_actor THEN RAISE EXCEPTION 'cannot_delete_self' USING ERRCODE='23514'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE='P0002'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'cannot_delete_platform_admin' USING ERRCODE='42501';
  END IF;

  DELETE FROM public.trip_members WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = p_user_id;
  DELETE FROM public.decision_votes WHERE user_id = p_user_id;
  DELETE FROM public.expense_splits WHERE user_id = p_user_id;
  DELETE FROM public.entitlements WHERE user_id = p_user_id;
  DELETE FROM public.ai_usage_events WHERE user_id = p_user_id;
  DELETE FROM public.activity_log WHERE user_id = p_user_id;
  DELETE FROM public.client_error_events WHERE user_id = p_user_id;
  DELETE FROM public.trip_invite_uses WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.payment_details WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.admin_audit_log(actor_user_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'user.deleted', 'user', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN true;
END $function$;
