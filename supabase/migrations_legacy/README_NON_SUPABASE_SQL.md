# SQL Brought Into Supabase

## 🔗 Connect With Us

- **Website**: https://mintenance.co.uk
- **GitHub**: https://github.com/Mintenance-LTD/mintenance
- **LinkedIn**: [Mintenance](https://linkedin.com/company/mintenance)
- **Twitter**: [@MintenanceUK](https://twitter.com/MintenanceUK)

## Applied via MCP (Supabase MCP `apply_migration`)

- **Service areas** – Tables `service_areas`, `service_area_coverage`, `area_landmarks`, `service_routes`, `area_performance` were applied to your project `YOUR_PROJECT_REF`. RLS policies for these tables already existed (no second migration needed).
- **security_definer_and_constraints** – SECURITY DEFINER `search_path` hardening for `purge_old_email_history`, `purge_old_quote_interactions`, `set_user_integration_secret`, `get_user_integration_secret`, `create_meeting_status_update`; plus NOT NULL and CHECK constraints on `jobs`, `bids`, `payments`, `companies`. Applied 2026-02-08.
- **core_rls_policies_schema_aligned** – Core RLS for profiles, companies, addresses, jobs, bids, saved_jobs (contractor_id), job_views (contractor_id), job_milestones (job_id), job_guarantees (contractor_id/homeowner_id), payments, payment_methods, escrow_accounts, security_events, audit_logs, ML/AI tables. Local file `20260206009000_core_rls_policies.sql` was updated to match remote schema (saved_jobs/job_views/job_milestones/job_guarantees column names). Applied 2026-02-08.

## Added to `supabase/migrations/` (run with `supabase db push` or Dashboard)

- **20260131000001_from_root_migrations_geography.sql** – PostGIS columns and helpers for `service_areas` (from root `migrations/002_geography.sql`).
- **20260206001000_service_areas.sql** – Service area schema (from root `migrations/000_service_areas.sql`, aligned to profiles).
- **20260206002000_profiles_trigger.sql** – Auth trigger + `v_users` view (from root `migrations/001_profiles.sql`, aligned to profiles).
- **20260206003000_jobs_photos_backfill.sql** – Jobs photos backfill (from root `migrations/003_jobs_photos_backfill.sql`).
- **20260206004000_updated_at_trigger.sql** – Standardized `update_updated_at()` trigger (from root `migrations/004_updated_at_trigger.sql`).
- **20260206005000_retention_policies.sql** – Retention helpers (from root `migrations/005_retention_policies.sql`).
- **20260206006000_secret_encryption.sql** – Secret encryption helpers (from root `migrations/006_secret_encryption.sql`).
- **20260206007000_rls_tightening.sql** – RLS tightening policies (from root `migrations/007_rls_tightening.sql`).
- **20260206008000_constraints.sql** – Additional constraints (from root `migrations/008_constraints.sql`).

## Root SQL Not Yet in Supabase

These live **outside** `supabase/migrations/` and were **not** pushed via MCP because they assume a different schema (e.g. `users` instead of `profiles`) or missing functions. Before applying, update references and add any missing objects.

| Location | File | Notes |
|----------|------|--------|
| Root | app-integrations-schema.sql | References `users(id)` → change to `profiles(id)` or `auth.users(id)`. |
| Root | production-database-extensions.sql | References `public.users` → change to `public.profiles`. |
| Root | email-templates-schema.sql | Uses `auth.users(id)` and `jobs(id)`; needs `update_updated_at()` if used. |
| Root | job-sheets-schema.sql | References `users(id)` → change to `profiles(id)` or `auth.users(id)`. |
| Root | contractor-*.sql, homeowner-features-schema.sql, etc. | Same idea: align table/column names with current schema before applying. |

## Quick reference

- **Already applied to DB via MCP:** service area tables (and RLS).
- **In repo under supabase/migrations:** service areas, profiles trigger, jobs photos, updated_at, retention, encryption, RLS tightening, constraints, and geography migration.
- **Still only in root:** items listed above; fix schema then copy into `supabase/migrations/` or run manually.
