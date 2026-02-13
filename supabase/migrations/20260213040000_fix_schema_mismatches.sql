-- Migration: Fix schema mismatches discovered during E2E audit
-- Date: 2026-02-13
-- Fixes: notifications.action_url, jobs.status CHECK, escrow_transactions table

BEGIN;

-- 1. Add action_url column to notifications table
-- Multiple API routes insert/select this column but it was never in the schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'action_url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- 2. Fix jobs status CHECK constraint to include 'assigned' and 'posted'
-- The bid acceptance flow sets status = 'assigned', but the original CHECK didn't include it
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'jobs_status_check'
  ) THEN
    ALTER TABLE public.jobs DROP CONSTRAINT jobs_status_check;
  END IF;

  -- Add updated constraint with all statuses used by the app
  ALTER TABLE public.jobs
    ADD CONSTRAINT jobs_status_check
    CHECK (status IN ('draft', 'open', 'posted', 'assigned', 'in_progress', 'completed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create escrow_transactions table (referenced by 118+ files but never created)
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'held', 'released', 'refunded',
    'awaiting_homeowner_approval', 'pending_review',
    'failed', 'cancelled'
  )),
  payment_intent_id TEXT,
  stripe_charge_id TEXT,
  description TEXT,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for escrow_transactions
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_job_id ON public.escrow_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payer_id ON public.escrow_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payee_id ON public.escrow_transactions(payee_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON public.escrow_transactions(status);

-- RLS for escrow_transactions
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING (auth.uid() = payer_id OR auth.uid() = payee_id);

COMMIT;
