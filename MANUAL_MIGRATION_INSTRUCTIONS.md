# Manual Migration Instructions - Budget Visibility

## ⚠️ Prerequisites

Docker Desktop is not running, so we need to apply the migration manually via Supabase Dashboard.

## 📋 Step 1: Access Supabase SQL Editor

1. Go to [https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/sql](https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/sql)
2. Click "New Query"

## 📄 Step 2: Copy and Run Migration SQL

Copy the **ENTIRE** SQL from the file below and paste it into the SQL Editor:

**File:** `supabase/migrations/20251213000003_budget_visibility_improvements.sql`

The migration will:
- ✅ Add `budget_min`, `budget_max` columns to `jobs` table
- ✅ Add `show_budget_to_contractors` (default: false) to `jobs` table
- ✅ Add `require_itemized_bids` (default: true) to `jobs` table
- ✅ Add itemization fields to `bids` table
- ✅ Create quality scoring functions
- ✅ Create budget analytics views
- ✅ Update existing jobs with safe defaults

## ✅ Step 3: Verify Migration Success

After running the migration, run these verification queries:

### Verify Jobs Table Columns

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('budget_min', 'budget_max', 'show_budget_to_contractors', 'require_itemized_bids');
```

**Expected output:** 4 rows showing the new columns

### Verify Bids Table Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bids'
AND column_name IN ('has_itemization', 'itemization_quality_score', 'materials_breakdown', 'labor_breakdown', 'other_costs_breakdown');
```

**Expected output:** 5 rows showing the new columns

### Verify Functions Created

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_bid_quality_score', 'update_bid_quality_score');
```

**Expected output:** 2 rows showing the functions

### Verify Analytics View

```sql
SELECT * FROM budget_anchoring_analytics LIMIT 1;
```

**Expected output:** Either 1 row of analytics data OR "no rows" (both are success)

## 📊 Step 4: Test with Sample Data

After verifying the migration, let's test with a sample job:

### Create Test Job

```sql
INSERT INTO jobs (
  id,
  homeowner_id,
  title,
  description,
  category,
  location,
  budget,
  budget_min,
  budget_max,
  show_budget_to_contractors,
  require_itemized_bids,
  status
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE role = 'homeowner' LIMIT 1), -- Use existing homeowner
  'Test Budget Visibility Job',
  'This is a test job to verify budget visibility features work correctly',
  'Plumbing',
  'London, UK',
  1000.00,
  900.00,
  1100.00,
  false, -- Budget hidden from contractors
  true,  -- Itemization required
  'open'
) RETURNING id, title, budget, budget_min, budget_max, show_budget_to_contractors, require_itemized_bids;
```

**Expected output:** New job row with budget range 900-1100 and hidden budget

### Verify Budget Hiding Works

```sql
-- This simulates what contractors see
SELECT
  id,
  title,
  CASE
    WHEN show_budget_to_contractors THEN budget
    ELSE NULL
  END AS visible_budget,
  budget_min,
  budget_max,
  require_itemized_bids
FROM jobs
WHERE title = 'Test Budget Visibility Job';
```

**Expected output:**
- `visible_budget` should be NULL (budget hidden)
- `budget_min` should be 900
- `budget_max` should be 1100
- `require_itemized_bids` should be true

## 🧹 Step 5: Clean Up Test Data (Optional)

```sql
DELETE FROM jobs WHERE title = 'Test Budget Visibility Job';
```

## ✅ Migration Complete!

Once all verification queries pass, the migration is successfully applied.

You can now proceed to test the UI components:
- `/jobs/create` - Test BudgetRangeSelector component
- `/contractor/discover` - Test budget range display in job cards

## 🐛 Troubleshooting

### If migration fails with "column already exists"

This means the migration was partially applied. Run this rollback:

```sql
-- Rollback jobs table
ALTER TABLE jobs
  DROP COLUMN IF EXISTS budget_min,
  DROP COLUMN IF EXISTS budget_max,
  DROP COLUMN IF EXISTS show_budget_to_contractors,
  DROP COLUMN IF EXISTS require_itemized_bids;

-- Rollback bids table
ALTER TABLE bids
  DROP COLUMN IF EXISTS has_itemization,
  DROP COLUMN IF EXISTS itemization_quality_score,
  DROP COLUMN IF EXISTS materials_breakdown,
  DROP COLUMN IF EXISTS labor_breakdown,
  DROP COLUMN IF EXISTS other_costs_breakdown,
  DROP COLUMN IF EXISTS bid_to_budget_ratio,
  DROP COLUMN IF EXISTS within_typical_range;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_bid_quality_score(UUID);
DROP FUNCTION IF EXISTS update_bid_quality_score();
DROP TRIGGER IF EXISTS trigger_update_bid_quality_score ON bids;

-- Drop views
DROP VIEW IF EXISTS budget_anchoring_analytics;
```

Then re-run the full migration.

## 📞 Next Steps

After successful migration:
1. ✅ Verify migration in database
2. 🧪 Test job creation flow at `/jobs/create`
3. 👀 Verify contractor sees ranges at `/contractor/discover`
4. 📊 Check analytics view has data after creating jobs
5. 🎯 Proceed to Phase 3: Bid submission enforcement

