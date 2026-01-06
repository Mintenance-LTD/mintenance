-- Migration: Add Fee Transfer Fields to Escrow Transactions
-- Created: 2025-01-15
-- Description: Adds fee transfer tracking fields to escrow_transactions table and creates platform_fee_transfers table

BEGIN;

-- ============================================================================
-- UPDATE ESCROW_TRANSACTIONS TABLE
-- ============================================================================

-- Add fee transfer tracking fields
ALTER TABLE public.escrow_transactions
ADD COLUMN IF NOT EXISTS fee_transfer_status TEXT DEFAULT 'pending' CHECK (
  fee_transfer_status IN ('pending', 'transferred', 'held', 'failed', 'refunded')
),
ADD COLUMN IF NOT EXISTS fee_transfer_id TEXT, -- Stripe transfer ID for platform fee
ADD COLUMN IF NOT EXISTS fee_transferred_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fee_hold_reason TEXT, -- Admin hold reason for fees
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'final' CHECK (
  payment_type IN ('deposit', 'final', 'milestone')
),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contractor_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS stripe_processing_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transfer_id TEXT, -- Stripe transfer ID for contractor payout
ADD COLUMN IF NOT EXISTS release_reason TEXT; -- Reason for escrow release

-- Update status check constraint to include 'completed' status
ALTER TABLE public.escrow_transactions
DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

ALTER TABLE public.escrow_transactions
ADD CONSTRAINT escrow_transactions_status_check
CHECK (status IN ('pending', 'held', 'released', 'completed', 'refunded'));

-- Add indexes for fee transfer queries
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_fee_transfer_status 
  ON public.escrow_transactions(fee_transfer_status) 
  WHERE fee_transfer_status IN ('pending', 'held');

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payment_type 
  ON public.escrow_transactions(payment_type);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_fee_transfer_id 
  ON public.escrow_transactions(fee_transfer_id) 
  WHERE fee_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_transfer_id 
  ON public.escrow_transactions(transfer_id) 
  WHERE transfer_id IS NOT NULL;

-- ============================================================================
-- PLATFORM FEE TRANSFERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_fee_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  escrow_transaction_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Fee details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_processing_fee DECIMAL(10, 2) DEFAULT 0,
  net_revenue DECIMAL(10, 2) NOT NULL, -- Platform fee minus Stripe costs
  
  -- Transfer tracking
  stripe_transfer_id TEXT UNIQUE, -- Stripe transfer ID for platform fee
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'transferred', 'held', 'failed', 'refunded')
  ),
  
  -- Admin controls
  hold_reason TEXT, -- Reason for admin hold
  held_by UUID REFERENCES public.users(id), -- Admin who placed hold
  held_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  transferred_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for platform_fee_transfers
CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_escrow_transaction_id 
  ON public.platform_fee_transfers(escrow_transaction_id);

CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_job_id 
  ON public.platform_fee_transfers(job_id);

CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_contractor_id 
  ON public.platform_fee_transfers(contractor_id);

CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_status 
  ON public.platform_fee_transfers(status);

CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_pending 
  ON public.platform_fee_transfers(status, created_at) 
  WHERE status IN ('pending', 'held');

CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_stripe_transfer_id 
  ON public.platform_fee_transfers(stripe_transfer_id) 
  WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_fee_transfers_created_at 
  ON public.platform_fee_transfers(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_fee_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_fee_transfers_updated_at
  BEFORE UPDATE ON public.platform_fee_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_fee_transfers_updated_at();

-- Trigger to update held_at when status changes to 'held'
CREATE OR REPLACE FUNCTION update_platform_fee_transfers_held_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'held' AND OLD.status != 'held' THEN
    NEW.held_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_fee_transfers_held_at
  BEFORE UPDATE OF status ON public.platform_fee_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_fee_transfers_held_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.platform_fee_transfers ENABLE ROW LEVEL SECURITY;

-- Admins can view all fee transfers
CREATE POLICY "Admins can view all fee transfers"
  ON public.platform_fee_transfers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Contractors can view their own fee transfers
CREATE POLICY "Contractors can view own fee transfers"
  ON public.platform_fee_transfers
  FOR SELECT
  USING (
    contractor_id = auth.uid()
  );

-- Only service role can insert fee transfers
CREATE POLICY "Service role can insert fee transfers"
  ON public.platform_fee_transfers
  FOR INSERT
  WITH CHECK (true);

-- Only admins can update fee transfers
CREATE POLICY "Admins can update fee transfers"
  ON public.platform_fee_transfers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.platform_fee_transfers IS 'Tracks platform fee transfers from escrow transactions to platform account';
COMMENT ON COLUMN public.platform_fee_transfers.net_revenue IS 'Platform fee minus Stripe processing costs';
COMMENT ON COLUMN public.platform_fee_transfers.hold_reason IS 'Reason for admin hold on fee transfer (e.g., dispute resolution, compliance check)';
COMMENT ON COLUMN public.escrow_transactions.fee_transfer_status IS 'Status of platform fee transfer: pending, transferred, held, failed, refunded';
COMMENT ON COLUMN public.escrow_transactions.payment_type IS 'Type of payment: deposit, final, or milestone';
COMMENT ON COLUMN public.escrow_transactions.platform_fee IS 'Platform fee amount (typically 5% of transaction)';
COMMENT ON COLUMN public.escrow_transactions.contractor_payout IS 'Amount contractor receives after platform fee deduction';

COMMIT;

