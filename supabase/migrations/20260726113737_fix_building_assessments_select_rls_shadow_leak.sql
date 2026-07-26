-- building_assessments: close the anonymous shadow-row read leak.
--
-- BACKFILLED 2026-07-26. This migration was originally applied live via MCP
-- with no repo file, so supabase/migrations still described the old, leaky
-- policy and anyone rebuilding from source would have reintroduced the leak.
-- The statements below were reconstructed from the live policy definition
-- (pg_policies) and match production exactly.
--
-- The defect: the previous SELECT policy was granted to `public` (i.e. anon
-- included) and carried the disjunct
--
--     (user_id IS NULL) OR ((select auth.uid()) = user_id)
--
-- `user_id IS NULL` requires no authentication at all, and 474 of 495 rows are
-- shadow-mode AI assessments stored with user_id = NULL. Every one of them was
-- readable by the anon role through PostgREST. Reproduced live with the anon
-- key before the fix (Content-Range: 0-0/474), and 0 rows after.
--
-- Two further defects in the same policy, also removed here:
--   * A dead branch joining `jobs.id = building_assessments.property_id` --
--     comparing a job id against a property id, so it never matched.
--   * An over-broad branch joining job_photos_metadata that let a contractor
--     with ANY photo-bearing job for a homeowner read ALL of that homeowner's
--     assessments rather than just the relevant job's.
--
-- Shadow-mode rows are now reachable only by the service role and by admins
-- (via the admin branch below).

DROP POLICY IF EXISTS rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2
  ON public.building_assessments;

CREATE POLICY rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2
  ON public.building_assessments
  FOR SELECT
  TO authenticated
  USING (
    -- 1. The assessment's own user.
    (select auth.uid()) = user_id
    -- 2. The homeowner of the job the assessment is anchored to.
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = building_assessments.job_id
        AND jobs.homeowner_id = (select auth.uid())
    )
    -- 3. A contractor who has bid on that job.
    OR EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.bids ON bids.job_id = jobs.id
      WHERE jobs.id = building_assessments.job_id
        AND bids.contractor_id = (select auth.uid())
    )
    -- 4. Any contractor, while the job is still open and unassigned -- this is
    --    the pre-bid browse case.
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.profiles u ON u.id = (select auth.uid())
      WHERE j.id = building_assessments.job_id
        AND j.status = ANY (ARRAY['posted'::text, 'open'::text])
        AND j.contractor_id IS NULL
        AND u.role = 'contractor'
    )
    -- 5. Platform admins.
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );
