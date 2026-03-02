
-- Table: app_settings
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin can update settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table: activity_log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  page TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all logs"
  ON public.activity_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add missing columns to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS require_pool BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_airco BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_wifi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_parking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_terrace BOOLEAN NOT NULL DEFAULT false;
