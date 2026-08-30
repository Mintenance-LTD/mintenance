DROP POLICY IF EXISTS "Reviewers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;

CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND created_at > (now() - interval '7 days')
  )
  WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;;
