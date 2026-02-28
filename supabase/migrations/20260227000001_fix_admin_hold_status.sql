-- Fix admin_hold_status CHECK constraint
-- The code checks for 'admin_hold' and 'pending_review' but the constraint only
-- allows 'none', 'held', 'released', making the admin security hold feature silently broken.
-- This migration expands the allowed values to match the application code.

ALTER TABLE public.escrow_transactions
  DROP CONSTRAINT IF EXISTS escrow_transactions_admin_hold_status_check;

ALTER TABLE public.escrow_transactions
  ADD CONSTRAINT escrow_transactions_admin_hold_status_check
  CHECK (admin_hold_status IN ('none', 'held', 'released', 'admin_hold', 'pending_review')
         OR admin_hold_status IS NULL);
