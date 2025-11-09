-- Migration: Add Location Tracking Table
-- Created: 2025-11-02
-- Description: Creates contractor_locations table for real-time location tracking (Uber-like feature)

-- ============================================================================
-- CONTRACTOR_LOCATIONS TABLE - For real-time location tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    
    -- Location data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- Accuracy in meters
    altitude DECIMAL(10, 2),
    heading DECIMAL(5, 2), -- Direction in degrees (0-360)
    speed DECIMAL(5, 2), -- Speed in m/s
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_sharing_location BOOLEAN DEFAULT FALSE, -- Opt-in flag for location sharing
    
    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    device_info JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contractor_locations_contractor_id ON contractor_locations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_locations_job_id ON contractor_locations(job_id);
CREATE INDEX IF NOT EXISTS idx_contractor_locations_is_active ON contractor_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_contractor_locations_is_sharing ON contractor_locations(is_sharing_location);
CREATE INDEX IF NOT EXISTS idx_contractor_locations_timestamp ON contractor_locations(timestamp DESC);

-- Index for spatial queries (if PostGIS is available)
-- CREATE INDEX IF NOT EXISTS idx_contractor_locations_geography ON contractor_locations USING GIST (
--     ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
-- );

-- Function to get latest location for a contractor
CREATE OR REPLACE FUNCTION get_latest_contractor_location(p_contractor_id UUID, p_job_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    latitude DECIMAL,
    longitude DECIMAL,
    accuracy DECIMAL,
    timestamp TIMESTAMP WITH TIME ZONE,
    is_sharing_location BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.id,
        cl.latitude,
        cl.longitude,
        cl.accuracy,
        cl.timestamp,
        cl.is_sharing_location
    FROM contractor_locations cl
    WHERE cl.contractor_id = p_contractor_id
        AND cl.is_active = TRUE
        AND cl.is_sharing_location = TRUE
        AND (p_job_id IS NULL OR cl.job_id = p_job_id)
    ORDER BY cl.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE contractor_locations IS 'Real-time location tracking for contractors (Uber-like feature)';
COMMENT ON COLUMN contractor_locations.is_sharing_location IS 'Opt-in flag: contractor must explicitly enable location sharing';
COMMENT ON COLUMN contractor_locations.job_id IS 'Associated job for location tracking (null for general location)';

