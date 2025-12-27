# Database Migration Consolidation Plan

**Created:** 2025-01-23
**Priority:** MEDIUM
**Risk Level:** HIGH (Potential data loss if not done carefully)

---

## Overview

The Mintenance database has **7 duplicate table definitions** across 143 migration files. These duplicates create schema drift, where different environments may have different column structures depending on migration execution order.

---

## Duplicate Tables Identified

1. **saved_jobs** (2 versions)
   - Migration 1: `20250131000004_add_saved_jobs_table.sql`
   - Migration 2: `20251204000001_add_job_tracking_tables.sql`
   - Difference: Migration 2 adds `notes` and `saved_at` columns

2. **confidence_calibration_data** (2 versions)
   - Locations: Multiple conformal prediction migrations

3. **hybrid_routing_decisions** (2 versions)
   - Locations: Multiple routing decision migrations

4. **job_guarantees** (2 versions)
   - Locations: Job system migrations

5. **job_views** (2 versions)
   - Locations: Job tracking migrations

6. **security_events** (2 versions)
   - Migration 1: `20251222_add_security_events_table.sql` (deleted)
   - Migration 2: `20251222000000_add_security_events_table.sql` (created)

7. **yolo_models** (2 versions)
   - Locations: Multiple ML migrations

---

## Consolidation Strategy

### Phase 1: Discovery & Documentation (SAFE)

**Goal:** Identify exact differences without touching production

**Steps:**
1. ✅ Export current production schema
   ```bash
   npx supabase db dump --schema public > production_schema.sql
   ```

2. ✅ Run migrations in clean local environment
   ```bash
   npx supabase db reset
   npx supabase db push
   ```

3. ✅ Compare schemas
   ```bash
   npx supabase db diff --linked > schema_differences.sql
   ```

4. ✅ Document all differences in spreadsheet
   - Table name
   - Column differences
   - Index differences
   - Constraint differences
   - RLS policy differences

---

### Phase 2: Create Canonical Schema (TEST LOCALLY)

**Goal:** Create single source of truth for each table

**Steps:**

1. **For each duplicate table:**
   - Determine which version is "correct" (usually the most recent/complete)
   - Create new migration file with canonical definition
   - Include ALL columns from ALL versions (superset approach)

2. **Example: saved_jobs consolidation**

   ```sql
   -- Migration: 20250123000002_consolidate_saved_jobs.sql

   -- Drop existing table (only safe in dev/staging)
   DROP TABLE IF EXISTS public.saved_jobs CASCADE;

   -- Create canonical version with ALL fields
   CREATE TABLE public.saved_jobs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
     contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- From v2
     notes TEXT,                                       -- From v2
     UNIQUE(job_id, contractor_id)
   );

   -- Indexes
   CREATE INDEX idx_saved_jobs_contractor ON public.saved_jobs(contractor_id);
   CREATE INDEX idx_saved_jobs_job ON public.saved_jobs(job_id);

   -- RLS
   ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Contractors can view their saved jobs"
     ON public.saved_jobs FOR SELECT
     USING (contractor_id = auth.uid());

   CREATE POLICY "Contractors can save jobs"
     ON public.saved_jobs FOR INSERT
     WITH CHECK (contractor_id = auth.uid());

   CREATE POLICY "Contractors can delete their saved jobs"
     ON public.saved_jobs FOR DELETE
     USING (contractor_id = auth.uid());
   ```

3. **Delete old migration files** (after testing)
   - Move to `migrations/_deprecated/` folder
   - Document which files were consolidated

---

### Phase 3: Data Migration (CRITICAL - DO NOT SKIP)

**Goal:** Preserve all existing data during consolidation

**Steps:**

1. **Before dropping tables, backup data:**
   ```sql
   -- Create backup tables
   CREATE TABLE saved_jobs_backup AS SELECT * FROM saved_jobs;
   CREATE TABLE confidence_calibration_data_backup AS SELECT * FROM confidence_calibration_data;
   -- etc.
   ```

2. **After creating canonical tables, restore data:**
   ```sql
   -- Restore with column mapping
   INSERT INTO saved_jobs (id, job_id, contractor_id, created_at, notes)
   SELECT
     id,
     job_id,
     contractor_id,
     created_at,
     NULL as notes  -- New column, default to NULL
   FROM saved_jobs_backup;
   ```

3. **Verify data integrity:**
   ```sql
   -- Check row counts match
   SELECT
     (SELECT COUNT(*) FROM saved_jobs_backup) as backup_count,
     (SELECT COUNT(*) FROM saved_jobs) as current_count;
   ```

---

### Phase 4: Application Code Updates (REQUIRED)

**Goal:** Update queries to use new column names

**Files to check:**
- `apps/web/app/api/**/*.ts` - API routes using these tables
- `apps/mobile/src/services/**/*.ts` - Mobile services
- Any TypeScript types referencing these tables

**Example changes needed for saved_jobs:**

```typescript
// OLD: created_at only
const { data } = await supabase
  .from('saved_jobs')
  .select('id, job_id, created_at')
  .eq('contractor_id', userId);

// NEW: Use saved_at (new column) with fallback
const { data } = await supabase
  .from('saved_jobs')
  .select('id, job_id, saved_at, notes')
  .eq('contractor_id', userId);
```

---

### Phase 5: Testing (MANDATORY)

**Checklist:**

- [ ] Run all migrations in clean local environment
- [ ] Verify all tables created successfully
- [ ] Check all indexes exist
- [ ] Verify RLS policies applied
- [ ] Run application test suite
- [ ] Test affected features manually:
  - Contractor saving jobs
  - YOLO model predictions
  - Job view tracking
  - Security event logging
- [ ] Load test with production-like data volume
- [ ] Verify no orphaned foreign keys
- [ ] Check application logs for errors

---

### Phase 6: Deployment (PRODUCTION)

**Pre-deployment:**
1. ✅ Full database backup
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. ✅ Maintenance mode (optional but recommended)
   - Put site in read-only mode
   - Prevents data writes during migration

**Deployment:**
```bash
# 1. Apply consolidation migrations
npx supabase db push

# 2. Verify success
npx supabase db diff --linked
# Should show no differences

# 3. Monitor application logs
# Check for errors related to missing columns/tables

# 4. If errors occur:
# Rollback plan: Restore from backup
psql $DATABASE_URL < backup_[timestamp].sql
```

**Post-deployment:**
- Monitor error logs for 24 hours
- Check application metrics (error rates, response times)
- Verify critical user flows work
- Remove backup tables after 7 days if no issues

---

## Risk Mitigation

### Critical Risks:

1. **Data Loss**
   - Mitigation: Full backup before starting
   - Rollback: Restore from backup
   - Testing: Verify row counts match after migration

2. **Downtime**
   - Mitigation: Consolidation can be done with zero downtime if:
     - Old columns kept temporarily
     - Application updated to use new columns
     - Old columns removed in later migration
   - Fallback: Maintenance window during low-traffic hours

3. **Application Errors**
   - Mitigation: Update application code before deploying migration
   - Testing: Comprehensive test suite execution
   - Rollback: Deploy previous application version

4. **Foreign Key Violations**
   - Mitigation: Check all foreign key relationships before migration
   - Testing: Verify cascade behavior in staging
   - Fix: Manual data cleanup if violations found

---

## Timeline Estimate

- **Phase 1 (Discovery):** 1 day
- **Phase 2 (Canonical Schema):** 2 days
- **Phase 3 (Data Migration):** 1 day
- **Phase 4 (Code Updates):** 2 days
- **Phase 5 (Testing):** 2 days
- **Phase 6 (Deployment):** 1 day

**Total:** 9 days (2 sprint weeks with buffer)

---

## Success Criteria

- [ ] All 7 duplicate tables consolidated to single definitions
- [ ] Zero data loss (verified by row count comparisons)
- [ ] All existing features continue to work
- [ ] Application error rate unchanged
- [ ] Schema matches across all environments (dev, staging, prod)
- [ ] Migration files reduced from 143 to <100

---

## Future Prevention

1. **Add migration linter** to CI/CD
   - Check for duplicate CREATE TABLE statements
   - Warn if table already exists in previous migration

2. **Schema documentation**
   - Auto-generate schema docs from migrations
   - Require PR review for all migration files

3. **Migration testing**
   - Run migrations in clean environment in CI
   - Verify idempotency (migrations can run twice safely)

---

## Additional Notes

- **DO NOT start this work without:**
  - Full production database backup
  - Approval from senior developer
  - Dedicated time block (no interruptions)
  - Rollback plan documented

- **Test in this order:**
  1. Local development
  2. Staging environment
  3. Production (with backup)

- **Keep backups for:**
  - At least 30 days
  - Until next major release
  - Verify backups are actually restorable
