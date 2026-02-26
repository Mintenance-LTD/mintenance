-- Migration: Extend escrow_transactions with columns needed by release-escrow API
-- These columns are referenced by /api/payments/release-escrow but were never created

-- Homeowner approval tracking
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS homeowner_approval BOOLEAN DEFAULT false;

-- Admin hold (for disputes / manual review)
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS admin_hold_status TEXT CHECK (admin_hold_status IN ('none', 'held', 'released') OR admin_hold_status IS NULL);

-- Photo verification fields
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS photo_verification_status TEXT DEFAULT 'pending' CHECK (photo_verification_status IN ('pending', 'verified', 'failed', 'not_required'));
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS photo_quality_passed BOOLEAN DEFAULT false;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS geolocation_verified BOOLEAN DEFAULT false;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS timestamp_verified BOOLEAN DEFAULT false;

-- Cooling-off period
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS cooling_off_ends_at TIMESTAMPTZ;

-- Payment type
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'escrow' CHECK (payment_type IN ('escrow', 'direct', 'milestone'));

-- Transfer tracking (Stripe transfers to contractor)
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2);
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS contractor_payout DECIMAL(10,2);
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS stripe_processing_fee DECIMAL(10,2);

-- Fee transfer tracking
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS fee_transfer_status TEXT CHECK (fee_transfer_status IN ('pending', 'completed', 'failed') OR fee_transfer_status IS NULL);
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS fee_transfer_id UUID;

-- Reconciliation
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS reconciliation_id UUID;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS transfer_attempted_at TIMESTAMPTZ;

-- Also add release_pending to the status CHECK constraint
-- First drop the old constraint, then add the updated one
DO $$ BEGIN
  ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;
  ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_status_check
    CHECK (status IN (
      'pending', 'held', 'released', 'release_pending', 'refunded',
      'awaiting_homeowner_approval', 'pending_review',
      'failed', 'cancelled', 'completed'
    ));
EXCEPTION WHEN OTHERS THEN
  NULL; -- Constraint may already include these values
END $$;

-- Index for transfer lookups
CREATE INDEX IF NOT EXISTS idx_escrow_transfer_id ON public.escrow_transactions(transfer_id) WHERE transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escrow_homeowner_approval ON public.escrow_transactions(homeowner_approval) WHERE homeowner_approval = false AND status = 'held';
