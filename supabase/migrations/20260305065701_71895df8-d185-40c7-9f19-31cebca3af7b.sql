
-- Drop the old restrictive admin-only update policy since the new one already includes admin check
DROP POLICY IF EXISTS "Admin can update tasks" ON public.tasks;
