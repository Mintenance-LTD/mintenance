-- Add geolocation columns to properties table
-- Properties need lat/lng for distance-based contractor discovery,
-- map visualization, and service area matching.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Spatial index for efficient proximity queries
CREATE INDEX IF NOT EXISTS idx_properties_location
  ON properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Auto-populate job lat/lng from property when job is created with a property_id
-- This ensures jobs inherit their property's coordinates
CREATE OR REPLACE FUNCTION sync_job_location_from_property()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NEW.latitude IS NULL THEN
    SELECT latitude, longitude INTO NEW.latitude, NEW.longitude
    FROM properties
    WHERE id = NEW.property_id AND latitude IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_job_location ON jobs;
CREATE TRIGGER trg_sync_job_location
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_location_from_property();

-- Also sync property coordinates back when a job is created with coordinates
-- but the property doesn't have them yet
CREATE OR REPLACE FUNCTION backfill_property_location_from_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    UPDATE properties
    SET latitude = NEW.latitude, longitude = NEW.longitude
    WHERE id = NEW.property_id AND latitude IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_backfill_property_location ON jobs;
CREATE TRIGGER trg_backfill_property_location
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION backfill_property_location_from_job();
