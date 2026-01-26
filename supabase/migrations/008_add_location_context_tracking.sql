-- Migration: Add Context and ETA to Location Tracking
-- Created: 2025-01-XX
-- Description: Enhances contractor_locations table with context-aware tracking
--              Adds ETA calculation, context tracking, and geohash support

-- ============================================================================
-- ENHANCE CONTRACTOR_LOCATIONS TABLE
-- ============================================================================

-- Add context column for tracking state
ALTER TABLE contractor_locations 
ADD COLUMN IF NOT EXISTS context VARCHAR(20) DEFAULT 'available';

-- Add ETA column for arrival time prediction
ALTER TABLE contractor_locations 
ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;

-- Add meeting_id reference (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contractor_locations' 
    AND column_name = 'meeting_id'
  ) THEN
    ALTER TABLE contractor_locations 
    ADD COLUMN meeting_id UUID REFERENCES contractor_meetings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add updated_at timestamp (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contractor_locations' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE contractor_locations 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add geohash for efficient spatial queries (optional but recommended)
ALTER TABLE contractor_locations 
ADD COLUMN IF NOT EXISTS geohash VARCHAR(12);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for context-based queries (using location_timestamp which exists in the table)
CREATE INDEX IF NOT EXISTS idx_contractor_locations_context 
ON contractor_locations(context, is_active, location_timestamp DESC);

-- Index for job-based location queries
CREATE INDEX IF NOT EXISTS idx_contractor_locations_job_context 
ON contractor_locations(job_id, context, is_active) 
WHERE job_id IS NOT NULL;

-- Index for meeting-based location queries
CREATE INDEX IF NOT EXISTS idx_contractor_locations_meeting 
ON contractor_locations(meeting_id, is_active) 
WHERE meeting_id IS NOT NULL;

-- Index for geohash spatial queries
CREATE INDEX IF NOT EXISTS idx_contractor_locations_geohash 
ON contractor_locations(geohash) 
WHERE geohash IS NOT NULL;

-- Composite index for active contractor lookups (using location_timestamp)
CREATE INDEX IF NOT EXISTS idx_contractor_locations_active_context 
ON contractor_locations(contractor_id, context, is_active, location_timestamp DESC) 
WHERE is_active = true;

-- ============================================================================
-- UPDATE EXISTING RECORDS
-- ============================================================================

-- Set default context for existing records
UPDATE contractor_locations 
SET context = 'available' 
WHERE context IS NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN contractor_locations.context IS 
'Location context: available, traveling, on_job, off_duty';

COMMENT ON COLUMN contractor_locations.eta_minutes IS 
'Estimated time of arrival in minutes (calculated when traveling)';

COMMENT ON COLUMN contractor_locations.geohash IS 
'Geohash for efficient spatial queries and viewport filtering';
