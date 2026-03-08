
-- =============================================
-- FASE 1.1: Extend trip table with workspace fields
-- =============================================
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Malaga 2026';
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planning';
ALTER TABLE public.trip ADD COLUMN IF NOT EXISTS invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- =============================================
-- FASE 1.2: Create trip_members table
-- =============================================
CREATE TABLE IF NOT EXISTS public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- trip_members RLS: members can read their own trip memberships
CREATE POLICY "Members can read own memberships" ON public.trip_members
  FOR SELECT USING (user_id = auth.uid());

-- organizers can manage members
CREATE POLICY "Organizers can manage members" ON public.trip_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_members.trip_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'organizer'
    )
  );

-- anyone authenticated can insert themselves (for joining via invite code)
CREATE POLICY "Users can join trips" ON public.trip_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- FASE 1.3: Add trip_id to existing tables
-- =============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.travel_legs ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);
ALTER TABLE public.accommodations ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trip(id);

-- =============================================
-- FASE 1.5: Update RLS - allow trip read for members
-- =============================================
-- Update trip table: members can read their trips
DROP POLICY IF EXISTS "Anyone can read trip" ON public.trip;
CREATE POLICY "Members can read their trips" ON public.trip
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip.id AND user_id = auth.uid())
  );

-- Allow organizers to update their trips
CREATE POLICY "Organizers can update trips" ON public.trip
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip.id AND user_id = auth.uid() AND role = 'organizer')
  );

-- Allow authenticated users to create trips
CREATE POLICY "Users can create trips" ON public.trip
  FOR INSERT WITH CHECK (true);
