# SQL Brought Into Supabase

## Applied via MCP (Supabase MCP `apply_migration`)

- **Service areas** – Tables `service_areas`, `service_area_coverage`, `area_landmarks`, `service_routes`, `area_performance` were applied to your project `ukrjudtlvapiajkjbcrd`. RLS policies for these tables already existed (no second migration needed).

## Added to `supabase/migrations/` (run with `supabase db push` or Dashboard)

- **20260131000001_from_root_migrations_geography.sql** – PostGIS columns and helpers for `service_areas` (from root `migrations/002_geography.sql`).

## Root SQL Not Yet in Supabase

These live **outside** `supabase/migrations/` and were **not** pushed via MCP because they assume a different schema (e.g. `users` instead of `profiles`) or missing functions. Before applying, update references and add any missing objects.

| Location | File | Notes |
|----------|------|--------|
| `migrations/` | 001_profiles.sql | Uses `profiles` + `handle_new_user`; may overlap with supabase 001_core_tables. |
| `migrations/` | 003_jobs_photos_backfill.sql | Backfill script; run after schema is stable. |
| `migrations/` | 004_updated_at_trigger.sql | Needs `update_updated_at_column()` or equivalent. |
| `migrations/` | 005_retention_policies.sql | Review and apply if needed. |
| `migrations/` | 006_secret_encryption.sql | Review and apply if needed. |
| `migrations/` | 007_rls_tightening.sql | Review and apply if needed. |
| `migrations/` | 008_constraints.sql | Review and apply if needed. |
| Root | app-integrations-schema.sql | References `users(id)` → change to `profiles(id)` or `auth.users(id)`. |
| Root | production-database-extensions.sql | References `public.users` → change to `public.profiles`. |
| Root | email-templates-schema.sql | Uses `auth.users(id)` and `jobs(id)`; needs `update_updated_at()` if used. |
| Root | job-sheets-schema.sql | References `users(id)` → change to `profiles(id)` or `auth.users(id)`. |
| Root | contractor-*.sql, homeowner-features-schema.sql, etc. | Same idea: align table/column names with current schema before applying. |

## Quick reference

- **Already applied to DB via MCP:** service area tables (and RLS).
- **In repo under supabase/migrations:** geography migration; apply when you run migrations.
- **Still only in root / root migrations:** everything in the table above; fix schema then copy into `supabase/migrations/` or run manually.
