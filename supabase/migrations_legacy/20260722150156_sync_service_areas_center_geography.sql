-- STEP 3 of 20260717120000_matching_postgis_cutover.sql, applied early.
--
-- `service_areas.center` (GEOGRAPHY, added 20260131000001) was never
-- populated by the CRUD paths — the live row had center_latitude /
-- center_longitude set but center NULL. Both live matchers
-- (find_contractors_for_location, is_location_in_service_area) read the
-- `center` geography, so every service area matched nobody.
--
-- Applied ahead of the rest of the PostGIS cutover because it repairs an
-- EXISTING function rather than introducing new ones. Every statement is
-- idempotent (CREATE OR REPLACE / IF NOT EXISTS / backfill guarded on
-- center IS NULL), so 20260717120000 still applies unchanged at deploy.

CREATE OR REPLACE FUNCTION public.sync_service_area_center()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.center_latitude IS NOT NULL AND NEW.center_longitude IS NOT NULL THEN
    NEW.center :=
      ST_SetSRID(ST_MakePoint(NEW.center_longitude::double precision,
                              NEW.center_latitude::double precision),
                 4326)::GEOGRAPHY;
  ELSE
    NEW.center := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_areas_sync_center ON public.service_areas;
CREATE TRIGGER trg_service_areas_sync_center
  BEFORE INSERT OR UPDATE OF center_latitude, center_longitude
  ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION public.sync_service_area_center();

UPDATE public.service_areas
SET center = ST_SetSRID(
      ST_MakePoint(center_longitude::double precision,
                   center_latitude::double precision), 4326)::GEOGRAPHY
WHERE center_latitude IS NOT NULL
  AND center_longitude IS NOT NULL
  AND center IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_areas_center
  ON public.service_areas USING GIST (center);;
