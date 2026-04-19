-- Extension schema migration — Phase 1 (pg_trgm)
-- Audit: PR-10, runbook docs/RUNBOOK_extensions_schema_migration.md
--
-- Moves the pg_trgm extension out of `public` into the `extensions` schema
-- to clear the `extension_in_public` advisor lint. Pre-apply 20260419000002
-- ensures all PostGIS-using public functions have `extensions` in their
-- search_path, so this is forward-safe even though pg_trgm itself doesn't
-- use PostGIS.
--
-- Pre-flight verification done on 2026-04-19 via Supabase MCP:
--   * pg_trgm version 1.6 currently in `public`
--   * No public function calls similarity()/word_similarity()/show_trgm()
--     unqualified (only the moved extension's own internal callers)
--   * Two GIN indexes use gin_trgm_ops:
--       - public.idx_jobs_location_trgm  (jobs.location)
--       - public.idx_materials_name      (materials.name)
--     Both depend on the operator class by OID (not by schema-qualified name),
--     so they continue to function after the move with no rebuild required.
--   * `extensions` schema already exists (pgcrypto and uuid-ossp live there).
--
-- Rollback: ALTER EXTENSION pg_trgm SET SCHEMA public;

-- Defensive: ensure the schema exists with grants for PostgREST roles.
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- The actual move.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Sanity verification (run manually after apply):
--   SELECT extname, n.nspname AS schema
--   FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid
--   WHERE extname = 'pg_trgm';
--   Expected: schema = 'extensions'.
--
--   And confirm the GIN indexes still resolve to operator classes:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE indexname IN ('idx_jobs_location_trgm','idx_materials_name');
--   Both indexes should still report 'gin_trgm_ops'.
