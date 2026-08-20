DROP POLICY IF EXISTS "Internal admins can read trip document objects" ON storage.objects;
CREATE POLICY "Internal admins can read trip document objects"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'trip-documents' AND public.has_role(auth.uid(), 'admin'));