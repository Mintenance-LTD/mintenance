-- Extension schema migration — Phase 0 (search_path safety patch)
-- Audit: PR-10, runbook docs/RUNBOOK_extensions_schema_migration.md
--
-- Why this is needed:
--   The four functions below call PostGIS functions (ST_Distance, ST_DWithin,
--   ST_SetSRID, ST_MakePoint, etc.) UNQUALIFIED, while their search_path is
--   either '' or 'public'. They work today only because PostgreSQL caches the
--   resolved function OIDs after first parse — but that cache is invalidated
--   any time PostGIS is dropped, recreated, or moved to another schema.
--
--   Adding 'extensions' to search_path is forward-compatible with eventual
--   moves of pg_trgm/vector/postgis out of public, and is a no-op for current
--   behaviour because 'public' is still searched first.
--
-- Verified via Supabase MCP on 2026-04-19:
--   - calculate_distance_km          search_path=""
--   - find_contractors_for_location  search_path=""
--   - find_nearby_assessments        search_path="public"
--   - is_location_in_service_area    search_path=""
--   The two other PostGIS-using functions (get_contractor_recommendations,
--   get_jobs_paginated) already have search_path="public, extensions" and
--   are skipped here.

ALTER FUNCTION public.calculate_distance_km(numeric, numeric, numeric, numeric)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.find_contractors_for_location(numeric, numeric, numeric)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.find_nearby_assessments(double precision, double precision, integer, integer)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.is_location_in_service_area(uuid, numeric, numeric)
  SET search_path = public, extensions, pg_temp;

-- Sanity verification (run manually after apply):
--   SELECT proname, proconfig
--   FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
--   WHERE n.nspname = 'public'
--     AND proname IN ('calculate_distance_km','find_contractors_for_location',
--                     'find_nearby_assessments','is_location_in_service_area')
--   ORDER BY proname;
--   All four should now show: {"search_path=public, extensions, pg_temp"}.
