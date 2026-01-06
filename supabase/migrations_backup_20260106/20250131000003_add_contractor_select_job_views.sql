-- Add SELECT policy for contractors to view their own job views
CREATE POLICY "Contractors can view their own job views"
  ON public.job_views
  FOR SELECT
  USING (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

