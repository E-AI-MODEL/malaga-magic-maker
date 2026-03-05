CREATE POLICY "Admin can insert submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));