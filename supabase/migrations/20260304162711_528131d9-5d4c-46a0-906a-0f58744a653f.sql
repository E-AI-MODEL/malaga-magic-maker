
-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  section text NOT NULL,
  assigned_to text,
  status text NOT NULL DEFAULT 'open',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Admin can insert tasks" ON public.tasks FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update tasks" ON public.tasks FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete tasks" ON public.tasks FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Task votes table
CREATE TABLE public.task_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  voted_for_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE public.task_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read votes" ON public.task_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own vote" ON public.task_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own vote" ON public.task_votes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own vote" ON public.task_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reactions table
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section, emoji)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reactions" ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own reaction" ON public.reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own reaction" ON public.reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comment" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Seed tasks
INSERT INTO public.tasks (title, section, sort_order) VALUES
  ('Autohuur of taxi regelen', 'transport', 1),
  ('Accommodatie boeken', 'accommodatie', 2),
  ('Flights boeken', 'flights', 3),
  ('Lounge tent aan het strand reserveren', 'strand', 4);
