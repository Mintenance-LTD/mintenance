-- Audit 2026-04-16 P0 #1: contractor_locations SELECT was USING (true),
-- letting any authenticated user read every contractor's live GPS.
-- Scope SELECT to: own contractor row, OR a homeowner whose job is
-- currently assigned/in_progress to that contractor.

BEGIN;

DROP POLICY IF EXISTS contractor_locations_select ON public.contractor_locations;

CREATE POLICY contractor_locations_select ON public.contractor_locations
  FOR SELECT
  TO authenticated
  USING (
    contractor_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = contractor_locations.job_id
        AND j.homeowner_id = auth.uid()
        AND j.status IN ('assigned', 'in_progress')
    )
  );

COMMIT;
