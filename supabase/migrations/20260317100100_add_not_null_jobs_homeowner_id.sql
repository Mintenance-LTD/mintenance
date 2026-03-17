-- ============================================================
-- Add NOT NULL constraint on jobs.homeowner_id
-- ============================================================
-- SECURITY: A job without a homeowner breaks all RLS policies
-- and business logic. Every job must have an owner.
--
-- Safety: First clean up any orphaned rows, then add constraint.
-- ============================================================

-- Step 1: Verify no NULL homeowner_id rows exist (fail-safe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.jobs WHERE homeowner_id IS NULL) THEN
    RAISE WARNING 'Found jobs with NULL homeowner_id - deleting orphaned rows';
    DELETE FROM public.jobs WHERE homeowner_id IS NULL;
  END IF;
END $$;

-- Step 2: Add NOT NULL constraint
ALTER TABLE public.jobs
  ALTER COLUMN homeowner_id SET NOT NULL;
