ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS party_type text;

CREATE TABLE public.trip_traveler_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  priorities text[] NOT NULL DEFAULT '{}',
  diet text[] NOT NULL DEFAULT '{}',
  allergies text,
  pace text,
  comfort text,
  budget_feel text,
  mobility text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_traveler_profiles TO authenticated;
GRANT ALL ON public.trip_traveler_profiles TO service_role;

ALTER TABLE public.trip_traveler_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can read traveler profiles"
ON public.trip_traveler_profiles FOR SELECT TO authenticated
USING (public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Members can insert their own traveler profile"
ON public.trip_traveler_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Members can update their own traveler profile"
ON public.trip_traveler_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.is_trip_member(auth.uid(), trip_id))
WITH CHECK (user_id = auth.uid() AND public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Members can delete their own traveler profile"
ON public.trip_traveler_profiles FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_trip_traveler_profiles_updated_at
BEFORE UPDATE ON public.trip_traveler_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trip_traveler_profiles_trip ON public.trip_traveler_profiles(trip_id);