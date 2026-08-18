-- BUILD 07: allow the authenticated uploader to resolve their own reserved
-- pending metadata row. This is required by the private storage INSERT policy.
-- Other trip members still see documents only after finalization.

DROP POLICY IF EXISTS "Trip members can read ready documents" ON public.trip_documents;
DROP POLICY IF EXISTS "Trip members read ready or own pending documents" ON public.trip_documents;

CREATE POLICY "Trip members read ready or own pending documents"
ON public.trip_documents
FOR SELECT
TO authenticated
USING (
  (
    status = 'ready'
    AND (
      public.is_trip_member(auth.uid(), trip_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
  OR (
    status = 'pending'
    AND uploaded_by = auth.uid()
    AND public.is_trip_member(auth.uid(), trip_id)
  )
);
