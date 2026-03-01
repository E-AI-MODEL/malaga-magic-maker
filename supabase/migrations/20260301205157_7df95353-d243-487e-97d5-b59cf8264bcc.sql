
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'participant');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Trip table (single record)
CREATE TABLE public.trip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL DEFAULT '2026-04-02',
  end_date DATE NOT NULL DEFAULT '2026-04-05',
  group_size INT NOT NULL DEFAULT 5,
  flights_note TEXT NOT NULL DEFAULT '3 man arriveert donderdag ochtend (Robin, Mark, Dimitri), 2 man donderdag middag (Edwin, Hans)',
  golf_min INT NOT NULL DEFAULT 2,
  golf_max INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip ENABLE ROW LEVEL SECURITY;

-- Submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  agreed_facts BOOLEAN NOT NULL DEFAULT false,
  preferred_rounds INT NOT NULL DEFAULT 2 CHECK (preferred_rounds IN (2, 3)),
  remarks_a TEXT,
  mobility_choice TEXT NOT NULL DEFAULT 'neutral' CHECK (mobility_choice IN ('car', 'transfers', 'neutral')),
  base_choice TEXT NOT NULL DEFAULT 'neutral' CHECK (base_choice IN ('golf', 'beach', 'neutral')),
  max_golf_minutes INT NOT NULL DEFAULT 20 CHECK (max_golf_minutes IN (10, 15, 20)),
  require_fixed_beds BOOLEAN NOT NULL DEFAULT false,
  require_bedrooms_3 BOOLEAN NOT NULL DEFAULT false,
  require_cancelable BOOLEAN NOT NULL DEFAULT false,
  require_transparent_price BOOLEAN NOT NULL DEFAULT false,
  budget_cap_total NUMERIC,
  remarks_b TEXT,
  points_golf_ease INT NOT NULL DEFAULT 0,
  points_beach_life INT NOT NULL DEFAULT 0,
  points_exploring INT NOT NULL DEFAULT 0,
  points_luxury INT NOT NULL DEFAULT 0,
  points_budget INT NOT NULL DEFAULT 0,
  points_low_hassle INT NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Accommodations table
CREATE TABLE public.accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'apartment' CHECK (type IN ('hotel', 'apartment', 'villa', 'townhouse', 'resort', 'house')),
  location_label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  listing_url TEXT,
  sources JSONB NOT NULL DEFAULT '[]',
  total_price_3_nights NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EUR',
  price_notes TEXT,
  bedrooms INT NOT NULL DEFAULT 1,
  bathrooms INT NOT NULL DEFAULT 1,
  fixed_beds_count INT NOT NULL DEFAULT 2,
  max_guests INT NOT NULL DEFAULT 2,
  cancellation_type TEXT NOT NULL DEFAULT 'unknown' CHECK (cancellation_type IN ('free', 'partial', 'nonref', 'unknown')),
  parking TEXT NOT NULL DEFAULT 'unknown' CHECK (parking IN ('yes', 'no', 'unknown')),
  golf_km NUMERIC,
  golf_minutes INT,
  beach_meters INT,
  agp_minutes INT,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'finalist')),
  eliminated_reason TEXT,
  transparent_price_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

-- Admin overrides log
CREATE TABLE public.admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_overrides ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: get profile username by user id
CREATE OR REPLACE FUNCTION public.get_username(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username FROM public.profiles WHERE id = _user_id
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON public.accommodations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  -- Auto-assign role from metadata
  IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participant');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- Profiles: everyone can read all profiles (small group, needed for display)
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: everyone can read (needed for UI role checks)
CREATE POLICY "Anyone can read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Trip: everyone can read
CREATE POLICY "Anyone can read trip" ON public.trip FOR SELECT TO authenticated USING (true);

-- Submissions
CREATE POLICY "Users can read own submission" ON public.submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own submission" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own unlocked submission" ON public.submissions FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND locked = false)
    OR public.has_role(auth.uid(), 'admin')
  );

-- Accommodations: everyone reads, admin writes
CREATE POLICY "Anyone can read accommodations" ON public.accommodations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert accommodations" ON public.accommodations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update accommodations" ON public.accommodations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete accommodations" ON public.accommodations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin overrides: admin only
CREATE POLICY "Admin can read overrides" ON public.admin_overrides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert overrides" ON public.admin_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert the trip record
INSERT INTO public.trip (start_date, end_date, group_size, flights_note, golf_min, golf_max)
VALUES ('2026-04-02', '2026-04-05', 5, '3 man arriveert donderdag ochtend (Robin, Mark, Dimitri), 2 man donderdag middag (Edwin, Hans)', 2, 3);
