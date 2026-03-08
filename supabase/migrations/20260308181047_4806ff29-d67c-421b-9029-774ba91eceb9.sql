
-- Create a security definer function to check if user is organizer of a trip
CREATE OR REPLACE FUNCTION public.is_trip_organizer(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id AND role = 'organizer'
  )
$$;

-- Create a security definer function to check if user is member of a trip
CREATE OR REPLACE FUNCTION public.is_trip_member(_user_id uuid, _trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id
  )
$$;

-- Fix trip_members policies: drop recursive ones, recreate with security definer functions
DROP POLICY IF EXISTS "Organizers can manage members" ON public.trip_members;
DROP POLICY IF EXISTS "Members can read own memberships" ON public.trip_members;

-- Members can read their own memberships (simple, no recursion)
CREATE POLICY "Members can read own memberships" ON public.trip_members
FOR SELECT USING (user_id = auth.uid());

-- Organizers can update members (uses security definer function)
CREATE POLICY "Organizers can update members" ON public.trip_members
FOR UPDATE USING (public.is_trip_organizer(auth.uid(), trip_id));

-- Organizers can delete members (uses security definer function)
CREATE POLICY "Organizers can delete members" ON public.trip_members
FOR DELETE USING (public.is_trip_organizer(auth.uid(), trip_id));

-- Fix trip table SELECT policy to use security definer function
DROP POLICY IF EXISTS "Members can read their trips" ON public.trip;
CREATE POLICY "Members can read their trips" ON public.trip
FOR SELECT USING (public.is_trip_member(auth.uid(), id));

-- Fix trip table UPDATE policy to use security definer function
DROP POLICY IF EXISTS "Organizers can update trips" ON public.trip;
CREATE POLICY "Organizers can update trips" ON public.trip
FOR UPDATE USING (public.is_trip_organizer(auth.uid(), id));
