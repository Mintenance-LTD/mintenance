-- Phase 4: PostGIS location + room metadata for longitudinal defect tracking
-- PostGIS extension already enabled (v3.3.7)

-- ============================================================================
-- STEP 1: Add geospatial location column to building_assessments
-- ============================================================================

ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

-- Spatial index for distance queries (e.g. "find similar defects within 1km")
CREATE INDEX IF NOT EXISTS idx_building_assessments_location
  ON building_assessments USING GIST (location);

-- ============================================================================
-- STEP 2: Add room metadata column
-- ============================================================================

-- Room context: { room: "bathroom", floor: 1, dimensions: "3x4m", orientation: "north" }
ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS room_metadata JSONB;

-- ============================================================================
-- STEP 3: Add latitude/longitude helper columns for easy querying
-- ============================================================================

-- These are denormalized for simpler queries/exports (location column is canonical)
ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ============================================================================
-- STEP 4: Backfill location from jobs table where possible
-- ============================================================================

-- Jobs have address data — try to link assessments to job locations
-- This is a best-effort backfill; future assessments will capture location directly
UPDATE building_assessments ba
SET latitude = j.latitude,
    longitude = j.longitude,
    location = ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::GEOGRAPHY
FROM jobs j
WHERE ba.job_id = j.id
  AND j.latitude IS NOT NULL
  AND j.longitude IS NOT NULL
  AND ba.location IS NULL;

-- ============================================================================
-- STEP 5: Create function for nearby defect search
-- ============================================================================

CREATE OR REPLACE FUNCTION find_nearby_assessments(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 1000,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  damage_type_canonical TEXT,
  severity TEXT,
  confidence INTEGER,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ba.id,
    ba.damage_type_canonical,
    ba.severity,
    ba.confidence,
    ST_Distance(
      ba.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
    ) AS distance_meters,
    ba.created_at
  FROM building_assessments ba
  WHERE ba.location IS NOT NULL
    AND ST_DWithin(
      ba.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
$$;

-- ============================================================================
-- STEP 6: Create function for longitudinal comparison (same property over time)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_property_assessment_history(
  p_property_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  damage_type_canonical TEXT,
  severity TEXT,
  confidence INTEGER,
  urgency TEXT,
  safety_score INTEGER,
  room_metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ba.id,
    ba.damage_type_canonical,
    ba.severity,
    ba.confidence,
    ba.urgency,
    ba.safety_score,
    ba.room_metadata,
    ba.created_at
  FROM building_assessments ba
  WHERE ba.property_id = p_property_id
  ORDER BY ba.created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- STEP 7: Documentation
-- ============================================================================

COMMENT ON COLUMN building_assessments.location IS 'GPS point (EPSG:4326) for spatial queries. Captured from mobile device or geocoded from address.';
COMMENT ON COLUMN building_assessments.room_metadata IS 'Room context: { room, floor, dimensions, orientation }. Captured during assessment.';
COMMENT ON COLUMN building_assessments.latitude IS 'Denormalized latitude from location column for easy export/filtering.';
COMMENT ON COLUMN building_assessments.longitude IS 'Denormalized longitude from location column for easy export/filtering.';
COMMENT ON FUNCTION find_nearby_assessments IS 'Find assessments within radius_meters of a GPS point. Returns sorted by distance.';
COMMENT ON FUNCTION get_property_assessment_history IS 'Get all assessments for a property ordered by date. For longitudinal defect tracking.';
