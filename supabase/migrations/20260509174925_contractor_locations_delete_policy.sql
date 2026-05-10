-- AUDIT_PUNCH_LIST P2 #37 (D-P2-6) — `contractor_locations` had no
-- DELETE policy, so contractors couldn't wipe their own GPS trail
-- (privacy regression: SELECT/INSERT/UPDATE were scoped to the
-- contractor but DELETE returned a generic "policy violated" error
-- on the row owner). Adding the symmetric self-only policy.
--
-- Service-role bypasses RLS so admin tooling is unaffected.

CREATE POLICY contractor_locations_delete
  ON public.contractor_locations
  FOR DELETE
  TO authenticated
  USING (contractor_id = auth.uid());
