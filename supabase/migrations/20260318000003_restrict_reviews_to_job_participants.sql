-- Migration: Restrict reviews INSERT/UPDATE to job participants only
-- Previous policy only checked reviewer_id = auth.uid(), allowing any authenticated user
-- to insert a fake review for any job. This fix adds a job participation check.

-- Drop the weak insert policy
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;

-- New INSERT policy: reviewer must be homeowner or contractor on a completed job
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = reviews.job_id
        AND (j.homeowner_id = auth.uid() OR j.contractor_id = auth.uid())
        AND j.status = 'completed'
    )
  );

-- New UPDATE policy: reviewer can only edit their own review
CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING    (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());
