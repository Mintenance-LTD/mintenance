-- SECURITY FIX (audit 2026-07-26): building_assessments SELECT policy leaked
-- all shadow-mode rows (user_id IS NULL; 474/495) to anon, contained a dead
-- wrong-column join (jobs.id = property_id), and an over-broad contractor
-- branch (job_photos_metadata) granting a contractor read of ALL of a
-- homeowner's assessments.
--
-- Anon leak reproduced live via the public anon key before the fix:
--   GET /rest/v1/building_assessments?shadow_mode=eq.true
--   -> HTTP 206  Content-Range: 0-0/474
--
-- The previous merged {public} SELECT policy OR'd five legitimate,
-- job_id-scoped branches (owner / homeowner-of-job / contractor-who-bid /
-- contractor-on-open-unassigned-job / admin) with three defective tails.
-- Replace it with a {authenticated}-only policy retaining ONLY the five
-- legitimate branches. Shadow rows (user_id IS NULL) are now readable by
-- service_role (RLS bypass) and admins only.
--
-- Already applied live to project ukrjudtlvapiajkjbcrd via Supabase MCP on
-- 2026-07-26 (migration fix_building_assessments_select_rls_shadow_leak).
-- This file mirrors that change for source-of-truth / db diff parity and is
-- idempotent (DROP IF EXISTS + CREATE).
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
  );
