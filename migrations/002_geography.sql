-- 002_geography.sql
-- Purpose: Migrate location handling to PostGIS geography/geometry and add spatial helpers.
-- - Adds center geography(Point,4326) and optional boundary polygon
-- - Backfills center from existing lat/lng if present
-- - Adds GiST indexes
-- - Replaces helper functions to use ST_DWithin/ST_Contains

BEGIN;

-- Ensure PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial columns to service_areas
ALTER TABLE IF EXISTS public.service_areas
  ADD COLUMN IF NOT EXISTS center geography(Point,4326),
  ADD COLUMN IF NOT EXISTS boundary geometry(Polygon,4326);

-- Backfill center from existing numeric columns if available
DO $$
BEGIN
  IF to_regclass('public.service_areas') IS NOT NULL THEN
    UPDATE public.service_areas
    SET center = ST_SetSRID(ST_MakePoint(center_longitude, center_latitude),4326)::geography
    WHERE center IS NULL
      AND center_longitude IS NOT NULL
      AND center_latitude IS NOT NULL;
  END IF;
END $$;

-- Spatial indexes
DO $$
BEGIN
  IF to_regclass('public.service_areas') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_service_areas_center_gist ON public.service_areas USING GIST(center);
    CREATE INDEX IF NOT EXISTS idx_service_areas_boundary_gist ON public.service_areas USING GIST(boundary);
  END IF;
END $$;

-- Helper: check if a point is in a service area
CREATE OR REPLACE FUNCTION public.is_location_in_service_area(
  p_area_id UUID, p_latitude DECIMAL, p_longitude DECIMAL
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  sa RECORD;
  pt geography(Point,4326);
BEGIN
  SELECT * INTO sa FROM public.service_areas WHERE id = p_area_id AND is_active = TRUE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  pt := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude),4326)::geography;

  IF sa.area_type = 'radius' AND sa.center IS NOT NULL AND sa.radius_km IS NOT NULL THEN
    RETURN ST_DWithin(sa.center, pt, (sa.radius_km * 1000)::double precision);
  ELSIF sa.area_type = 'polygon' AND sa.boundary IS NOT NULL THEN
    RETURN ST_Contains(sa.boundary, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude),4326));
  ELSE
    RETURN FALSE;
  END IF;
END; $$;

-- Helper: list contractors serving a location (radius areas)
CREATE OR REPLACE FUNCTION public.find_contractors_for_location(
  p_latitude DECIMAL, p_longitude DECIMAL, p_max_distance DECIMAL DEFAULT 50.0
) RETURNS TABLE (
  contractor_id UUID,
  area_name VARCHAR,
  distance_km DECIMAL,
  travel_charge DECIMAL,
  priority_level INTEGER
) LANGUAGE sql AS $$
  WITH target AS (
    SELECT ST_SetSRID(ST_MakePoint(p_longitude, p_latitude),4326)::geography AS pt
  )
  SELECT sa.contractor_id,
         sa.area_name,
         (ST_Distance(sa.center, target.pt)/1000.0)::DECIMAL AS distance_km,
         (COALESCE(sa.base_travel_charge,0)
          + COALESCE(sa.per_km_rate,0) * (ST_Distance(sa.center, target.pt)/1000.0))::DECIMAL AS travel_charge,
         sa.priority_level
  FROM public.service_areas sa, target
  WHERE sa.is_active = TRUE
    AND sa.center IS NOT NULL
    AND sa.area_type = 'radius'
    AND ST_DWithin(
      sa.center, target.pt,
      (COALESCE(sa.max_distance_km, p_max_distance) * 1000)::double precision
    )
  ORDER BY sa.priority_level ASC, ST_Distance(sa.center, target.pt) ASC;
$$;

-- Distance helper for clients that call calculate_distance_km
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL LANGUAGE sql IMMUTABLE AS $$
  SELECT (
    ST_Distance(
      ST_SetSRID(ST_MakePoint(lng1, lat1),4326)::geography,
      ST_SetSRID(ST_MakePoint(lng2, lat2),4326)::geography
    ) / 1000.0
  )::DECIMAL;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_distance_km(DECIMAL,DECIMAL,DECIMAL,DECIMAL) TO authenticated;

COMMIT;
