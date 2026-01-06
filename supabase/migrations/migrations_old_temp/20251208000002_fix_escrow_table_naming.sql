-- Fix escrow table naming inconsistency
-- RLS policies reference 'escrow_transactions' but table is named 'escrow_payments'
-- Renaming table to match policies for consistency

-- Rename the table if it exists with old name and new name doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'escrow_payments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'escrow_transactions'
  ) THEN
    ALTER TABLE public.escrow_payments RENAME TO escrow_transactions;
  END IF;
END $$;

-- Update any foreign key constraints if they reference the old name
-- (constraint names remain the same, but documenting the change)

-- Add comment explaining the change
COMMENT ON TABLE public.escrow_transactions IS 'Escrow payment tracking for job transactions (renamed from escrow_payments for RLS policy consistency)';
