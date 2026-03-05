
-- Add cost_split_among to tasks (null = everyone shares)
ALTER TABLE public.tasks ADD COLUMN cost_split_among text[] DEFAULT NULL;

-- Create expenses table for user-added expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  paid_by text NOT NULL,
  split_among text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Everyone can read expenses
CREATE POLICY "Anyone can read expenses" ON public.expenses
FOR SELECT TO authenticated USING (true);

-- Users can insert own expenses
CREATE POLICY "Users can insert own expenses" ON public.expenses
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Users can delete own expenses
CREATE POLICY "Users can delete own expenses" ON public.expenses
FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Users can update own expenses
CREATE POLICY "Users can update own expenses" ON public.expenses
FOR UPDATE TO authenticated USING (created_by = auth.uid());
