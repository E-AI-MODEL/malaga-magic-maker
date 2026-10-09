-- "Aan de slag" checklist: users may read their own Hansie usage count.
-- Writes stay behind the service role / security-definer quota functions.
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;

CREATE POLICY "ai_usage_owner_select"
  ON public.ai_usage_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());