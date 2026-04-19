# Runbook — Move `postgis`, `vector`, `pg_trgm` out of `public` schema

**Status:** Phase 0 + Phase 1 **APPLIED to production live DB on 2026-04-19** (migrations
`20260419000002`, `20260419000003`). Verified via Supabase MCP:

- All 4 functions now report `search_path=public, extensions, pg_temp`.
- `pg_trgm` 1.6 now in `extensions` schema. Both GIN indexes (`idx_jobs_location_trgm`,
  `idx_materials_name`) still report `gin_trgm_ops`.
- Security advisor count: 6 → 5 (one `extension_in_public` lint for `pg_trgm` cleared).
- Smoke test: `calculate_distance_km(51.5, -0.1, 51.6, -0.15)` returns 11.65 km as expected.

Phase 2 (vector) blocked by 3 dependent tables; Phase 3 (postgis) deferred per Option A (leave in
public, patch dependent functions).

**Audit finding IDs:** DB-P0-3 (`spatial_ref_sys` RLS), DB-P1-1 (`extension_in_public` ×3). Tracked
by advisors `rls_disabled_in_public` and `extension_in_public`.

## 2026-04-19 status snapshot (live DB inspection)

| Extension   | Current schema | Version | Move plan                                           | Blocker                                                                                                                                                                                                                                                 |
| ----------- | -------------- | ------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pgcrypto`  | `extensions`   | 1.3     | done (historical)                                   | none                                                                                                                                                                                                                                                    |
| `uuid-ossp` | `extensions`   | 1.1     | done (historical)                                   | none                                                                                                                                                                                                                                                    |
| `pg_trgm`   | **`public`**   | 1.6     | Phase 1 — migration `20260419000003` ready          | none                                                                                                                                                                                                                                                    |
| `vector`    | **`public`**   | 0.8.0   | Phase 2 — **BLOCKED**                               | 3 tables have `vector` columns: `building_pathology_knowledge.embedding`, `jobs.embedding`, `search_analytics.embedding`. Plus 2 HNSW indexes. ALTER EXTENSION SET SCHEMA fails when the type is in use; needs explicit type-requalification migration. |
| `postgis`   | **`public`**   | 3.3.7   | Phase 3 Option A — leave in public, patch functions | Same fundamental problem (geometry/geography columns on 5 tables); per runbook, Option A patches dependent functions instead of moving the extension.                                                                                                   |

PostGIS-dependent tables (informational): `building_assessments.location`, `service_areas.boundary`,
`service_areas.center`, `valid_detail.location`, `geometry_dump.geom`.

User-defined functions in `public` that call PostGIS functions:

| Function                         | Original `search_path` | After Phase 0                 |
| -------------------------------- | ---------------------- | ----------------------------- |
| `calculate_distance_km`          | `''`                   | `public, extensions, pg_temp` |
| `find_contractors_for_location`  | `''`                   | `public, extensions, pg_temp` |
| `find_nearby_assessments`        | `'public'`             | `public, extensions, pg_temp` |
| `is_location_in_service_area`    | `''`                   | `public, extensions, pg_temp` |
| `get_contractor_recommendations` | `'public, extensions'` | unchanged (already safe)      |
| `get_jobs_paginated`             | `'public, extensions'` | unchanged (already safe)      |

The four functions with restrictive search_path work today only because PostgreSQL caches the
PostGIS function OIDs after first parse. Any extension move would invalidate that cache. Migration
`20260419000002` makes them future-safe by adding `extensions` to their search_path without changing
observable behaviour (public is still searched first; PostGIS still lives there).

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

Phase 2 — `vector` (**BLOCKED — needs separate strategy**):

Inspection on 2026-04-19 returned 3 dependent tables with `vector` columns:
`public.building_pathology_knowledge.embedding`, `public.jobs.embedding`,
`public.search_analytics.embedding` (plus the two HNSW indexes that depend on them).

`ALTER EXTENSION vector SET SCHEMA embeddings` will fail because the column type is referenced
unqualified. Two viable strategies for a future PR:

1. **DB-wide search_path approach (low risk).** Add `embeddings` to the database's default
   search*path \_before* moving the extension; columns will then resolve `vector` against the new
   schema automatically. Requires:
   `ALTER DATABASE postgres SET search_path = public, extensions, embeddings;` followed by the
   extension move. Risk: changes resolution for every session — confirm no table has a column
   literally named `vector` first.
2. **Type-requalification approach (higher risk, cleaner).** Drop the embedding columns, move the
   extension, recreate columns as `embeddings.vector(N)`. Needs a backup-and-restore of the
   embedding data because the column type is being changed; HNSW indexes must be rebuilt. Estimate
   ~30 min downtime in a maintenance window.

Don't ship Phase 2 without a dedicated PR + maintenance window + backup snapshot.

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
