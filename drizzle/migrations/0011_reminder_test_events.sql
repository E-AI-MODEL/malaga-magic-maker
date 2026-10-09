CREATE TABLE public.reminder_test_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reminder_test_events_user_time ON public.reminder_test_events (user_id, created_at DESC);
GRANT ALL ON public.reminder_test_events TO service_role;
ALTER TABLE public.reminder_test_events ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.reminder_test_events IS 'Rate limit for test reminders; written only by the reminder-test function (service role).';