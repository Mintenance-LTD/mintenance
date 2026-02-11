-- Migration: Change payment-related ON DELETE CASCADE to ON DELETE RESTRICT
-- Issue 34 & 57: Prevent orphaned payment records when parent records are deleted.
-- Financial records must NEVER be silently deleted — they must be explicitly handled.
-- Date: 2026-02-10

BEGIN;

-- ============================================================
-- 1. payments.job_id: CASCADE → RESTRICT
-- ============================================================
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_job_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

-- ============================================================
-- 2. payments.bid_id: CASCADE → RESTRICT
-- ============================================================
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_bid_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_bid_id_fkey
  FOREIGN KEY (bid_id) REFERENCES public.bids(id) ON DELETE RESTRICT;

-- ============================================================
-- 3. escrow_accounts.payment_id: CASCADE → RESTRICT
-- ============================================================
ALTER TABLE public.escrow_accounts
  DROP CONSTRAINT IF EXISTS escrow_accounts_payment_id_fkey;
ALTER TABLE public.escrow_accounts
  ADD CONSTRAINT escrow_accounts_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;

-- ============================================================
-- 4. invoice_payments.contractor_id: CASCADE → RESTRICT
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'invoice_payments' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%contractor_id%'
  ) THEN
    ALTER TABLE public.invoice_payments
      DROP CONSTRAINT IF EXISTS invoice_payments_contractor_id_fkey;
  END IF;
END $$;
ALTER TABLE public.invoice_payments
  ADD CONSTRAINT invoice_payments_contractor_id_fkey
  FOREIGN KEY (contractor_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ============================================================
-- 5. disputes.job_id: CASCADE → RESTRICT
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'disputes' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%job_id%'
  ) THEN
    ALTER TABLE public.disputes
      DROP CONSTRAINT IF EXISTS disputes_job_id_fkey;
  END IF;
END $$;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

-- ============================================================
-- 6. disputes.raised_by: CASCADE → RESTRICT
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'disputes' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%raised_by%'
  ) THEN
    ALTER TABLE public.disputes
      DROP CONSTRAINT IF EXISTS disputes_raised_by_fkey;
  END IF;
END $$;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_raised_by_fkey
  FOREIGN KEY (raised_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ============================================================
-- 7. disputes.against: CASCADE → RESTRICT
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'disputes' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%against%'
  ) THEN
    ALTER TABLE public.disputes
      DROP CONSTRAINT IF EXISTS disputes_against_fkey;
  END IF;
END $$;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_against_fkey
  FOREIGN KEY (against) REFERENCES public.profiles(id) ON DELETE RESTRICT;

COMMIT;
