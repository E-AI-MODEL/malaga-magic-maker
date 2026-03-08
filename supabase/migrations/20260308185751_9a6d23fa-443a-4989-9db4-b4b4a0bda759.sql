
-- Create storage bucket for accommodation images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('accommodation-images', 'accommodation-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

-- Allow authenticated users to upload to accommodation-images bucket
CREATE POLICY "Admin can upload accommodation images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'accommodation-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow anyone to read accommodation images
CREATE POLICY "Anyone can read accommodation images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'accommodation-images');

-- Allow admin to delete accommodation images
CREATE POLICY "Admin can delete accommodation images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'accommodation-images' AND public.has_role(auth.uid(), 'admin'));
