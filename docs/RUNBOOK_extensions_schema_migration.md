# Runbook — Move `postgis`, `vector`, `pg_trgm` out of `public` schema

**Status:** Planned (Sprint 6.8). Not executed. This runbook captures the exact steps and known
landmines so an engineer can pick it up and ship it as a dedicated PR.

**Audit finding IDs:** DB-P0-3 (`spatial_ref_sys` RLS), DB-P1-1 (`extension_in_public` ×3). Tracked
by advisors `rls_disabled_in_public` and `extension_in_public`.

## Why this is hard

`ALTER EXTENSION postgis SET SCHEMA gis` is **not supported** for PostGIS. The extension installs
~1,500 objects (geometry/geography types, operator classes, ~400 functions, spatial_ref_sys table).
Moving requires either:

1. A **drop + re-create** of the extension in the target schema. Every geometry/geography column in
   user tables has to be temporarily altered to `text` or `bytea`, the extension dropped and
   re-created, then columns restored — risky on prod data.
2. A **search_path trick** — leave PostGIS in public but set
   `ALTER DATABASE <db> SET search_path = gis, public, extensions;` so callers don't need to
   qualify. Doesn't satisfy the advisor, but does remove the "extension pollutes public namespace"
   problem. This is the low-risk path.

`pg_trgm` and `vector` are much easier: they have no user-data dependencies.

## Call sites that will break if extensions move

### DB functions in `public` (must be updated)

Confirmed via `pg_proc` inspection on 2026-04-17 (project `ukrjudtlvapiajkjbcrd`):

1. `public.calculate_distance_km`
2. `public.find_contractors_for_location`
3. `public.find_nearby_assessments`
4. `public.get_contractor_recommendations`
5. `public.get_jobs_paginated`

Each uses unqualified PostGIS function calls (`ST_Distance`, `ST_DWithin`, `ST_MakePoint`, etc.).
Options:

- Best: add `SET search_path = public, gis, extensions` to each function definition. Self-contained
  fix.
- Alternative: re-qualify every call (`gis.ST_Distance(...)`).

### Migration files (historical — do not rewrite)

These applied migrations contain PostGIS calls. They are immutable history, so nothing to change —
but any NEW migration must use qualified calls or explicit search_path once the move is done.

- `supabase/migrations/20260131000001_from_root_migrations_geography.sql`
- `supabase/migrations/20260327000001_fix_linter_security_warnings.sql`
- `supabase/migrations/20260331000001_fix_supabase_security_advisor_warnings.sql`
- `supabase/migrations/20260412000002_postgis_location_room_metadata.sql`
- `supabase/migrations/20260417000001_contract_signing_atomic_appointment.sql`

### Application code

Not expected to reference PostGIS function names directly (app always goes through RPC / PostgREST
on the stored functions above). Grep before PR:

```
rg "ST_(Distance|Within|DWithin|MakePoint|GeomFromText|AsText)" apps packages
rg "<->|similarity\(" apps packages   # pg_trgm / vector usage
```

## Recommended execution order (safe path)

Phase 1 — `pg_trgm` (trivial):

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
```

Then add `extensions` to search_path in any function using `similarity()`.

Phase 2 — `vector` (easy — no user-column dependencies unless pgvector columns already exist;
inspect `pg_attribute` for `vector` type before moving):

```sql
CREATE SCHEMA IF NOT EXISTS embeddings;
-- Check for vector-typed columns first:
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE udt_name = 'vector';
-- If empty, safe to move:
ALTER EXTENSION vector SET SCHEMA embeddings;
```

Phase 3 — `postgis` (HARD — dedicated PR, maintenance window):

- Pre-flight: back up, staging restore, run full E2E.
- Option A (preferred low risk): leave in public, update the 5 DB functions above to explicit
  `SET search_path`, declare the advisor as accepted risk.
- Option B (advisor-satisfying): follow
  https://postgis.net/docs/postgis_installation.html#upgrade-post-4 exact procedure. Drop + recreate
  in `gis` schema, restore geometry columns from backup, re-create all spatial indexes.

## Verification after each phase

```sql
-- Should shrink as extensions move out:
SELECT extname, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN ('postgis','vector','pg_trgm')
ORDER BY extname;

-- All five app functions still work:
SELECT calculate_distance_km(51.5, -0.1, 51.6, -0.15);
SELECT * FROM find_contractors_for_location(51.5, -0.1, 5) LIMIT 1;
```

Re-run `mcp_supabase__get_advisors(type='security')` — `extension_in_public` warnings for moved
extensions should be gone; `rls_disabled_in_public` on `spatial_ref_sys` clears only when PostGIS
itself moves out of `public`.

## Done criteria

- [ ] Advisor no longer reports `extension_in_public` for any of the three.
- [ ] `spatial_ref_sys` RLS advisor resolved (only clears with Phase 3).
- [ ] All 5 DB functions above still pass their existing tests.
- [ ] Full Playwright E2E run green in staging.
- [ ] Rollback plan recorded in the PR description (dump + point-in-time recovery from the
      pre-migration snapshot).
