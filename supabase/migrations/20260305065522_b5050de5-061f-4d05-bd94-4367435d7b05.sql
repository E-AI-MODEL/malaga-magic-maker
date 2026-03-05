
-- Add new columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS backup_to text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS voting_closed boolean NOT NULL DEFAULT true;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS info_text text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS info_image_urls text[] NOT NULL DEFAULT '{}';

-- Create travel_legs table
CREATE TABLE public.travel_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passengers text[] NOT NULL DEFAULT '{}',
  departure_time text,
  arrival_time text,
  travel_date date,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_legs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read travel_legs" ON public.travel_legs FOR SELECT USING (true);
CREATE POLICY "Admin can insert travel_legs" ON public.travel_legs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update travel_legs" ON public.travel_legs FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete travel_legs" ON public.travel_legs FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Enable realtime on travel_legs
ALTER PUBLICATION supabase_realtime ADD TABLE public.travel_legs;

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true);

-- Storage RLS: anyone can read, authenticated can upload
CREATE POLICY "Anyone can read task attachments" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');
CREATE POLICY "Authenticated can upload task attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own task attachments" ON storage.objects FOR DELETE USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update tasks RLS: allow owner/backup to update progress/info fields
CREATE POLICY "Task owner can update progress" ON public.tasks FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR
  assigned_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid()) OR
  backup_to = (SELECT display_name FROM public.profiles WHERE id = auth.uid())
);
