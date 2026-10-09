ALTER TABLE public.trip
  ADD COLUMN destination_latitude numeric,
  ADD COLUMN destination_longitude numeric,
  ADD COLUMN destination_geocoded_for text;

CREATE TABLE public.trip_weather_cache (
  trip_id uuid PRIMARY KEY REFERENCES public.trip(id) ON DELETE CASCADE,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_modified text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.trip_weather_cache TO authenticated;
GRANT ALL ON public.trip_weather_cache TO service_role;
ALTER TABLE public.trip_weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read trip weather" ON public.trip_weather_cache
  FOR SELECT TO authenticated USING (public.is_trip_member(auth.uid(), trip_id));