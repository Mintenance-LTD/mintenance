# Mintenance Database Architecture Analysis
**Date:** 2025-12-21
**Analyst:** Database Architect Agent
**Scope:** Complete database schema, RLS policies, indexes, and query patterns
**Migration Count:** 141 migrations analyzed
**Tables Analyzed:** 80+ tables

---

## Executive Summary

The Mintenance database is a complex, feature-rich PostgreSQL schema built on Supabase with comprehensive Row Level Security (RLS), well-indexed tables, and atomic operations for critical business logic. The architecture supports a multi-tenant platform with three user types (homeowners, contractors, admins) and includes advanced features like AI/ML integration, real-time subscriptions, escrow payments, and social networking.

### Key Strengths
- **Comprehensive RLS coverage**: 713 policies across 80 tables
- **Race condition prevention**: Atomic functions for bid acceptance
- **Performance optimization**: 549 CREATE TABLE/ALTER statements with strategic indexing
- **Multi-tenant isolation**: Proper tenant-aware security policies
- **Admin override patterns**: Secure admin access with `is_admin()` helper
- **Audit trails**: Extensive logging and status tracking

### Critical Findings
1. **Schema complexity**: 80+ tables may benefit from consolidation
2. **Missing cascade configurations**: Some foreign keys need CASCADE review
3. **Index coverage**: Good but some N+1 query risks in complex joins
4. **Data type consistency**: Some JSONB usage could be normalized
5. **Migration debt**: 141 migrations suggest possible consolidation opportunity

---

## 1. Schema Review

### 1.1 Core Tables Overview

#### **Users & Authentication**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `users` | Core user profiles (homeowners, contractors, admins) | id, email, role, stripe_customer_id, admin_verified | ✅ |
| `refresh_tokens` | JWT refresh token management with family tracking | user_id, token_hash, family_id, revoked_at | ✅ |
| `user_preferences` | User settings and preferences | user_id, theme, language, notifications | ✅ |
| `properties` | Homeowner property management | owner_id, address, property_type, photos | ✅ |

**Issues Identified:**
- `users` table has grown to 40+ columns (subscription_status, trial_ends_at, company_license, etc.)
- **Recommendation**: Consider extracting contractor-specific fields to `contractor_profiles` table

#### **Jobs & Contracts**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `jobs` | Core job postings | homeowner_id, contractor_id, status, budget, required_skills | ✅ |
| `bids` | Contractor bids on jobs | job_id, contractor_id, bid_amount, status | ✅ |
| `contracts` | Legal agreements | job_id, contractor_id, homeowner_id, terms (JSONB), status | ✅ |
| `job_photos_metadata` | Photo verification with geolocation | job_id, photo_url, geolocation, quality_score | ✅ |

**Foreign Key Analysis:**
```sql
-- Good: Cascade deletes prevent orphans
jobs.homeowner_id → users.id ON DELETE CASCADE ✅
bids.job_id → jobs.id ON DELETE CASCADE ✅
contracts.job_id → jobs.id ON DELETE CASCADE ✅

-- Review: SET NULL may leave orphaned data
contractor_invoices.job_id → jobs.id ON DELETE SET NULL ⚠️
payments.job_id → jobs.id ON DELETE SET NULL ⚠️
```

**Recommendation**: Audit SET NULL constraints to determine if CASCADE is more appropriate.

#### **Payments & Escrow**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `escrow_transactions` | Escrow holdings with admin controls | job_id, payer_id, payee_id, status, admin_hold_status, trust_score | ✅ |
| `contractor_payout_accounts` | Stripe Connect accounts | contractor_id, stripe_account_id | ✅ |
| `payments` | Payment tracking | payer_id, payee_id, stripe_payment_intent_id, status | ✅ |
| `payment_tracking` | Revenue analytics | payment_type, contractor_id, platform_fee, stripe_fee | ✅ |

**Escrow System Complexity:**
- 15+ columns added for trust scoring, photo verification, and admin holds
- Status tracking: `pending`, `held`, `released`, `admin_hold`, `cooling_off`, etc.
- Comprehensive: homeowner approval, auto-approval dates, dispute windows

**Data Integrity Issues:**
- No CHECK constraint to ensure `payer_id != payee_id` in `escrow_transactions` ⚠️
- `auto_approval_date` has no trigger to automatically approve after 7 days ⚠️

#### **Contractor Features**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `contractor_quotes` | Quote management | contractor_id, client_email, line_items (JSONB), status | ✅ |
| `contractor_invoices` | Invoice tracking | contractor_id, job_id, invoice_number, status | ✅ |
| `contractor_posts` | Portfolio & social posts | contractor_id, post_type, media_urls, likes_count | ✅ |
| `contractor_skills` | Skills & certifications | contractor_id, skill_name, proficiency_level, is_verified | ✅ |
| `reviews` | Contractor ratings | contractor_id, reviewer_id, rating, job_id | ✅ |
| `service_areas` | Geographic coverage | contractor_id, city, state, service_radius, lat/lng | ✅ |
| `connections` | Professional networking | user_id, connected_user_id, connection_type, status | ✅ |

**JSONB Usage Review:**
- `line_items` in quotes/invoices: Appropriate for flexible pricing structures ✅
- `certifications` in contractor_skills: Could be normalized to separate table ⚠️
- `metadata` fields: Generally underutilized, consider removing ⚠️

#### **Subscriptions**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `contractor_subscriptions` | Stripe subscriptions | contractor_id, stripe_subscription_id, plan_type, status | ✅ |
| `subscription_features` | Plan limits | plan_type, max_jobs, max_active_jobs, priority_support | ✅ |
| `payment_tracking` | Revenue tracking | payment_type, contractor_id, amount, net_revenue | ✅ |

**Unique Constraint:**
```sql
-- Ensures one active subscription per contractor
CREATE UNIQUE INDEX idx_contractor_subscriptions_active_contractor
  ON contractor_subscriptions(contractor_id)
  WHERE status IN ('trial', 'active');
```
✅ Well designed to prevent multiple active subscriptions

#### **AI/ML System**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `building_assessments` | AI property assessments | user_id, property_details, ai_generated_report, confidence_score | ✅ |
| `yolo_models` | Computer vision models | model_version, storage_path, accuracy_metrics | ✅ |
| `yolo_corrections` | User feedback for retraining | user_id, original_prediction, corrected_label | ✅ |
| `ab_test_experiments` | Model A/B testing | experiment_name, control_model_id, variant_model_id | ✅ |
| `model_drift_metrics` | Performance monitoring | model_id, accuracy, precision, recall | ✅ |
| `training_datasets` | ML training data | dataset_name, image_count, storage_path | ✅ |

**Observations:**
- Comprehensive ML pipeline with feedback loops ✅
- Missing: Data retention policies for old models ⚠️
- Missing: Automated model archival triggers ⚠️

#### **LinkedIn-Style Social Features**
| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|-----------|-------------|
| `companies` | Company profiles | company_name, industry, employee_count | ✅ |
| `company_followers` | Follow relationships | company_id, user_id | ✅ |
| `articles` | Content publishing | author_id, title, content, view_count | ✅ |
| `article_reactions` | Engagement tracking | article_id, user_id, reaction_type | ✅ |
| `groups` | Professional groups | group_name, description, privacy_level | ✅ |
| `group_members` | Group membership | group_id, user_id, role | ✅ |

**Data Model Concerns:**
- LinkedIn features may be scope creep for a maintenance platform ⚠️
- Increases complexity without clear business value ⚠️
- **Recommendation**: Consider deprecating or moving to separate service

### 1.2 Data Type Appropriateness

| Type Usage | Count | Assessment |
|------------|-------|------------|
| UUID for primary keys | 100% | ✅ Excellent for distributed systems |
| TIMESTAMP WITH TIME ZONE | 95%+ | ✅ Proper timezone handling |
| DECIMAL for money | 100% | ✅ No floating point errors |
| JSONB for flexible data | 30+ tables | ⚠️ Some overuse, consider normalization |
| TEXT[] arrays | 15+ tables | ⚠️ Consider many-to-many tables instead |
| Geography/Geometry | Minimal | ❌ Missing PostGIS for location features |

**Critical Issue: Location Data**
```sql
-- Current approach in service_areas
latitude DECIMAL(10, 8)
longitude DECIMAL(11, 8)

-- Recommended: Use PostGIS
location GEOGRAPHY(POINT, 4326)
```
This enables efficient spatial queries with GiST indexes.

### 1.3 Missing Tables / Gaps

1. **Audit Log Table**: No centralized audit trail for admin actions
2. **Email Queue**: Email sending relies on external service without local queue
3. **Job Categories**: Categories stored as TEXT instead of normalized table
4. **Skills Taxonomy**: Skills are free-text instead of standardized taxonomy
5. **Notification History**: Real-time notifications lack persistent storage

---

## 2. Row Level Security (RLS) Analysis

### 2.1 Policy Coverage

**Statistics:**
- Tables with RLS enabled: **80+**
- Total policies created: **713**
- Policy types:
  - SELECT: ~200 policies
  - INSERT: ~150 policies
  - UPDATE: ~150 policies
  - DELETE: ~100 policies
  - FOR ALL: ~113 policies

### 2.2 Helper Functions for Maintainability

```sql
-- Excellent pattern: Centralized admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  );
$$;
```

**Benefits:**
- Single source of truth for admin logic
- Easy to audit and update
- SECURITY DEFINER prevents RLS bypass

### 2.3 Multi-Tenant Isolation Examples

#### Users Table
```sql
-- Users can only see their own profile
CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());
```
✅ Strong tenant isolation with admin override

#### Jobs Table
```sql
-- Posted jobs are public, assigned jobs are private
CREATE POLICY jobs_select_policy
ON public.jobs
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = homeowner_id
  OR auth.uid() = contractor_id
  OR status = 'posted'
);
```
✅ Balances discovery with privacy

#### Bids Table
```sql
-- Job owners can see all bids, contractors see only their own
CREATE POLICY bids_select_policy
ON public.bids
FOR SELECT
USING (
  public.is_admin()
  OR auth.uid() = contractor_id
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND auth.uid() = j.homeowner_id
  )
);
```
✅ Complex but correct - prevents bid snooping

### 2.4 Identified RLS Issues

#### Issue 1: Contractor Posts Public Access
```sql
-- Current: Anyone can view public posts
CREATE POLICY "Anyone can view public posts" ON contractor_posts
  FOR SELECT USING (is_public = true);
```
**Concern:** No authentication required for SELECT on public posts
**Recommendation:** Add `TO authenticated` to prevent anonymous scraping

#### Issue 2: Payment Tracking Service Role Override
```sql
CREATE POLICY "Service role can manage payment tracking"
  ON public.payment_tracking
  FOR ALL
  USING (true);
```
**Concern:** Service role has unrestricted access without logging
**Recommendation:** Add audit trigger for service role operations

#### Issue 3: Missing DELETE Policies
Several tables have INSERT/UPDATE/SELECT but no DELETE policy:
- `job_photos_metadata`
- `homeowner_approval_history`
- `contractor_trust_scores`

**Recommendation:** Explicitly add DELETE policies (even if denying all deletes)

### 2.5 Admin Access Patterns

**Well-Implemented:**
```sql
-- Admins can view all payment tracking
CREATE POLICY "Admins can view all payment tracking"
  ON public.payment_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

**Audit Gap:**
- Admin actions are not logged at the database level
- **Recommendation:** Add audit triggers for admin operations

---

## 3. Data Integrity

### 3.1 Foreign Key Cascade Configuration

#### Well-Configured Cascades ✅
```sql
bids(job_id) → jobs(id) ON DELETE CASCADE
contractor_posts(contractor_id) → users(id) ON DELETE CASCADE
connections(user_id) → users(id) ON DELETE CASCADE
escrow_transactions(job_id) → jobs(id) ON DELETE CASCADE
```

#### Potential Orphan Risk ⚠️
```sql
contractor_invoices(job_id) → jobs(id) ON DELETE SET NULL
payments(job_id) → jobs(id) ON DELETE SET NULL
reviews(job_id) → jobs(id) ON DELETE SET NULL
```

**Analysis:**
- SET NULL appropriate if historical records must be preserved
- However, requires application logic to handle null job references
- **Recommendation:** Add CHECK constraints to prevent invalid states

### 3.2 Required Fields and Defaults

**Good Practices:**
```sql
-- All timestamps have defaults
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- Money fields prevent negatives
CHECK (amount >= 0)
CHECK (budget > 0)

-- Status enums via CHECK constraints
CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected'))
```

**Missing Validations:**
- No email format validation in `users.email` ⚠️
- No phone number format validation ⚠️
- No ZIP code format validation in `service_areas` ⚠️

### 3.3 Enum/Check Constraints

**Comprehensive Enum Coverage:**
- Job status: 'draft', 'posted', 'assigned', 'in_progress', 'completed', 'cancelled'
- Bid status: 'pending', 'accepted', 'rejected', 'withdrawn'
- Payment status: 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
- Subscription status: 'trial', 'active', 'past_due', 'canceled', 'expired'

**Inconsistency Found:**
- Some tables use VARCHAR(50) for status without CHECK constraint ⚠️
- **Recommendation:** Audit all status columns for enum enforcement

### 3.4 Unique Constraints

**Critical Business Logic Constraints:**

```sql
-- Prevent duplicate bids
UNIQUE(job_id, contractor_id) ON bids ✅

-- Prevent duplicate reviews
UNIQUE(job_id, reviewer_id) ON reviews ✅

-- Prevent one accepted bid per job (race condition prevention)
CREATE UNIQUE INDEX idx_bids_one_accepted_per_job
ON bids(job_id) WHERE status = 'accepted'; ✅

-- One contract per job
UNIQUE(job_id) ON contracts ✅

-- One active subscription per contractor
CREATE UNIQUE INDEX idx_contractor_subscriptions_active_contractor
ON contractor_subscriptions(contractor_id)
WHERE status IN ('trial', 'active'); ✅
```

**Missing Uniqueness:**
- No constraint preventing duplicate service_areas for same contractor + location
- **Recommendation:** Add UNIQUE(contractor_id, city, state) - ALREADY EXISTS ✅

---

## 4. Indexing Strategy

### 4.1 Index Coverage Assessment

**Foreign Keys (Excellent Coverage):**
```sql
CREATE INDEX idx_jobs_homeowner_id ON jobs(homeowner_id);
CREATE INDEX idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX idx_bids_job_id ON bids(job_id);
CREATE INDEX idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
```
✅ All foreign keys are indexed

**Composite Indexes for Common Queries:**
```sql
-- Job discovery
CREATE INDEX idx_jobs_status_created
ON jobs(status, created_at DESC)
WHERE status IN ('posted', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Active jobs
CREATE INDEX idx_jobs_active ON jobs(created_at DESC)
WHERE status IN ('posted', 'assigned');

-- Contractor trust scoring
CREATE INDEX idx_contractor_trust_scores_score
ON contractor_trust_scores(trust_score DESC);
```
✅ Strategic partial indexes reduce index size

**Concurrent Index Creation:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status
  ON jobs(status);
```
✅ Prevents table locking during index creation

### 4.2 Missing Indexes (N+1 Risks)

#### Query Pattern Analysis from Code

**From `airbnb-optimized.ts`:**
```typescript
// N+1 risk: Getting skills for contractors
const { data: skills } = await supabase
  .from('contractor_skills')
  .select('*')
  .in('contractor_id', contractorIds); // ✅ Already indexed
```

**Potential N+1 Patterns:**
1. **Bid count per job**: `SELECT COUNT(*) FROM bids WHERE job_id = ?`
   - ✅ `idx_bids_job_id` exists
2. **Review count per contractor**: `SELECT COUNT(*) FROM reviews WHERE contractor_id = ?`
   - ✅ `idx_reviews_contractor_id` exists
3. **Message threads**: `SELECT * FROM messages WHERE job_id = ? ORDER BY created_at`
   - ✅ `idx_messages_job_id` + `idx_messages_created_at` exist

**Recommendation:** Index coverage is excellent ✅

### 4.3 Full-Text Search

**Missing Full-Text Indexes:**
- No `to_tsvector` index on `jobs.title` or `jobs.description` ❌
- No full-text search on `articles.content` ❌

**Recommendation:**
```sql
-- Add GIN index for full-text search
CREATE INDEX idx_jobs_search ON jobs
USING GIN(to_tsvector('english', title || ' ' || description));

-- Enable fast job search
SELECT * FROM jobs
WHERE to_tsvector('english', title || ' ' || description)
  @@ to_tsquery('english', 'plumbing');
```

### 4.4 Geographic Indexes

**Current State:**
```sql
CREATE INDEX idx_service_areas_geo
ON service_areas(latitude, longitude);
```

**Issue:** Standard B-tree index inefficient for radius queries ⚠️

**Recommendation:**
```sql
-- Add PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Convert to geography type
ALTER TABLE service_areas
ADD COLUMN location GEOGRAPHY(POINT, 4326);

-- Update from lat/lng
UPDATE service_areas
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

-- Add spatial index
CREATE INDEX idx_service_areas_location
ON service_areas USING GIST(location);

-- Efficient radius query
SELECT * FROM service_areas
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-0.1278, 51.5074), 4326), -- London
  50000 -- 50km in meters
);
```

---

## 5. Migrations

### 5.1 Migration History Consistency

**Statistics:**
- Total migrations: **141**
- Naming convention: Timestamp-based ✅
- Average migration size: Small, focused changes ✅

**Migration Patterns:**
```
20250101000001_add_stripe_customer_id.sql
20250107000002_complete_rls_and_admin_overrides.sql
20250113000001_add_contractor_tables.sql
20250228000011_fix_bid_acceptance_race_condition.sql
```

### 5.2 Rollback Safety

**Issues Identified:**

#### Non-Reversible Operations
```sql
-- Migration: 20250120000001_add_performance_indexes.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status
  ON jobs(status);
```
❌ No corresponding down migration

**Recommendation:** Add rollback scripts:
```sql
-- rollback/20250120000001_rollback.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_jobs_status;
```

#### Schema Changes Without Backfill
```sql
-- Migration: 20250115000001_add_fee_transfer_fields.sql
ALTER TABLE escrow_transactions
ADD COLUMN platform_fee DECIMAL(10, 2) DEFAULT 0;
```
✅ Has safe default, but no backfill for historical data

### 5.3 Data Migration Scripts

**Missing Data Migrations:**
- No migration to populate `contractor_trust_scores` for existing contractors ⚠️
- No migration to backfill `job_photos_metadata` from existing job photos ⚠️

**Recommendation:** Create data migration scripts:
```sql
-- Populate trust scores for existing contractors
INSERT INTO contractor_trust_scores (contractor_id, trust_score, successful_jobs_count)
SELECT
  u.id,
  0.5, -- Default trust score
  COUNT(j.id)
FROM users u
LEFT JOIN jobs j ON j.contractor_id = u.id AND j.status = 'completed'
WHERE u.role = 'contractor'
ON CONFLICT (contractor_id) DO NOTHING;
```

### 5.4 Migration Debt

**Observations:**
- 141 migrations suggest schema evolution over time
- Some tables modified by 10+ migrations
- No schema consolidation performed

**Recommendation:**
1. Create consolidated schema snapshot
2. Squash pre-production migrations
3. Establish migration squashing policy (every 6 months)

---

## 6. Query Patterns & Performance

### 6.1 Atomic Operations

**Excellent: Bid Acceptance Function**
```sql
CREATE OR REPLACE FUNCTION public.accept_bid_atomic(
  p_bid_id UUID,
  p_job_id UUID,
  p_contractor_id UUID,
  p_homeowner_id UUID
)
```

**Features:**
- Row-level locking: `FOR UPDATE` on jobs ✅
- Atomic operations: Accept bid, reject others, update job ✅
- Race condition prevention: UNIQUE INDEX + locks ✅
- Security: Validates ownership before execution ✅

**This is production-grade code** ✅

### 6.2 N+1 Query Analysis

**From Application Code:**

#### Good: Batch Loading
```typescript
// apps/web/lib/queries/airbnb-optimized.ts
const contractorIds = contractors.map(c => c.id);
const { data: skills } = await supabase
  .from('contractor_skills')
  .select('*')
  .in('contractor_id', contractorIds);
```
✅ Prevents N+1 by loading all skills in one query

#### Concern: Multiple Round Trips
```typescript
// Potential pattern in code
for (const job of jobs) {
  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('job_id', job.id);
}
```
⚠️ Should use:
```typescript
const jobIds = jobs.map(j => j.id);
const { data: bids } = await supabase
  .from('bids')
  .select('*, jobs(*)')
  .in('job_id', jobIds);
```

**Recommendation:** Audit API routes for N+1 patterns using Supabase query logging

### 6.3 Complex Joins

**Example: Featured Contractors Query**
```sql
SELECT u.*, cs.skill_name, r.avg_rating, COUNT(j.id) as job_count
FROM users u
LEFT JOIN contractor_skills cs ON cs.contractor_id = u.id
LEFT JOIN (
  SELECT contractor_id, AVG(rating) as avg_rating
  FROM reviews
  GROUP BY contractor_id
) r ON r.contractor_id = u.id
LEFT JOIN jobs j ON j.contractor_id = u.id AND j.status = 'completed'
WHERE u.role = 'contractor'
GROUP BY u.id;
```

**Issues:**
- Subquery in LEFT JOIN not efficient
- Multiple LEFT JOINs can cause query slowdown

**Optimization:**
```sql
-- Materialized view for contractor stats
CREATE MATERIALIZED VIEW contractor_stats AS
SELECT
  u.id as contractor_id,
  COUNT(DISTINCT j.id) as completed_jobs,
  AVG(r.rating) as avg_rating,
  COUNT(DISTINCT r.id) as review_count
FROM users u
LEFT JOIN jobs j ON j.contractor_id = u.id AND j.status = 'completed'
LEFT JOIN reviews r ON r.contractor_id = u.id
WHERE u.role = 'contractor'
GROUP BY u.id;

CREATE UNIQUE INDEX ON contractor_stats(contractor_id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY contractor_stats;
```

### 6.4 Query Performance Metrics (Estimated)

Based on schema analysis and indexing:

| Query Type | Current Performance | Optimized Target |
|------------|---------------------|------------------|
| Job listing (status filter) | ~50ms | ~20ms (with partial index) |
| Contractor search | ~100ms | ~30ms (with materialized view) |
| Bid acceptance | ~10ms | ✅ Atomic function |
| Message thread load | ~30ms | ✅ Good indexes |
| Payment history | ~40ms | ~15ms (with composite index) |

---

## 7. Recommendations

### 7.1 Critical (Immediate Action Required)

1. **Add PostGIS Extension**
   - Enable efficient geographic queries
   - Priority: HIGH
   - Effort: 2 hours

2. **Fix RLS Gaps**
   - Add explicit DELETE policies to all tables
   - Add authentication requirements to public SELECT policies
   - Priority: HIGH
   - Effort: 4 hours

3. **Audit Foreign Key Cascades**
   - Review all `ON DELETE SET NULL` constraints
   - Determine if CASCADE is more appropriate
   - Priority: MEDIUM-HIGH
   - Effort: 3 hours

4. **Add Centralized Audit Logging**
   - Create `admin_activity_log` table
   - Add triggers for admin operations
   - Priority: HIGH
   - Effort: 6 hours

### 7.2 High Priority (Next Sprint)

5. **Implement Full-Text Search**
   - Add GIN indexes for job search
   - Add vector search support (pgvector)
   - Priority: MEDIUM
   - Effort: 4 hours

6. **Create Materialized Views**
   - `contractor_stats` for profile performance
   - `job_metrics` for analytics dashboards
   - Priority: MEDIUM
   - Effort: 6 hours

7. **Normalize JSONB Fields**
   - Extract `contractor_skills.certifications` to separate table
   - Normalize `contractor_quotes.line_items`
   - Priority: MEDIUM
   - Effort: 8 hours

8. **Add Data Validation Constraints**
   - Email format validation
   - Phone number format validation
   - ZIP code format validation
   - Priority: MEDIUM
   - Effort: 3 hours

### 7.3 Medium Priority (Next Month)

9. **Schema Consolidation**
   - Extract contractor fields from `users` table
   - Consolidate payment-related tables
   - Priority: LOW-MEDIUM
   - Effort: 16 hours

10. **Migration Squashing**
    - Create consolidated schema snapshot
    - Squash pre-production migrations
    - Priority: LOW
    - Effort: 8 hours

11. **Remove Unused Features**
    - Deprecate LinkedIn-style social features if not used
    - Remove unused `metadata` JSONB columns
    - Priority: LOW
    - Effort: 6 hours

12. **Add Database Functions**
    - `calculate_contractor_rating()` function
    - `get_job_bid_stats()` function
    - `auto_approve_escrow()` scheduled function
    - Priority: MEDIUM
    - Effort: 8 hours

---

## 8. Security Concerns

### 8.1 SQL Injection Protection

✅ Supabase client provides parameterized queries by default
✅ RLS policies use `auth.uid()` which is secure
✅ Database functions use `$1, $2` parameter substitution

**No SQL injection vulnerabilities found**

### 8.2 Data Leakage Risks

⚠️ **Issue 1:** Public SELECT policies on contractor_posts allow anonymous access
⚠️ **Issue 2:** Service role has unrestricted access to payment_tracking
⚠️ **Issue 3:** No rate limiting on database level for expensive queries

**Recommendations:**
- Add `TO authenticated` to all SELECT policies
- Implement query cost limits via pg_stat_statements
- Add rate limiting to API layer (already in place via middleware)

### 8.3 PII Handling

**Current State:**
- Email addresses stored in plaintext ⚠️
- Phone numbers stored in plaintext ⚠️
- Stripe customer IDs stored in plaintext ✅ (necessary for Stripe API)
- Payment intents stored in plaintext ✅ (necessary for Stripe API)

**GDPR Compliance:**
- User deletion triggers exist ✅
- Data export functionality exists ✅
- Missing: Data anonymization for deleted users ⚠️

**Recommendation:**
```sql
-- Add anonymization trigger
CREATE OR REPLACE FUNCTION anonymize_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    email = 'deleted_' || OLD.id || '@anonymized.local',
    first_name = 'Deleted',
    last_name = 'User',
    phone_number = NULL,
    profile_image_url = NULL
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_user_delete
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_deleted_user();
```

---

## 9. Performance Monitoring

### 9.1 Recommended Queries for Monitoring

```sql
-- 1. Slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Missing indexes (sequential scans)
SELECT
  schemaname, tablename, seq_scan, seq_tup_read,
  idx_scan, seq_tup_read / seq_scan as avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND seq_tup_read / seq_scan > 10000
ORDER BY seq_tup_read DESC;

-- 3. Table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
    pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 4. Cache hit ratio (should be > 99%)
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;

-- 5. Lock monitoring
SELECT
  locktype, relation::regclass, mode, granted, pid
FROM pg_locks
WHERE NOT granted;
```

### 9.2 Recommended Alerts

1. **Slow Query Alert**: Trigger when mean_exec_time > 500ms
2. **Sequential Scan Alert**: Trigger when large table has high seq_scan ratio
3. **Connection Pool Alert**: Trigger when active connections > 80% of max
4. **Cache Hit Ratio Alert**: Trigger when ratio < 95%
5. **Table Bloat Alert**: Trigger when table size grows >20% without data increase

---

## 10. Conclusion

The Mintenance database architecture is **well-designed with comprehensive security** through RLS policies and proper indexing. The use of atomic functions for critical operations (like bid acceptance) demonstrates production-grade engineering.

**Key Strengths:**
- Comprehensive RLS coverage (713 policies)
- Strategic indexing for performance
- Atomic operations for race condition prevention
- Multi-tenant isolation
- Well-structured foreign key relationships

**Areas for Improvement:**
- PostGIS for geographic queries
- Full-text search indexes
- Data validation constraints
- Schema consolidation
- Materialized views for analytics
- Centralized audit logging

**Overall Assessment:** **B+ (Very Good)**

The database is production-ready with some optimizations recommended. No critical security vulnerabilities found, but several performance and data integrity improvements would enhance the system.

**Estimated Effort to Address All Recommendations:** ~60 hours over 2 sprints

---

## Appendix A: Table Inventory

### Core Platform Tables (25)
- users, refresh_tokens, user_preferences, properties
- jobs, bids, contracts, job_photos_metadata, job_views, job_status_transitions
- messages, message_reactions
- payments, escrow_transactions, contractor_payout_accounts, payment_tracking
- reviews, ratings
- notifications, notification_engagement
- idempotency_keys
- webhook_events
- security_events, admin_activity_logs
- gdpr_exports

### Contractor Features (12)
- contractor_quotes, contractor_invoices
- contractor_posts, contractor_post_likes
- contractor_skills, contractor_certifications
- service_areas
- connections
- contractor_subscriptions, subscription_features
- contractor_trust_scores
- onboarding_progress

### AI/ML System (18)
- building_assessments, building_assessment_cache
- yolo_models, yolo_corrections, yolo_retraining_jobs
- ab_test_experiments, ab_test_results, ab_test_assignments
- model_drift_metrics, model_performance_logs
- training_datasets, training_images
- ai_service_costs, ai_response_cache
- hybrid_routing_config, routing_decisions
- conformal_prediction_calibration
- ground_truth_feedback, fnr_tracking

### Social Features (10)
- companies, company_followers
- articles, article_reactions, article_comments
- groups, group_members, group_posts
- help_articles, help_article_views

### Analytics & Monitoring (8)
- search_analytics, search_queries
- user_agent_settings, automation_preferences
- feature_usage_tracking
- notification_agent_logs
- escrow_release_status_log
- verification_history

### Admin Features (7)
- admin_announcements
- phone_verification_codes
- dispute_resolution
- mediation_sessions
- payout_tier_config
- platform_settings
- ip_blocks

**Total Tables:** **80+**

---

## Appendix B: Critical Functions

### Security Functions
- `is_admin()` - Admin role check
- `is_job_participant(uuid)` - Job access validation

### Business Logic Functions
- `accept_bid_atomic()` - Race-condition-safe bid acceptance
- `generate_quote_number()` - Sequential quote numbering
- `generate_invoice_number()` - Sequential invoice numbering
- `update_updated_at_column()` - Timestamp updater (used by 50+ triggers)
- `log_escrow_status_change()` - Escrow audit trail

### Planned Functions (Recommended)
- `calculate_contractor_rating()` - Aggregate rating calculation
- `auto_approve_escrow()` - Automatic escrow release after 7 days
- `anonymize_deleted_user()` - GDPR compliance
- `calculate_platform_fees()` - Fee calculation logic

---

**End of Report**
