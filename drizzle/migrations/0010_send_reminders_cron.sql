-- lovable-cron-fallback-reviewed: time-based reminders (08:00 local, 24h before check-in) across time zones; 15-minute cadence set by the product owner
-- Idempotent schedule for send-reminders. URL and secret live per environment in public.server_job_secrets
-- (rows 'send_reminders_url' and 'send_reminders'); without them the job sends nothing.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule('send-reminders-every-15-min', '*/15 * * * *', $job$
  SELECT net.http_post(
    url := (SELECT secret FROM public.server_job_secrets WHERE name = 'send_reminders_url'),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (SELECT secret FROM public.server_job_secrets WHERE name = 'send_reminders')),
    body := '{}'::jsonb)
  WHERE EXISTS (SELECT 1 FROM public.server_job_secrets WHERE name = 'send_reminders_url')
$job$);