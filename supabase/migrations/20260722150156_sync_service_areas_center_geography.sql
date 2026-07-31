-- Sync service_areas.center from center_latitude/center_longitude
-- (applied live 2026-07-22 via Supabase MCP; this file records it).
--
-- `service_areas.center` (GEOGRAPHY, added 20260131000001) was never
-- populated by any CRUD path — the live row had center_latitude /
-- center_longitude set correctly but center NULL. Both live matchers,
-- `find_contractors_for_location` and `is_location_in_service_area`,
-- read the `center` geography, so EVERY service area matched nobody:
-- a contractor's coverage had no effect on which jobs reached them.
--
-- Measured on the live row before/after (rolled back):
--   center NULL      -> find_contractors_for_location(51.90, -2.08, 25) = 0 rows
--   center populated -> same call                                      = 1 row @ 0.81 km
--
-- This is STEP 3 of 20260717120000_matching_postgis_cutover.sql, lifted
-- out and applied ahead of the rest. That migration is additive — it
-- introduces NEW functions (find_contractors_for_job, find_jobs_near_point)
-- and new location_point columns on profiles/jobs — and is designed to
-- land with the calling code that is still unmerged. This step is the
-- one part that REPAIRS AN EXISTING function, so it does not need to
-- wait for that code and should not.
--
-- Every statement here is idempotent (CREATE OR REPLACE / DROP TRIGGER
-- IF EXISTS / CREATE INDEX IF NOT EXISTS / backfill guarded on
-- `center IS NULL`), so 20260717120000 still applies unchanged at deploy
-- and re-running STEP 3 is a no-op. Do NOT delete STEP 3 from that file
-- — a fresh database replays migrations in order and needs it there.

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
  ON public.service_areas USING GIST (center);
