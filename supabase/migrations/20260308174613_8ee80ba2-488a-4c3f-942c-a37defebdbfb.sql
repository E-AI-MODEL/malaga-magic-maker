
-- Fix permissive INSERT policy on trip - restrict to authenticated users only
DROP POLICY IF EXISTS "Users can create trips" ON public.trip;
CREATE POLICY "Authenticated can create trips" ON public.trip
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
