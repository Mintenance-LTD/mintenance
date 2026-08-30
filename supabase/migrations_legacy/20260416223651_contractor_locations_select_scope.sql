
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
;
