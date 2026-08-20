DROP TRIGGER IF EXISTS block_non_hans_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.block_non_hans_auth_user();

DROP POLICY IF EXISTS "Internal admins can delete trip document objects" ON storage.objects;
CREATE POLICY "Internal admins can delete trip document objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trip-documents' AND public.has_role(auth.uid(), 'admin'));