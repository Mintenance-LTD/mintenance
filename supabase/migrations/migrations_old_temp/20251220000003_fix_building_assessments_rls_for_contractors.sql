-- Migration: Fix Building Assessments RLS Policy for Contractor Discovery
-- Date: 2025-12-20
-- Issue: Contractors cannot view AI assessments on discover page because RLS policy blocks access
-- Root Cause: Policy only allows contractors to see assessments for jobs they've ALREADY bid on
-- Fix: Allow contractors to view assessments for POSTED jobs (discover page requirement)

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view assessments for their jobs or own assessments" ON building_assessments;

-- Create updated policy that allows contractor discovery
CREATE POLICY "Users can view assessments for their jobs or own assessments"
  ON building_assessments FOR SELECT
  USING (
    -- Users can view their own assessments
    auth.uid() = user_id
    OR
    -- Homeowners can view assessments for their jobs
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = building_assessments.job_id
      AND jobs.homeowner_id = auth.uid()
    )
    OR
    -- Contractors can view assessments for jobs they've bid on
    EXISTS (
      SELECT 1 FROM jobs
      INNER JOIN bids ON bids.job_id = jobs.id
      WHERE jobs.id = building_assessments.job_id
      AND bids.contractor_id = auth.uid()
    )
    OR
    -- ✅ NEW: Contractors can view assessments for POSTED jobs (discover page)
    EXISTS (
      SELECT 1
      FROM jobs j
      INNER JOIN users u ON u.id = auth.uid()
      WHERE j.id = building_assessments.job_id
      AND j.status IN ('posted', 'open')
      AND j.contractor_id IS NULL  -- Job not yet assigned
      AND u.role = 'contractor'     -- User is a contractor
    )
    OR
    -- Admin users can view all assessments
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Users can view assessments for their jobs or own assessments" ON building_assessments IS
'Allows users to view building assessments in the following scenarios:
1. User created the assessment (user_id match)
2. User is the homeowner of the job (jobs.homeowner_id match)
3. User is a contractor who has bid on the job (bids.contractor_id match)
4. User is a contractor viewing posted/open jobs without assignments (discover page)
5. User is an admin';

-- Verify policy is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'building_assessments'
    AND policyname = 'Users can view assessments for their jobs or own assessments'
  ) THEN
    RAISE EXCEPTION 'Failed to create building_assessments RLS policy';
  END IF;
END $$;
