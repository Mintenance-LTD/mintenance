-- Add RLS policy to allow contractors to view available posted jobs
-- Previous policy only allowed viewing assigned jobs, blocking discovery

-- Add policy for contractors to view posted jobs that are available for bidding
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'jobs'
    AND policyname = 'Contractors can view posted jobs available for bidding'
  ) THEN
    CREATE POLICY "Contractors can view posted jobs available for bidding" ON public.jobs
      FOR SELECT USING (
        status = 'posted' AND contractor_id IS NULL
      );
  END IF;
END $$;

-- Add comment
COMMENT ON POLICY "Contractors can view posted jobs available for bidding" ON public.jobs IS
  'Allows contractors to discover available jobs in the marketplace (status=posted, unassigned)';
