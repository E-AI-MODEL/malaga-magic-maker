
-- Drop and recreate the SELECT policy on trip_members
-- Members should be able to see all members of trips they belong to
DROP POLICY IF EXISTS "Members can read own memberships" ON public.trip_members;

CREATE POLICY "Members can read trip memberships" ON public.trip_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR public.is_trip_member(auth.uid(), trip_id)
);
