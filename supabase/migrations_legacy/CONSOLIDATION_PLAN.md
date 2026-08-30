# Supabase Migration Consolidation Plan

**Date**: 2026-03-17
**Author**: Database Architect
**Status**: PLAN ONLY -- Do NOT execute without team review

---

## Current State

### Active Migrations (in `supabase/migrations/`)

| Range | Count | Description |
|-------|-------|-------------|
| `001_` - `009_` | 7 | Legacy numbered migrations (core tables, jobs, payments, security, ML/AI, meetings, social removal, location tracking, missing core) |
| `20250107_` | 1 | Feature flags (Jan 2025) |
| `20260109_` - `20260317_` | ~95 | Timestamped migrations (Jan 2026 - Mar 2026) |
| **Total active** | **~103** | Excludes `VERIFY_RLS_POLICIES.sql` and `README_NON_SUPABASE_SQL.md` |

### Archived Migrations (in `migrations_old_temp/`)

| Range | Description |
|-------|-------------|
| `20241208_` - `20251121_` | ~91 files, moved aside during earlier consolidation |

### Non-Migration Files (in `supabase/migrations/`)

- `VERIFY_RLS_POLICIES.sql` -- utility script, not a migration
- `README_NON_SUPABASE_SQL.md` -- documentation
- `migrations_old_temp/` -- archived migrations directory (~91 files)

### Key Observations

1. **Naming inconsistency**: The first 7 migrations use `001_` - `009_` (sequential) while all later ones use `YYYYMMDD` timestamps. This means Supabase CLI sorts them incorrectly (`001_core_tables.sql` sorts before `20250107_feature_flags.sql` alphabetically, which is correct, but only by coincidence of `0` < `2`).

2. **High churn area**: The period from 2026-02-06 to 2026-02-16 contains ~35 migrations (many small fixes, RLS tightening, schema patches). These represent iterative development that has since stabilized.

3. **Duplicate function definitions**: `update_updated_at()` and `update_updated_at_column()` are defined in multiple migrations (`006_meeting_system.sql`, `20250107_feature_flags.sql`, `20260206004000_updated_at_trigger.sql`, `20260214200000_landlord_agency_features.sql`). The last definition wins at runtime, but this creates confusion.

4. **Redundant migrations**: Several migrations add columns or indexes that later migrations alter again. For example, jobs status CHECK constraints were modified at least twice.

5. **Prior partial consolidation**: The `migrations_old_temp/` directory shows a previous consolidation was started but not completed -- the old migrations were moved but never squashed into a baseline.

---

## Recommended Approach: Squash to Baseline

### Strategy

Squash all migrations **before a cutoff date** into a single baseline migration that represents the current schema state. Keep recent migrations (after the cutoff) as individual files for auditability.

### Recommended Cutoff Date: **2026-03-01**

**Why this date:**
- All major schema stabilization work (Feb 2026 audit) is complete
- The VLM, pathology, and contractor features landed before this date
- Only ~12 migrations exist after this date (manageable, recent, auditable)
- The March migrations are active development -- easier to reason about individually

### Migration Breakdown After Squash

| Component | Files | Action |
|-----------|-------|--------|
| `001_` through `20260227_` | ~91 files | Squash into `00000000000000_baseline.sql` |
| `20260301_` through `20260317_` | ~12 files | Keep as-is |
| `migrations_old_temp/` | ~91 files | Delete entirely (already archived, superseded by active set) |
| `VERIFY_RLS_POLICIES.sql` | 1 file | Move to `supabase/scripts/` (not a migration) |

---

## Execution Steps

### Prerequisites

- [ ] Ensure local Supabase instance is running and fully migrated
- [ ] Ensure production database is backed up
- [ ] Ensure all team members have committed and pushed migration work
- [ ] No in-flight PRs that add new migrations before the cutoff date

### Step 1: Dump the Current Schema (Source of Truth)

```bash
# Dump the full schema from the local Supabase instance
# This captures the cumulative result of ALL migrations
npx supabase db dump --local -f supabase/baseline_schema.sql

# Alternatively, if remote is the source of truth:
npx supabase db dump -f supabase/baseline_schema.sql
```

**Verify the dump includes:**
- [ ] All CREATE TABLE statements
- [ ] All indexes
- [ ] All RLS policies
- [ ] All functions and triggers
- [ ] All CHECK constraints
- [ ] All extensions (uuid-ossp, pgcrypto, etc.)

### Step 2: Clean the Baseline Dump

The raw `pg_dump` output will contain system artifacts. Clean it:

1. Remove references to `supabase_admin`, `supabase_auth_admin`, etc. (Supabase manages these)
2. Remove `auth.*` and `storage.*` schema objects (managed by Supabase)
3. Remove `pg_catalog` and `information_schema` references
4. Keep only `public.*` schema objects and extensions
5. Ensure all `CREATE TABLE` use `IF NOT EXISTS` for safety
6. Ensure all `CREATE INDEX` use `IF NOT EXISTS`
7. Ensure all `CREATE POLICY` use `DROP POLICY IF EXISTS` before creation

### Step 3: Create the Baseline Migration

```bash
# Create the baseline migration file with a timestamp that sorts BEFORE all others
# Using all zeros ensures it runs first
mv supabase/baseline_schema.sql supabase/migrations/00000000000000_baseline.sql
```

### Step 4: Archive Old Migrations

```bash
# Create archive directory
mkdir -p supabase/migrations_archive/pre_2026_03_01

# Move all pre-cutoff migrations
mv supabase/migrations/001_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/002_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/003_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/004_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/005_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/006_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/007_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/008_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/009_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/20250107_*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/202601*.sql supabase/migrations_archive/pre_2026_03_01/
mv supabase/migrations/202602*.sql supabase/migrations_archive/pre_2026_03_01/

# Delete the old temp archive (fully superseded)
rm -rf supabase/migrations/migrations_old_temp/

# Move utility files out of migrations
mkdir -p supabase/scripts
mv supabase/migrations/VERIFY_RLS_POLICIES.sql supabase/scripts/
```

### Step 5: Update Supabase Migration History

The `supabase_migrations.schema_migrations` table tracks which migrations have been applied. After squashing, this table must be updated so Supabase does not try to re-run old migrations or skip the baseline.

**For local development (reset approach):**
```bash
# Reset local DB and replay from baseline + remaining migrations
npx supabase db reset
```

**For production/staging (history rewrite approach):**
```sql
-- DANGER: Only run this on production AFTER verifying the baseline matches
-- the current production schema exactly.

BEGIN;

-- Clear old migration history
DELETE FROM supabase_migrations.schema_migrations
WHERE version < '20260301000000';

-- Insert baseline as "already applied"
INSERT INTO supabase_migrations.schema_migrations (version, name, statements_applied)
VALUES ('00000000000000', 'baseline', 0);

COMMIT;
```

### Step 6: Verify

```bash
# Local verification
npx supabase db reset        # Should apply baseline + 12 post-cutoff migrations cleanly
npx supabase db diff --local # Should show NO diff (schema matches)

# Compare table counts
# Expected: 334+ tables with RLS, 806+ policies (from CLAUDE.md audit)
```

### Step 7: Update CI/CD

- Update any CI scripts that reference specific migration filenames
- Update seed scripts if they depend on migration order
- Update documentation references

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Baseline schema does not match production** | CRITICAL | Run `npx supabase db diff` against production BEFORE applying. Any diff = STOP. |
| **Lost migration history breaks `supabase db push`** | HIGH | Step 5 rewrites the migration history table. Test on staging first. |
| **Post-cutoff migrations assume pre-cutoff state** | MEDIUM | The baseline captures the full cumulative state, so post-cutoff migrations should apply cleanly on top. Verify with `db reset`. |
| **Supabase CLI version incompatibility** | LOW | Test with the exact CLI version used in production. Pin version in `package.json`. |
| **Team members with local branches adding pre-cutoff migrations** | MEDIUM | Coordinate via Slack/standup. Set a freeze date. Any in-flight PRs must rebase after consolidation. |
| **Storage bucket/auth config not captured by pg_dump** | LOW | These are managed by Supabase project settings, not migrations. Verify separately that `supabase/config.toml` has correct bucket definitions. |
| **Generated columns (like `requires_1099`) may not dump correctly** | LOW | Verify the baseline SQL includes `GENERATED ALWAYS AS` clauses. pg_dump handles these in PostgreSQL 12+. |

---

## Post-Consolidation State

After executing this plan, the `supabase/migrations/` directory will contain:

```
supabase/migrations/
  00000000000000_baseline.sql              <-- Full schema (replaces ~91 files)
  20260301000000_add_vlm_distillation_job_type.sql
  20260301000001_vlm_buffer_reasoning_and_corrections.sql
  20260303000000_building_pathology_embeddings.sql
  20260303000002_add_contractor_clients.sql
  20260303000003_add_invoices_and_expenses.sql
  20260303000004_fix_appointments_client_index.sql
  20260304000001_fix_reporting_escrow_indexes.sql
  20260304200000_homeowner_subscriptions_rls_policies.sql
  20260304230000_compliance_reminder_tracking.sql
  20260304230100_agency_activity_log.sql
  20260305110000_increase_early_access_cohort_to_100.sql
  20260305200000_property_room_photos.sql
  20260307000001_fix_messages_type_constraint.sql
  20260307100000_audit_critical_fixes.sql
  20260307200000_week3_week4_fixes.sql
  20260316190000_create_time_entries.sql
  20260316193000_add_missing_bids_columns.sql
  20260317100000_fix_job_storage_bucket_permissions.sql
  20260317100100_add_not_null_jobs_homeowner_id.sql
  20260317200000_tax_compliance_schema.sql
  CONSOLIDATION_PLAN.md                    <-- This file
  README_NON_SUPABASE_SQL.md
```

**Total: 1 baseline + ~19 incremental = ~20 migration files** (down from ~103)

---

## Timeline

| Day | Action | Owner |
|-----|--------|-------|
| Day 1 | Review this plan with team | All |
| Day 1 | Freeze new migrations | All |
| Day 2 | Dump baseline from production | DBA |
| Day 2 | Clean and verify baseline | DBA |
| Day 2 | Test on fresh local instance (`db reset`) | DBA |
| Day 3 | Test on staging environment | DBA + QA |
| Day 3 | Verify all API routes work against new schema | QA |
| Day 4 | Execute on production (during maintenance window) | DBA |
| Day 4 | Unfreeze migrations | All |

---

## Decision Record

This plan was created because:
- 103 active migrations make `npx supabase db reset` slow (~2-3 minutes)
- Duplicate function definitions create confusion about which version is active
- Prior partial consolidation (`migrations_old_temp/`) was never completed
- New developers cannot easily understand the schema evolution
- Several migrations are fix-on-fix (e.g., multiple jobs status CHECK changes)

The cutoff date of 2026-03-01 was chosen because the February 2026 audit session stabilized the schema significantly, making everything before that date historical rather than actively evolving.
