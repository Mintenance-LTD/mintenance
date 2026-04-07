-- Migration: Consolidate reviewed_id → reviewee_id on reviews table.
-- The canonical column is reviewee_id (defined in migrations 009 and 20260209100000).
-- The legacy reviewed_id column has been removed from all app code.

-- Step 1: Backfill reviewee_id from reviewed_id where reviewee_id is null
UPDATE public.reviews
SET reviewee_id = reviewed_id
WHERE reviewee_id IS NULL AND reviewed_id IS NOT NULL;

-- Step 2: Create index on reviewee_id if not exists
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);

-- Step 3: Drop the legacy column and its index
DROP INDEX IF EXISTS idx_reviews_reviewed_id;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS reviewed_id;
