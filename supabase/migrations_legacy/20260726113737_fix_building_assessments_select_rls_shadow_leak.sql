-- SECURITY FIX (audit 2026-07-26): building_assessments SELECT policy leaked
-- all shadow-mode rows (user_id IS NULL; 474/495) to anon, contained a dead
-- wrong-column join (jobs.id = property_id), and an over-broad contractor
-- branch (job_photos_metadata) granting a contractor read of ALL of a
-- homeowner's assessments. Replace the merged {public} SELECT policy with a
-- {authenticated}-only policy retaining ONLY the five legitimate,
-- job_id-scoped branches. Shadow rows are now readable by service_role
-- (RLS bypass) and admins only.
DROP POLICY IF EXISTS "rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2" ON public.building_assessments;

CREATE POLICY "rls_merged_select_6e7e444c3684809dcb04802bbaf1f6b2"
  ON public.building_assessments
  FOR SELECT
  TO authenticated
  USING (
    -- owner
    ((SELECT auth.uid()) = user_id)
    -- homeowner of the linked job
    OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = building_assessments.job_id
        AND jobs.homeowner_id = (SELECT auth.uid())
    )
    -- contractor who bid on the linked job (scoped to that job)
    OR EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.bids ON bids.job_id = jobs.id
      WHERE jobs.id = building_assessments.job_id
        AND bids.contractor_id = (SELECT auth.uid())
    )
    -- any contractor may view assessments for open/unassigned jobs (marketplace discovery)
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.profiles u ON u.id = (SELECT auth.uid())
      WHERE j.id = building_assessments.job_id
        AND j.status = ANY (ARRAY['posted'::text, 'open'::text])
        AND j.contractor_id IS NULL
        AND u.role = 'contractor'::text
    )
    -- admin
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'::text
    )
  );;
