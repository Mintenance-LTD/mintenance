-- Migration: Fix Building Assessments - Add job_id Column
-- Created: 2025-12-17
-- Description: Adds job_id to building_assessments table to link assessments with jobs

-- ============================================================================
-- ADD JOB_ID COLUMN
-- ============================================================================

-- Add job_id column (nullable for backward compatibility with existing assessments)
ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_building_assessments_job_id
  ON building_assessments(job_id);

CREATE INDEX IF NOT EXISTS idx_building_assessments_job_id_created_at
  ON building_assessments(job_id, created_at DESC);

-- ============================================================================
-- UPDATE ROW LEVEL SECURITY
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own assessments" ON building_assessments;
DROP POLICY IF EXISTS "Service role can manage assessments" ON building_assessments;

-- Create new RLS policies that include job-based access
CREATE POLICY "Users can view assessments for their jobs or own assessments"
  ON building_assessments
  FOR SELECT
  USING (
    -- User can see their own assessments
    auth.uid() = user_id
    OR
    -- User can see assessments for jobs they own
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = building_assessments.job_id
      AND jobs.homeowner_id = auth.uid()
    )
    OR
    -- Contractors can see assessments for jobs they're bidding on
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = building_assessments.job_id
      AND jobs.status = 'open'
      AND EXISTS (
        SELECT 1 FROM bids
        WHERE bids.job_id = jobs.id
        AND bids.contractor_id = auth.uid()
      )
    )
  );

-- Allow users to create assessments for their jobs
CREATE POLICY "Users can create assessments for their jobs"
  ON building_assessments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      job_id IS NULL  -- Allow cache-only assessments
      OR EXISTS (
        SELECT 1 FROM jobs
        WHERE jobs.id = job_id
        AND jobs.homeowner_id = auth.uid()
      )
    )
  );

-- Allow users to update their own assessments
CREATE POLICY "Users can update their own assessments"
  ON building_assessments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own assessments
CREATE POLICY "Users can delete their own assessments"
  ON building_assessments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for API operations
CREATE POLICY "Service role can manage all assessments"
  ON building_assessments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- ADD MISSING PHOTOS DISPLAY SUPPORT
-- ============================================================================

-- Ensure job_attachments table has proper indexes
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id_created
  ON job_attachments(job_id, created_at DESC);

-- ============================================================================
-- BACKFILL HELPER FUNCTION (OPTIONAL)
-- ============================================================================

-- Function to attempt to link orphaned assessments to jobs
-- This tries to match assessments to jobs based on user_id and timing
CREATE OR REPLACE FUNCTION backfill_assessment_job_ids()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update assessments that have a clear job match
  -- (created within 5 minutes of a job with photos by the same user)
  UPDATE building_assessments ba
  SET job_id = j.id
  FROM (
    SELECT DISTINCT ON (ba2.id)
      ba2.id as assessment_id,
      j.id as job_id
    FROM building_assessments ba2
    INNER JOIN jobs j ON j.homeowner_id = ba2.user_id
    INNER JOIN job_attachments ja ON ja.job_id = j.id
    WHERE ba2.job_id IS NULL
      AND ABS(EXTRACT(EPOCH FROM (ba2.created_at - j.created_at))) < 300  -- Within 5 minutes
    ORDER BY ba2.id, ABS(EXTRACT(EPOCH FROM (ba2.created_at - j.created_at)))
  ) j
  WHERE ba.id = j.assessment_id
    AND ba.job_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN building_assessments.job_id IS 'Links assessment to specific job (nullable for cache-only assessments)';
COMMENT ON FUNCTION backfill_assessment_job_ids IS 'Attempts to link orphaned assessments to jobs based on timing and user';

-- Optional: Run backfill (uncomment if desired)
-- SELECT backfill_assessment_job_ids();