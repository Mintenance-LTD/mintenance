# Database Migrations (Mintenance)

This folder contains safe, incremental SQL migrations to close gaps/risks and capture quick wins without changing app code.

Run each file in order (001 → 008) using the Supabase SQL editor. Every script is idempotent (guards with IF/EXISTS) and can be re‑run safely.

## Files

- `000_service_areas.sql`: Base service-area schema (tables, indexes, RLS).
- `001_profiles.sql`: Adds `public.profiles`, seeds new auth users, and creates `public.v_users`.
- `002_geography.sql`: Moves service area location to PostGIS (`geography`/`geometry`), adds spatial indexes, and updates helper functions.
- `003_jobs_photos_backfill.sql`: Ensures `jobs_photos` exists, backfills from `jobs.photos` JSONB, and creates `v_job_photos`.
- `004_updated_at_trigger.sql`: Adds a generic `update_updated_at` trigger and attaches it to common tables.
- `005_retention_policies.sql`: Adds purge helpers for old `email_history` and `quote_interactions` rows.
- `006_secret_encryption.sql`: Ensures `pgcrypto`, restricts raw access to encrypted columns, and adds set/get helper functions.
- `007_rls_tightening.sql`: Rewrites key RLS policies to include `WITH CHECK` clauses matching `USING` (only if tables exist).
- `008_constraints.sql`: Adds a unique constraint to `service_routes (contractor_id, route_date, route_name)`.

## Apply Steps

1) Open Supabase → SQL Editor.
2) Run each script in order:
   - 000_service_areas.sql
   - 001_profiles.sql
   - 002_geography.sql
   - 003_jobs_photos_backfill.sql
   - 004_updated_at_trigger.sql
   - 005_retention_policies.sql
   - 006_secret_encryption.sql
   - 007_rlS_tightening.sql
   - 008_constraints.sql
3) Validate with the checks below after each stage.

## Validation Checklist

- Profiles
  - Create a new auth user; ensure a row appears in `public.profiles`.
  - `SELECT * FROM public.v_users LIMIT 5;` shows joined data.

- Service Areas
  - `SELECT to_regclass('public.service_areas');` returns `service_areas`.
  - `SELECT COUNT(*) FROM public.service_areas;` runs without error.

- Geography
  - `SELECT * FROM public.find_contractors_for_location(51.5072, -0.1276, 25);` returns rows quickly.
  - `EXPLAIN ANALYZE` shows usage of GiST index on `service_areas.center`.

- Jobs Photos
  - A job with JSONB photos now has rows in `public.jobs_photos`.
  - `SELECT * FROM public.v_job_photos WHERE job_id = '...'` returns URLs.

- Updated At
  - Update a row (e.g., `profiles`); confirm `updated_at` changes.

- Retention
  - Dry run: `BEGIN; SELECT public.purge_old_email_history(0); ROLLBACK;` Observe expected rowcount.

- Secrets
  - As an authenticated role, raw select of encrypted columns fails.
  - Round‑trip via `set_user_integration_secret` → `get_user_integration_secret` works for owner.

- RLS
  - Insert/update a quote as a non‑owner; expect RLS rejection.

- Constraints
  - Try inserting duplicate `service_routes` (same contractor/date/name); expect constraint violation.

## Rollback Guidance

All migrations are additive and safe. If you need to revert changes:

- Profiles: `DROP VIEW public.v_users; DROP TABLE public.profiles; DROP TRIGGER on_auth_user_created ON auth.users; DROP FUNCTION public.handle_new_user;`
- Geography: `ALTER TABLE public.service_areas DROP COLUMN IF EXISTS center, DROP COLUMN IF EXISTS boundary; DROP FUNCTION IF EXISTS public.is_location_in_service_area; DROP FUNCTION IF EXISTS public.find_contractors_for_location; DROP INDEX IF EXISTS idx_service_areas_center_gist; DROP INDEX IF EXISTS idx_service_areas_boundary_gist;`
- Jobs Photos: `DROP VIEW IF EXISTS public.v_job_photos;` (Do not drop `jobs_photos` if already in use.)
- Updated At: `DROP FUNCTION IF EXISTS public.update_updated_at;` (Remove triggers per table if desired.)
- Retention: `DROP FUNCTION IF EXISTS public.purge_old_email_history; DROP FUNCTION IF EXISTS public.purge_old_quote_interactions;`
- Secrets: `DROP FUNCTION IF EXISTS public.set_user_integration_secret; DROP FUNCTION IF EXISTS public.get_user_integration_secret;` (Re‑grant SELECT on encrypted columns if you previously revoked.)
- RLS: Recreate prior policies if you had custom variants.
- Constraints: `ALTER TABLE public.service_routes DROP CONSTRAINT IF EXISTS uq_routes_contractor_date_name;`

Note: Rollbacks may impact dependent app features. Prefer forward fixes over destructive rollbacks in production.
