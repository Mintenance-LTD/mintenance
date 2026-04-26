-- Audit fix (2026-04-26): public review reads must not expose pending or
-- blocked contractor replies through direct Supabase access.
--
-- The API already masks reviews.response until response_published_at, but
-- previous base-table SELECT policies still allowed anonymous clients to read
-- the raw row. PostgreSQL RLS cannot mask individual columns, so this policy
-- hides review rows that contain an unpublished reply from non-participants.

BEGIN;

DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS reviews_select_policy ON public.reviews;
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;

CREATE POLICY reviews_public_read_published_replies
  ON public.reviews
  FOR SELECT
  TO public
  USING (
    response IS NULL
    OR response_published_at <= NOW()
    OR (
      auth.uid() IS NOT NULL
      AND (
        reviewer_id = auth.uid()
        OR reviewee_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.jobs j
          WHERE j.id = reviews.job_id
            AND (
              j.homeowner_id = auth.uid()
              OR j.contractor_id = auth.uid()
            )
        )
      )
    )
  );

COMMENT ON POLICY reviews_public_read_published_replies ON public.reviews IS
  'Public users can read reviews with no contractor reply, or with a '
  'published reply. Rows with pending/blocked replies are visible only to '
  'the reviewer, reviewee, or job participants; server APIs continue to '
  'return masked response fields where needed.';

COMMIT;
