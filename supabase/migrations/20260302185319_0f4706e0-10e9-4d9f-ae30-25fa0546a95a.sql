
-- Add new intake fields to submissions
ALTER TABLE public.submissions 
  ADD COLUMN top_accommodations uuid[] DEFAULT '{}',
  ADD COLUMN diet_preferences text[] DEFAULT '{}',
  ADD COLUMN diet_remarks text,
  ADD COLUMN activities text[] DEFAULT '{}';
