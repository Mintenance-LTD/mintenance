-- Fix mobile workflow blockers: escrow RLS, bids column mapping, building_assessments contractor access
-- Issue: Mobile app uses anon key + JWT (always subject to RLS), but several tables lack user-facing policies

BEGIN;

-- ============================================================
-- FIX 1: escrow_transactions — add user-facing SELECT policy
-- The 20260214 migration replaced all policies with service_role-only,
-- which blocks mobile users from viewing their own escrow records.
-- The service_role policy remains for INSERT/UPDATE (server-side only).
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "escrow_payer_select" ON public.escrow_transactions;
DROP POLICY IF EXISTS "escrow_payee_select" ON public.escrow_transactions;
DROP POLICY IF EXISTS "escrow_authenticated_select" ON public.escrow_transactions;

-- Homeowners (payer) and contractors (payee) can view their own escrow records
CREATE POLICY "escrow_authenticated_select"
  ON public.escrow_transactions
  FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

-- ============================================================
-- FIX 2: bids table — add 'description' column as alias
-- The API writes to 'description' but the canonical schema only has 'message'.
-- Add 'description' column so both work. Existing 'message' data preserved.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column description already exists or cannot be added: %', SQLERRM;
END $$;

-- Backfill: copy message → description where description is null but message exists
UPDATE public.bids
SET description = message
WHERE description IS NULL AND message IS NOT NULL;

-- ============================================================
-- FIX 3: bids table — ensure estimated_duration_days and proposed_start_date exist
-- The API validates these fields but omits them from the payload
-- because the columns "may not exist". Ensure they do.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS proposed_start_date DATE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column proposed_start_date already exists: %', SQLERRM;
END $$;

-- estimated_duration_days already added by 20260316193000, but ensure it exists
DO $$ BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS estimated_duration_days INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column estimated_duration_days already exists: %', SQLERRM;
END $$;

-- ============================================================
-- FIX 4: building_assessments — contractor access for assigned jobs
-- Contractors need to view assessments related to jobs they're assigned to.
-- ============================================================

DROP POLICY IF EXISTS "Contractors can view assessments for assigned jobs" ON public.building_assessments;

DO $$
BEGIN
  IF to_regclass('public.building_assessments') IS NOT NULL THEN
    CREATE POLICY "Contractors can view assessments for assigned jobs"
      ON public.building_assessments
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = building_assessments.property_id
            AND j.contractor_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.jobs j
          JOIN public.job_photos_metadata jpm ON jpm.job_id = j.id
          WHERE j.contractor_id = auth.uid()
            AND building_assessments.user_id = j.homeowner_id
        )
      );
  END IF;
END $$;

COMMIT;
