
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());
