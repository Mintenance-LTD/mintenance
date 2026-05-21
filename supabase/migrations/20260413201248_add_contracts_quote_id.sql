-- Migration: Add quote_id FK to contracts table
-- Purpose: Link contracts to the accepted bid's quote for traceability
-- The contractor_quotes record contains line items, tax, and terms
-- that should carry forward into the contract.
--
-- 2026-05-21 drift-cleanup note: this migration ran in production at two
-- separate versions — 20260401000004 (canonical) and 20260413201248 (this
-- file). Both files exist for repo↔live tracker parity. Identical SQL +
-- IF NOT EXISTS guards mean fresh-DB resets apply once and the second
-- run is a no-op.

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
