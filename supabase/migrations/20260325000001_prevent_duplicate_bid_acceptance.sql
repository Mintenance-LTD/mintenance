-- Migration: Prevent duplicate bid acceptance race condition
--
-- Problem: The bid acceptance endpoint uses check-then-act (SELECT then UPDATE)
-- which allows two concurrent requests to both accept different bids for the
-- same job, violating the invariant "only one accepted bid per job".
--
-- Solution: A partial unique index on (job_id) WHERE status = 'accepted'
-- ensures the database itself enforces this constraint atomically.
-- The second concurrent UPDATE will fail with a unique violation.

-- 1. Partial unique index: only one accepted bid per job
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_one_accepted_per_job
  ON public.bids (job_id)
  WHERE status = 'accepted';

-- 2. Also add a partial unique index for assigned jobs to contractor
--    (prevents the same race on the jobs table side)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_one_contractor_when_assigned
  ON public.jobs (id)
  WHERE status IN ('assigned', 'in_progress', 'completed')
    AND contractor_id IS NOT NULL;

-- 3. Add RLS policies to addresses table (P1-6: was missing)
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'RLS already enabled on addresses or table does not exist';
END $$;

-- Users can read their own addresses
DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
CREATE POLICY "addresses_select_own" ON public.addresses
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

-- Users can insert their own addresses
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
CREATE POLICY "addresses_insert_own" ON public.addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    OR company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Users can update their own addresses
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
CREATE POLICY "addresses_update_own" ON public.addresses
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Users can delete their own addresses
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;
CREATE POLICY "addresses_delete_own" ON public.addresses
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    OR company_id IN (
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Service role bypass for backend operations
DROP POLICY IF EXISTS "addresses_service_role" ON public.addresses;
CREATE POLICY "addresses_service_role" ON public.addresses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
