# Audit 2026-04-13 — Items deferred to dedicated PRs

The 7-sprint remediation branch (`fix/mobile-audit-security-ux-features`) closed 8 P0 blockers and
~36 P1 items from the 2026-04-13 audit. This document tracks the items that were explicitly deferred
to dedicated follow-up PRs because they don't fit the "small, reviewable, safe" shape that the
remediation branch was scoped for.

Each entry states the finding, the reason it was deferred, the blast radius of the proper fix, and
what must be true before it can be merged.

---

## DB-P0-3 — PostGIS schema move

**Audit finding:** `public.spatial_ref_sys` has RLS disabled and is exposed via PostgREST. The
advisor flags this as an ERROR.

**Why deferred:** The fix requires moving the entire `postgis` extension out of `public` into a
dedicated `gis` schema. That simultaneously fixes the `extension_in_public` warnings for `postgis`,
`vector`, and `pg_trgm`. Blast radius: every unqualified PostGIS function call (`ST_Distance`,
`ST_Within`, `ST_AsText`, etc.) in SQL migrations, stored procedures, and application code needs to
either be requalified (`gis.ST_Distance`) or the consumer's `search_path` needs to be updated.

**Interim status:** `ALTER TABLE public.spatial_ref_sys ENABLE RLS` fails with
`must be owner of table` because PostGIS installs the table with extension-owned privileges that the
Supabase migration role cannot alter. Low-severity interim: `spatial_ref_sys` is immutable reference
data (EPSG codes) — no user data.

**Dedicated PR checklist:**

- [ ] `CREATE SCHEMA gis`
- [ ] `ALTER EXTENSION postgis SET SCHEMA gis`
- [ ] Full grep for `ST_*` calls; requalify or `SET search_path`
- [ ] Same for `vector` → `embeddings`, `pg_trgm` → `extensions`
- [ ] Run full web + mobile test suite
- [ ] Manual regression: property search, location queries, map view

---

## PKG-P1-4 — `Job` type consolidation

**Audit finding:** `packages/types/src/jobs.ts` `Job` interface has dual snake_case + camelCase
properties (`homeowner_id` + `homeownerId`, `contractor_id` + `contractorId`) with no enforced
mapper. The `location` field is typed `string | Record<string, unknown>` which disagrees with the DB
JSONB schema.

**Why deferred:** ~50+ consumers across web + mobile + API routes. Picking a single representation
(snake_case to match DB vs camelCase for UI) is a codebase-wide convention decision, not a type
edit.

**Dedicated PR checklist:**

- [ ] Decide canonical (recommendation: snake_case matching DB)
- [ ] Write `dbJobToApi(row)` mapper in `packages/shared/src/mappers/job.ts`
- [ ] Narrow `location` to a typed shape (JSONB with lat/lng/address)
- [ ] Migrate web one route group at a time
- [ ] Migrate mobile services + screens
- [ ] Delete the duplicate property aliases

---

## MSV-P1-7 — Mobile TLS certificate pinning

**Audit finding:** mobile HTTP client does not pin the TLS certificate of `api.mintenance.com` or
the Supabase project, leaving the app vulnerable to MITM on hostile WiFi.

**Why deferred:** Expo managed workflow cannot ship runtime pinning without a custom dev client, and
a forgotten cert rotation would brick every field contractor's phone. See
`docs/MOBILE_CERT_PINNING_RUNBOOK.md` for the full rollout plan, library choice
(`react-native-ssl-pinning` + config plugin), cert rotation playbook with overlap windows, and
staging validation steps.

**Status:** Runbook committed in Sprint 4 but native integration not started. Not
production-blocking — residual risk is acceptable under the "not on hostile WiFi" assumption.

---

## DB-P1-4 (follow-up) — Migration drift reconciliation

**Audit finding:** 6 migrations exist on remote that are not in `supabase/migrations/` (applied via
Supabase dashboard or another branch). Local tree out of sync with reality.

**Why deferred:** Pure housekeeping, no user impact. Fixable by `supabase db pull --schema public`
or manually authoring stub migration files. Not attempted during remediation because pulling the
schema could mask other intentional discrepancies.

**Remote-only migrations:**

- `20260404085201_add_review_status_to_contractor_documents`
- `20260404095738_add_tenant_invitation_columns`
- `20260404120923_drop_tenant_property_rls_policy`
- `20260405134939_fix_rls_cross_tenant_leaks`
- `20260406071552_drop_unused_user_notification_preferences_table`
- `20260406132954_restrict_profiles_sensitive_columns`

**Dedicated PR checklist:**

- [ ] `supabase db pull --schema public` to fresh branch
- [ ] Inspect diff, ensure no unexpected schema changes on remote
- [ ] Commit the 6 stub migration files
- [ ] Verify `list_migrations` shows local + remote aligned

---

## XC-P1 — Web Sentry + API observability

**Audit finding:** Sentry is integrated in mobile but not web. No API latency histograms, no DB
query duration metrics, no AI inference latency tracking.

**Why deferred:** Scope creep — each observability stream is its own PR (wire the SDK, define
metrics, build dashboards, configure alerts, document SLOs). Out of scope for a security/correctness
remediation branch.

**Dedicated PR checklist:**

- [ ] `npm i @sentry/nextjs` in apps/web
- [ ] Configure client+server SDKs with DSN from env
- [ ] Add error boundary reporting at root layout
- [ ] Define request latency histogram via middleware
- [ ] Document dashboards in `docs/OBSERVABILITY.md`

---

## Remaining Sprint 6 sub-items not completed

- **building-surveyor/assess/route.ts** is still 620 lines (down from 720 at start of Sprint 6). The
  pre-commit file-size hook limit is 500, and the file was already over the limit before any Sprint
  6 edits. Further extraction (cache lookup, AB test config, result storage) is mechanical but
  tedious and can be done in a dedicated split PR.
- **`Job-storage` bucket listing advisor warning** was intentionally left untouched in Sprint 6.1
  because the bucket has mixed path conventions (`job-photos/{maybe_job_id}/...`) that don't cleanly
  scope via `storage.foldername`. Needs either a path normalization backfill or a per-row owner
  check join with the `jobs` table.
- **3 intentionally-public buckets** (`avatars`, `contractor-portfolio`, `profile-images`) will
  continue to trip the `public_bucket_allows_listing` advisor. Documented as intentional in
  `docs/SUPABASE_DASHBOARD_CHECKLIST.md`.
