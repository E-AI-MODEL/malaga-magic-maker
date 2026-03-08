
-- POI Categories table
CREATE TABLE public.poi_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trip(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '📍',
  color_threshold_good integer NOT NULL DEFAULT 15,
  color_threshold_ok integer NOT NULL DEFAULT 25,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- POIs table
CREATE TABLE public.pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.poi_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  emoji text DEFAULT '📍',
  url text,
  description text,
  travel_times jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.poi_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can read poi_categories" ON public.poi_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read pois" ON public.pois FOR SELECT USING (true);

-- Admin CRUD
CREATE POLICY "Admin can insert poi_categories" ON public.poi_categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update poi_categories" ON public.poi_categories FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete poi_categories" ON public.poi_categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert pois" ON public.pois FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update pois" ON public.pois FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can delete pois" ON public.pois FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
