-- Migration: Add quote_id FK to contracts table
-- Purpose: Link contracts to the accepted bid's quote for traceability
-- The contractor_quotes record contains line items, tax, and terms
-- that should carry forward into the contract.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN quote_id UUID REFERENCES public.contractor_quotes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_contracts_quote_id ON public.contracts(quote_id);
  END IF;
END $$;
