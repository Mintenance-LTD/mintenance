-- Matching PostGIS cutover (2026-07-17)
--
-- Replaces the JS full-table Haversine scans behind contractor matching
-- with indexed PostGIS queries, and makes the notify-nearby audience
-- respect each contractor's own `service_areas` coverage.
--
-- NOTE: `profiles.location` / `jobs.location` are pre-existing TEXT
-- address columns, so the geography column is named `location_point`.
--
-- Applies at deploy time with the code that calls the new RPCs. The
-- calling code degrades gracefully (legacy Haversine scan) while the
-- RPCs/columns are absent, so ordering is safe in both directions.

-- ============================================================================
-- STEP 1: geography columns on profiles + jobs (denormalized from lat/lng)
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_profiles_location_point
  ON public.profiles USING GIST (location_point);

CREATE INDEX IF NOT EXISTS idx_jobs_location_point
  ON public.jobs USING GIST (location_point);

-- ============================================================================
-- STEP 2: keep-in-sync trigger — latitude/longitude stay the writable API
-- ============================================================================

-- Shared trigger fn: profiles and jobs both expose latitude/longitude
-- NUMERIC columns; location_point is derived and never written directly.
CREATE OR REPLACE FUNCTION public.sync_location_point_from_lat_lng()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_point :=
      ST_SetSRID(ST_MakePoint(NEW.longitude::double precision,
                              NEW.latitude::double precision), 4326)::GEOGRAPHY;
  ELSE
    NEW.location_point := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_location_point ON public.profiles;
CREATE TRIGGER trg_profiles_sync_location_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_location_point_from_lat_lng();

DROP TRIGGER IF EXISTS trg_jobs_sync_location_point ON public.jobs;
CREATE TRIGGER trg_jobs_sync_location_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_location_point_from_lat_lng();

-- Backfill existing rows
UPDATE public.profiles
SET location_point = ST_SetSRID(
      ST_MakePoint(longitude::double precision, latitude::double precision),
      4326)::GEOGRAPHY
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_point IS NULL;

UPDATE public.jobs
SET location_point = ST_SetSRID(
      ST_MakePoint(longitude::double precision, latitude::double precision),
      4326)::GEOGRAPHY
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_point IS NULL;

-- ============================================================================
-- STEP 3: fix service_areas.center sync (live gap found 2026-07-17)
-- ============================================================================

-- `service_areas.center` (GEOGRAPHY, added 20260131000001) was never
-- populated by the CRUD paths — the live row has center_latitude/
-- center_longitude set but center NULL, so find_contractors_for_location
-- matched nobody. Same derived-column pattern as STEP 2.
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

-- ============================================================================
-- STEP 4: broadcast-audience RPC — service-area-aware contractor matching
-- ============================================================================

-- Audience rule (mirrors JobNotificationService docs):
--   * Contractor has >= 1 active, evaluable service_areas row →
--     eligible iff the job point falls inside ANY of their areas, using
--     THEIR OWN COALESCE(max_distance_km, radius_km, default) radius
--     (or a city match for area_type='cities' when p_city is provided).
--   * Otherwise → fall back to profiles.location_point within
--     p_default_radius_km (DEFAULT_MATCH_RADIUS_KM in app code).
--   * is_active = false rows are always excluded; is_available = false
--     contractors are always excluded.
-- area_type='postal_codes' is not evaluable yet (jobs carry no postcode)
-- — those contractors fall back to the profile radius rather than being
-- silently dropped. Marketplace invariant: this selects who gets
-- NOTIFIED; homeowners still pick the winner from bids.
--
-- preferred_days/preferred_hours of the CLOSEST matched area are
-- returned so the caller can politely defer out-of-hours pushes (soft
-- signal; never suppresses — see JobNotificationService). NULL for
-- profile_radius matches.
CREATE OR REPLACE FUNCTION public.find_contractors_for_job(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_default_radius_km NUMERIC DEFAULT 25.0,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  contractor_id UUID,
  distance_km NUMERIC,
  matched_via TEXT,
  preferred_days TEXT[],
  preferred_hours JSONB
)
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
  WITH target AS (
    SELECT ST_SetSRID(ST_MakePoint(p_longitude::double precision,
                                   p_latitude::double precision),
                      4326)::GEOGRAPHY AS pt
  ),
  -- Contractors whose active coverage can actually be evaluated with
  -- the inputs we have. Radius areas need a center; city areas need
  -- p_city. Contractors with only non-evaluable areas (e.g. postal
  -- codes) fall through to the profile-radius branch below.
  evaluable AS (
    SELECT DISTINCT sa.contractor_id
    FROM public.service_areas sa
    WHERE sa.is_active = TRUE
      AND (
        (sa.area_type = 'radius' AND sa.center IS NOT NULL)
        OR (sa.area_type = 'cities' AND p_city IS NOT NULL)
      )
  ),
  -- One row per contractor: their CLOSEST matching area (radius
  -- matches sort before distance-less city matches via NULLS LAST) —
  -- its distance and working-hours preferences travel together.
  sa_matches AS (
    SELECT DISTINCT ON (sa.contractor_id)
      sa.contractor_id,
      CASE WHEN sa.center IS NOT NULL
        THEN (ST_Distance(sa.center, t.pt) / 1000.0)::NUMERIC
      END AS distance_km,
      sa.preferred_days,
      sa.preferred_hours
    FROM public.service_areas sa, target t
    WHERE sa.is_active = TRUE
      AND (
        (
          sa.area_type = 'radius'
          AND sa.center IS NOT NULL
          AND ST_DWithin(
            sa.center, t.pt,
            (COALESCE(sa.max_distance_km, sa.radius_km, p_default_radius_km)
              * 1000)::double precision)
        )
        OR (
          sa.area_type = 'cities'
          AND p_city IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM unnest(sa.cities) AS c
            WHERE lower(c) = lower(p_city)
          )
        )
      )
    ORDER BY sa.contractor_id,
             (CASE WHEN sa.center IS NOT NULL
                THEN ST_Distance(sa.center, t.pt) END) ASC NULLS LAST
  )
  SELECT p.id, sm.distance_km, 'service_area'::TEXT,
         sm.preferred_days, sm.preferred_hours
  FROM sa_matches sm
  JOIN public.profiles p
    ON p.id = sm.contractor_id
   AND p.role = 'contractor'
   AND p.is_available = TRUE
  UNION ALL
  SELECT p.id,
         (ST_Distance(p.location_point, t.pt) / 1000.0)::NUMERIC,
         'profile_radius'::TEXT,
         NULL::TEXT[],
         NULL::JSONB
  FROM public.profiles p, target t
  WHERE p.role = 'contractor'
    AND p.is_available = TRUE
    AND p.location_point IS NOT NULL
    AND p.id NOT IN (SELECT contractor_id FROM evaluable)
    AND ST_DWithin(p.location_point, t.pt,
                   (p_default_radius_km * 1000)::double precision);
$$;

-- ============================================================================
-- STEP 5: discover-feed RPC — indexed radius filter for open jobs
-- ============================================================================

-- Returns candidate job ids for GET /api/jobs/discover's map filter.
-- Status/assignment/coords filters mirror the route's base query; the
-- route still applies category + own-bid exclusions on the id set.
CREATE OR REPLACE FUNCTION public.find_jobs_near_point(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_radius_km NUMERIC DEFAULT 25.0,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  job_id UUID,
  distance_km NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
  WITH target AS (
    SELECT ST_SetSRID(ST_MakePoint(p_longitude::double precision,
                                   p_latitude::double precision),
                      4326)::GEOGRAPHY AS pt
  )
  SELECT j.id, (ST_Distance(j.location_point, t.pt) / 1000.0)::NUMERIC
  FROM public.jobs j, target t
  WHERE j.status = 'posted'
    AND j.contractor_id IS NULL
    AND j.location_point IS NOT NULL
    AND ST_DWithin(j.location_point, t.pt,
                   (p_radius_km * 1000)::double precision)
  ORDER BY j.created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- STEP 6: lock down — server-only RPCs (S5 anon-EXECUTE policy)
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.find_contractors_for_job(NUMERIC, NUMERIC, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_jobs_near_point(NUMERIC, NUMERIC, NUMERIC, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_contractors_for_job(NUMERIC, NUMERIC, NUMERIC, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.find_jobs_near_point(NUMERIC, NUMERIC, NUMERIC, INTEGER)
  TO service_role;
