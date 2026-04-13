# Supabase Dashboard Checklist

Items that cannot be fixed via SQL migration and require action in the Supabase dashboard. Track as
part of the pre-production release gate.

Project ref: `ukrjudtlvapiajkjbcrd`

## Pre-production (Sprint 1.5 + remaining audit items)

### 1. Enable leaked password protection

- **Path:** Authentication → Password Security
- **Action:** Enable "Check against HaveIBeenPwned database"
- **Why:** Prevents users from signing up with passwords that have been exposed in public breaches.
  Flagged as `auth_leaked_password_protection` by the Supabase security advisor.
- **Risk if skipped:** Users with compromised passwords can still authenticate even after their
  credentials leak publicly.
- **Audit finding ID:** DB-P1-3

### 2. Upgrade Postgres to the latest patch

- **Path:** Database → Infrastructure → Upgrade
- **Current version:** `supabase-postgres-17.4.1.074`
- **Action:** Schedule upgrade during a low-traffic window (~5 min downtime).
- **Why:** Outstanding Postgres security patches. Flagged as `vulnerable_postgres_version` by the
  security advisor.
- **Audit finding ID:** DB-P1-2

### 3. Storage bucket policy hardening

- **Path:** Storage → Policies (per bucket)
- **Affected buckets (6):** `avatars`, `contractor-documents`, `contractor-portfolio`,
  `job-attachments`, `Job-storage`, `profile-images`, `training-images`
- **Issue:** Each bucket has a single broad `SELECT` policy on `storage.objects` that allows any
  client to list all files in the bucket. Public object URLs do not require this — the broad SELECT
  exposes more data than intended.
- **Action:** Replace the broad `SELECT TO public` policy with:
  - A scoped policy that only permits `.select` when the path matches the caller's `auth.uid()` /
    the job ID the caller owns / etc.
  - For truly public assets (logos, generic stock images), add a `WHERE path_prefix = 'public/'`
    guard and move files into that prefix.
- **Why:** Advisor `public_bucket_allows_listing` + audit finding XC-P1 storage policies.
- **Audit finding ID:** XC-P1 (§8.5 of the audit report)
- **Sprint:** 6.1

## Known unfixable (ecosystem limitations)

### spatial_ref_sys RLS disabled (DB-P0-3)

- **Advisor name:** `rls_disabled_in_public`
- **Status:** Blocked. `ALTER TABLE public.spatial_ref_sys ENABLE RLS` fails with
  `must be owner of table spatial_ref_sys` because PostGIS installs the table with extension-owned
  privileges that the Supabase migration role cannot alter.
- **Only real fix:** Move the PostGIS extension out of the `public` schema (into a dedicated `gis`
  schema). This simultaneously clears the `extension_in_public` advisor warning for `postgis`. Same
  approach works for `vector` → `embeddings` and `pg_trgm` → `extensions`.
- **Blast radius:** High. Every unqualified PostGIS function call (`ST_Distance`, `ST_Within`,
  `ST_AsText`, etc.) in application code and stored procedures must be either re-qualified
  (`gis.ST_Distance`) or the consumer's `search_path` updated. Required changes span SQL,
  application code, and any migration that references PostGIS types.
- **Plan:** Dedicated PR in Sprint 6.8 with full E2E test run before merge. Until then,
  `spatial_ref_sys` remains exposed as read-only reference data (EPSG codes, immutable), which is
  low-severity — no user data touched.
- **Audit finding ID:** DB-P0-3, DB-P1-1

## Post-launch monitoring

### Migration drift reconciliation

- 6 migrations exist on remote but not in `supabase/migrations/` (applied via dashboard or another
  branch):
  - `20260404085201_add_review_status_to_contractor_documents`
  - `20260404095738_add_tenant_invitation_columns`
  - `20260404120923_drop_tenant_property_rls_policy`
  - `20260405134939_fix_rls_cross_tenant_leaks`
  - `20260406071552_drop_unused_user_notification_preferences_table`
  - `20260406132954_restrict_profiles_sensitive_columns`
- **Action:** Pull the remote schema into local migration files so the codebase tree reflects
  reality. Use `supabase db pull --schema public` or manually author stub migration files matching
  the applied SQL.
- **Sprint:** 6 (housekeeping)
