# Supabase Dashboard Checklist

Items that cannot be fixed via SQL migration and require action in the Supabase dashboard. Track as
part of the pre-production release gate.

Project ref: `ukrjudtlvapiajkjbcrd`

## Quick reference — open advisor items (last verified 2026-04-19)

| #   | Item                                                  | Severity | Effort               | Owner          | Plan tier |
| --- | ----------------------------------------------------- | -------- | -------------------- | -------------- | --------- |
| 1   | Enable HIBP leaked-password protection                | WARN     | 2 min                | Platform admin | Pro+      |
| 2   | Upgrade Postgres patch (`17.4.1.074` → latest)        | WARN     | ~5-10 min downtime   | Platform admin | All       |
| 3   | Storage bucket policy hardening (4 remaining buckets) | WARN     | 30-60 min per bucket | Platform admin | All       |
| -   | spatial_ref_sys RLS / extensions in public            | WARN     | Half-day PR          | Eng (PR-10)    | All       |
| -   | Migration drift reconciliation (6 missing files)      | INFO     | 30 min               | Eng            | All       |

Re-run advisor state any time via Supabase MCP `get_advisors(type='security')` or in the dashboard
at **Database → Advisors → Security**.

## Changelog

- **2026-04-19:** Re-verified live advisor state via MCP — items 1, 2, and ecosystem-blocked items
  unchanged. Storage policy hardening (item 3) advisors cleared after 2026-04-17 listing- policy
  migration; remaining work is per-bucket policy scoping.
- **2026-04-17:** `contractor-documents` and `job-attachments` buckets flipped to PRIVATE via
  migration `20260417000004_private_doc_buckets.sql`. Callers updated in `apps/web/app/api/upload`,
  `apps/web/app/api/contractor/documents`, `apps/web/app/api/maintenance/detect`, and
  `JobSignOffClient.tsx` to use `createSignedUrl` instead of `getPublicUrl`. Section 3 below now
  only applies to the four remaining public buckets (`avatars`, `contractor-portfolio`,
  `profile-images`, `training-images`).
- **2026-04-17:** `contractor_locations` SELECT policy scoped to contractor-own or active-job
  homeowner via migration `20260417000003_contractor_locations_select_scope.sql`.
- **2026-04-17:** `user_notification_preferences` table created via migration
  `20260417000005_user_notification_preferences.sql`. Supersedes drift item
  `20260406071552_drop_unused_user_notification_preferences_table` — re-introduced now that
  NotificationService opt-outs can be wired.

## Pre-production (Sprint 1.5 + remaining audit items)

### 1. Enable leaked password protection (HIBP)

- **Advisor name:** `auth_leaked_password_protection`
- **Audit finding ID:** DB-P1-3
- **Plan tier required:** Pro plan or above (free tier does not expose this toggle).
- **Severity:** WARN — does not block sign-ins today; users with breached passwords can still
  authenticate.
- **Effort:** 2 minutes (single toggle, no downtime, instant effect).
- **Direct link:**
  <https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/auth/providers?provider=Email>

#### Pre-flight

- Confirm the deployer has Owner or Admin role on the Supabase org.
- Decide whether to also raise the minimum-password-length and required-character settings while you
  are in the same screen (the audit also recommends a stronger floor — see "Optional companion
  hardening" below).

#### Procedure

1. In the Supabase dashboard, open **Authentication → Providers** in the left nav.
2. Scroll to the **Email** provider card and click it to expand settings.
3. Find the **Password Strength** section.
4. Toggle **Prevent the use of leaked passwords** to **ON**.
5. Click **Save**.

#### Verification

- The toggle should now display ON and the page banner confirms "Settings saved".
- In a fresh browser session, attempt to sign up with a known-leaked password (e.g. `Password123!`
  or `iloveyou`). The signup must be rejected with an error message that mentions the password being
  compromised. Use a throwaway email address — successful test signups should be deleted from the
  `auth.users` table afterwards.
- Re-run the security advisor: `get_advisors(type='security')` via MCP, or in the dashboard at
  **Database → Advisors → Security**. The `auth_leaked_password_protection` lint should clear.

#### Effect on existing users

- Existing users with weak/leaked passwords can still sign in today, but the next time they call
  `signInWithPassword` they may receive a `WeakPasswordError`. Surface this as a friendly "please
  update your password" prompt rather than a hard fail. Existing relevant code path:
  `apps/web/app/api/auth/login` and `apps/mobile/src/services/AuthService.ts`.
- Password resets and signups will be subject to the new check immediately.

#### Rollback

- Same path, toggle back to OFF, click Save. No data migration involved. Use only if the toggle
  causes unexpected churn during signup A/B testing — it is otherwise low-risk.

#### Optional companion hardening (recommended same-day)

While in **Auth → Providers → Email → Password Strength**, also confirm:

- **Minimum password length:** 8 (raise to 12 if comfortable, but 8 matches industry default).
- **Required characters:** at minimum digits + lowercase + uppercase. Enabling symbols too is ideal
  but increases support burden. The audit currently has no preference.

### 2. Upgrade Postgres to the latest patch

- **Advisor name:** `vulnerable_postgres_version`
- **Audit finding ID:** DB-P1-2
- **Severity:** WARN — outstanding security patches, no exploit known against our workload but
  exposure grows over time.
- **Effort:** ~5-10 min total; in-place upgrade typically <2 min downtime for a small DB (Supabase
  docs quote ~100MBps; our public schema is well under 100MB based on row counts as of 2026-04-19).
- **Current version (live):** `supabase-postgres-17.4.1.074`
- **Reference:** <https://supabase.com/docs/guides/platform/upgrading>
- **Direct link:**
  <https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/infrastructure>

#### Pre-flight (do these BEFORE clicking Upgrade)

1. **Confirm a maintenance window.** Pick the lowest-traffic hour. Tell the team in #ops or
   equivalent at least 30 min ahead. The web app's Sentry will fire a few "no DB connection" errors
   during cutover — that is expected.
2. **Snapshot a readiness checklist:**
   - Confirm CI is green on `main` (we want a rollback target).
   - Confirm there are no in-flight database migrations queued in the local `supabase/migrations`
     folder that have not yet been pushed.
   - Confirm `pg_dumpall` of `auth.users` and `public.profiles` row counts so you can spot-check
     after upgrade.
3. **Check for deprecated extensions** that block Postgres 17 in-place upgrades:
   - We currently have `postgis`, `vector`, `pg_trgm`, `pgcrypto`, `uuid-ossp` — all supported.
   - We do NOT have `plcoffee`, `plls`, `plv8`, `timescaledb`, or `pgjwt`. Confirm with:
     `SELECT extname FROM pg_extension;` via SQL editor.
4. **Logical replication slots:** confirm none are in use (we don't currently have any). Run:
   `SELECT slot_name FROM pg_replication_slots;` — must be empty. If non-empty, document and plan to
   recreate post-upgrade.
5. **`pg_cron` history:** `SELECT count(*) FROM cron.job_run_details;` — if very large (>100k),
   truncate before upgrade to keep the upgrade window short.

#### Procedure

1. Open **Settings → Infrastructure** in the dashboard (use the direct link above).
2. The **Upgrade project** card shows the current and target Postgres versions.
3. Read the **Caveats** section in the Supabase upgrade guide one more time.
4. Click **Upgrade project**. Confirm the modal.
5. The dashboard will show a progress bar. The DB is unreachable for the duration.
6. Wait for the success banner (or rollback message — see below).

#### Verification (immediately after upgrade)

1. **Version check:** open the SQL editor and run `SELECT version();`. The patch component must have
   advanced beyond `17.4.1.074`.
2. **Advisor re-check:** `get_advisors(type='security')` should no longer report
   `vulnerable_postgres_version`.
3. **Smoke tests against the web app preview:**
   - Sign in as a homeowner. Open `/dashboard`, `/jobs`, `/financials`. Each should load without
     error.
   - Sign in as a contractor. Open `/contractor/dashboard-enhanced`, `/contractor/jobs`. Each should
     load.
   - Trigger one bid creation and one notification dispatch. Confirm the row appears in
     `public.bids` and `public.notifications` respectively.
4. **Row-count parity:** compare `SELECT count(*) FROM auth.users;` and
   `SELECT count(*) FROM public.profiles;` against the pre-upgrade snapshot.
5. **Sentry error rate:** spot-check the next 15 minutes of Sentry — DB error rate should return to
   baseline.

#### Rollback

- **In-place upgrades auto-rollback on failure.** If the dashboard reports the upgrade failed, the
  original Postgres process is brought back online automatically — no manual action.
- If the upgrade succeeds but you find application-level issues, the upgrade is **one-way**. The
  fallback is to roll forward (apply a hotfix) rather than downgrade Postgres. Plan accordingly:
  ship with low-traffic timing so you have headroom.

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
