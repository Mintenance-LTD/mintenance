# Database Migration Skill - Supabase PostgreSQL

## Skill Overview
Expert knowledge for creating, managing, and optimizing Supabase PostgreSQL database migrations for the Mintenance platform. Includes Row Level Security (RLS) patterns, indexing strategies, and migration best practices.

## Core Migration Pattern

### Standard Migration Template

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
BEGIN;

-- =====================================================
-- Migration: [Feature Name]
-- Description: [What this migration does]
-- Author: [Your name]
-- Date: [YYYY-MM-DD]
-- =====================================================

-- 1. CREATE TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.table_name (
  -- Primary key (always UUID)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys (with cascading deletes)
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Data columns
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps (always include these)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Soft delete (optional)
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'archived'))
);

-- 2. CREATE INDEXES
-- =====================================================
-- Primary access patterns
CREATE INDEX idx_table_name_user_id ON public.table_name(user_id);
CREATE INDEX idx_table_name_status ON public.table_name(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_table_name_created_at ON public.table_name(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_table_name_user_status ON public.table_name(user_id, status)
  WHERE deleted_at IS NULL;

-- Full-text search (if needed)
CREATE INDEX idx_table_name_search ON public.table_name
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- 3. CREATE TRIGGERS
-- =====================================================
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- =====================================================

-- SELECT: Users can view their own records
CREATE POLICY "table_name_select_own" ON public.table_name
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- SELECT: Admins can view all records
CREATE POLICY "table_name_select_admin" ON public.table_name
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- INSERT: Users can create their own records
CREATE POLICY "table_name_insert_own" ON public.table_name
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own records
CREATE POLICY "table_name_update_own" ON public.table_name
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can soft-delete their own records
CREATE POLICY "table_name_delete_own" ON public.table_name
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NOT NULL
  );

-- 6. GRANT PERMISSIONS
-- =====================================================
-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.table_name TO authenticated;

-- Service role has full access (for admin operations)
GRANT ALL ON public.table_name TO service_role;

-- 7. ADD COMMENTS (Documentation)
-- =====================================================
COMMENT ON TABLE public.table_name IS
  'Stores [feature] data for the platform';

COMMENT ON COLUMN public.table_name.status IS
  'Current status: active, inactive, or archived';

COMMIT;
```

## Common Migration Patterns

### Pattern 1: Add Column to Existing Table

```sql
BEGIN;

-- Add new column
ALTER TABLE public.existing_table
  ADD COLUMN new_column TEXT;

-- Set default for existing rows (if needed)
UPDATE public.existing_table
  SET new_column = 'default_value'
  WHERE new_column IS NULL;

-- Make NOT NULL after backfilling (if needed)
ALTER TABLE public.existing_table
  ALTER COLUMN new_column SET NOT NULL;

-- Add index if needed
CREATE INDEX idx_existing_table_new_column
  ON public.existing_table(new_column);

COMMIT;
```

### Pattern 2: Create Junction Table (Many-to-Many)

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.users_groups (
  -- Composite primary key
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,

  -- Additional fields
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Composite primary key
  PRIMARY KEY (user_id, group_id),

  -- Constraints
  CONSTRAINT valid_role CHECK (role IN ('member', 'moderator', 'admin'))
);

-- Indexes for both directions of lookup
CREATE INDEX idx_users_groups_user ON public.users_groups(user_id);
CREATE INDEX idx_users_groups_group ON public.users_groups(group_id);

-- RLS
ALTER TABLE public.users_groups ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "users_groups_select_own" ON public.users_groups
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see memberships of public groups
CREATE POLICY "users_groups_select_public" ON public.users_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id
      AND visibility = 'public'
    )
  );

COMMIT;
```

### Pattern 3: Add Enum Type

```sql
BEGIN;

-- Create enum type
CREATE TYPE job_status AS ENUM (
  'posted',
  'assigned',
  'in_progress',
  'completed',
  'cancelled'
);

-- Use in table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status job_status NOT NULL DEFAULT 'posted',
  -- ... other columns
);

-- Or alter existing table
ALTER TABLE public.existing_jobs
  ALTER COLUMN status TYPE job_status
  USING status::job_status;

COMMIT;
```

### Pattern 4: Add Full-Text Search

```sql
BEGIN;

-- Add tsvector column
ALTER TABLE public.articles
  ADD COLUMN search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION articles_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION articles_search_vector_update();

-- Backfill existing rows
UPDATE public.articles SET updated_at = updated_at;

-- Create GIN index
CREATE INDEX idx_articles_search ON public.articles USING GIN(search_vector);

COMMIT;
```

### Pattern 5: Create View with RLS

```sql
BEGIN;

-- Create view
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
  u.id,
  u.name,
  COUNT(DISTINCT j.id) AS total_jobs,
  COUNT(DISTINCT b.id) AS total_bids,
  AVG(r.rating) AS avg_rating
FROM public.users u
LEFT JOIN public.jobs j ON j.user_id = u.id
LEFT JOIN public.bids b ON b.contractor_id = u.id
LEFT JOIN public.reviews r ON r.contractor_id = u.id
GROUP BY u.id, u.name;

-- Enable RLS on view
ALTER VIEW public.user_stats SET (security_invoker = true);

-- Grant permissions
GRANT SELECT ON public.user_stats TO authenticated;

COMMIT;
```

### Pattern 6: Add Soft Delete

```sql
BEGIN;

-- Add deleted_at column
ALTER TABLE public.existing_table
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Update existing policies to exclude soft-deleted
DROP POLICY IF EXISTS "existing_table_select_own" ON public.existing_table;

CREATE POLICY "existing_table_select_own" ON public.existing_table
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL  -- Added condition
  );

-- Create soft-delete policy
CREATE POLICY "existing_table_soft_delete" ON public.existing_table
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NOT NULL
  );

COMMIT;
```

## RLS Policy Patterns

### Pattern: User-Owned Resources

```sql
-- Users see only their own records
CREATE POLICY "table_select_own" ON public.table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Pattern: Public Read, User Write

```sql
-- Anyone can read, only creator can modify
CREATE POLICY "table_select_all" ON public.table_name
  FOR SELECT
  USING (true);

CREATE POLICY "table_update_own" ON public.table_name
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### Pattern: Role-Based Access

```sql
-- Admin can see all, users see own
CREATE POLICY "table_select_user" ON public.table_name
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

### Pattern: Related Resource Access

```sql
-- Homeowners see their jobs, contractors see jobs they bid on
CREATE POLICY "jobs_select_homeowner" ON public.jobs
  FOR SELECT
  USING (auth.uid() = homeowner_id);

CREATE POLICY "jobs_select_contractor" ON public.jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bids
      WHERE job_id = jobs.id
      AND contractor_id = auth.uid()
    )
  );
```

### Pattern: Time-Based Access

```sql
-- Users can only update records within 24 hours
CREATE POLICY "table_update_recent" ON public.table_name
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );
```

## Indexing Strategies

### When to Create Indexes

1. **Foreign Keys** - Always index foreign key columns
```sql
CREATE INDEX idx_table_foreign_key ON public.table_name(foreign_key_id);
```

2. **WHERE Clauses** - Index columns frequently used in WHERE
```sql
CREATE INDEX idx_table_status ON public.table_name(status);
```

3. **ORDER BY** - Index columns used for sorting
```sql
CREATE INDEX idx_table_created_at ON public.table_name(created_at DESC);
```

4. **JOIN Conditions** - Index columns used in JOINs
```sql
CREATE INDEX idx_table_join_column ON public.table_name(join_column);
```

5. **Composite Queries** - Multi-column indexes for common patterns
```sql
CREATE INDEX idx_table_user_status ON public.table_name(user_id, status);
```

### Partial Indexes (More Efficient)

```sql
-- Only index non-deleted records
CREATE INDEX idx_table_active ON public.table_name(status)
  WHERE deleted_at IS NULL;

-- Only index specific status values
CREATE INDEX idx_jobs_open ON public.jobs(created_at DESC)
  WHERE status IN ('posted', 'assigned');
```

### Unique Indexes

```sql
-- Ensure uniqueness
CREATE UNIQUE INDEX idx_users_email_unique ON public.users(LOWER(email));

-- Partial unique (exclude soft-deleted)
CREATE UNIQUE INDEX idx_users_username_unique ON public.users(username)
  WHERE deleted_at IS NULL;
```

## Migration Commands

### Generate Migration from Schema Changes

```bash
# Make changes in Supabase Studio or local psql
# Then generate migration file
npx supabase db diff --local --file migration_name

# Or compare with remote
npx supabase db diff --file migration_name
```

### Apply Migrations

```bash
# Apply to local database
npx supabase db reset

# Apply to remote (staging/production)
npx supabase db push

# Apply specific migration
psql -h localhost -U postgres -d postgres -f supabase/migrations/FILENAME.sql
```

### Rollback Pattern

```bash
# Create a rollback migration manually
# supabase/migrations/YYYYMMDDHHMMSS_rollback_feature_name.sql

BEGIN;

-- Reverse the changes from original migration
DROP TABLE IF EXISTS public.table_name CASCADE;
DROP FUNCTION IF EXISTS function_name CASCADE;
DROP TYPE IF EXISTS enum_name CASCADE;

COMMIT;
```

## Best Practices

### 1. Always Use Transactions

```sql
BEGIN;
-- All changes
COMMIT;

-- Or rollback on error
ROLLBACK;
```

### 2. Use IF EXISTS / IF NOT EXISTS

```sql
CREATE TABLE IF NOT EXISTS public.table_name (...);
DROP TABLE IF EXISTS public.old_table CASCADE;
ALTER TABLE public.table_name ADD COLUMN IF NOT EXISTS new_column TEXT;
```

### 3. Safe Column Drops

```sql
-- Step 1: Remove dependencies (views, functions)
DROP VIEW IF EXISTS view_using_column CASCADE;

-- Step 2: Drop column
ALTER TABLE public.table_name DROP COLUMN IF EXISTS column_name;
```

### 4. Backfill Data Before Constraints

```sql
-- Add column as nullable first
ALTER TABLE public.table_name ADD COLUMN new_column TEXT;

-- Backfill data
UPDATE public.table_name SET new_column = 'default' WHERE new_column IS NULL;

-- Then add constraint
ALTER TABLE public.table_name ALTER COLUMN new_column SET NOT NULL;
```

### 5. Test RLS Policies

```sql
-- Test as user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-uuid-here';

SELECT * FROM public.table_name; -- Should only see user's records

RESET ROLE;
```

### 6. Use Descriptive Migration Names

```bash
# Good
20251210120000_add_job_completion_tracking.sql
20251210130000_create_contractor_availability_table.sql

# Bad
20251210120000_update.sql
20251210130000_fix_bug.sql
```

### 7. Document Complex Logic

```sql
-- =====================================================
-- IMPORTANT: This migration modifies payment flow
-- Ensure Stripe webhook is updated before deploying
-- =====================================================
```

## Common Pitfalls

### ❌ Forgetting RLS

```sql
-- WRONG: Table without RLS is publicly accessible
CREATE TABLE public.sensitive_data (...);
```

```sql
-- CORRECT: Always enable RLS
CREATE TABLE public.sensitive_data (...);
ALTER TABLE public.sensitive_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON public.sensitive_data FOR SELECT USING (...);
```

### ❌ Missing Indexes on Foreign Keys

```sql
-- WRONG: No index on user_id
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.users(id)
);
```

```sql
-- CORRECT: Index foreign keys
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.users(id)
);
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
```

### ❌ Breaking Changes Without Migration Path

```sql
-- WRONG: Dropping column with data
ALTER TABLE public.table_name DROP COLUMN important_column;
```

```sql
-- CORRECT: Migrate data first
-- Step 1: Copy data to new column
ALTER TABLE public.table_name ADD COLUMN new_column TEXT;
UPDATE public.table_name SET new_column = important_column;

-- Step 2: Drop old column
ALTER TABLE public.table_name DROP COLUMN important_column;
```

## Mintenance-Specific Patterns

### Jobs Table Pattern

```sql
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.users(id),
  contractor_id UUID REFERENCES public.users(id),
  status job_status NOT NULL DEFAULT 'posted',

  -- Location (for geocoding)
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Job details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),

  -- Metadata
  photos TEXT[],
  attachments TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_jobs_homeowner ON public.jobs(homeowner_id);
CREATE INDEX idx_jobs_contractor ON public.jobs(contractor_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_location ON public.jobs USING GIST(
  ll_to_earth(latitude, longitude)
);
```

### Payment/Escrow Pattern

```sql
CREATE TABLE public.escrow_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,

  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  contractor_amount DECIMAL(10, 2) NOT NULL,

  status TEXT NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE,
  auto_release_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('held', 'released', 'refunded'))
);
```

## When to Use This Skill

Load this skill for:
- Creating new database tables
- Modifying existing schema
- Setting up RLS policies
- Optimizing query performance
- Adding indexes
- Creating migrations
- Understanding database patterns
- Troubleshooting RLS issues
