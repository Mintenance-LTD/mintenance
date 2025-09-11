-- 007_rls_tightening.sql
-- Purpose: Ensure RLS policies mirror access rules for INSERT/UPDATE via WITH CHECK.

BEGIN;

-- Contractor quotes: owner-managed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='contractor_quotes'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Contractors manage own quotes" ON public.contractor_quotes';
    EXECUTE 'CREATE POLICY "Contractors manage own quotes" ON public.contractor_quotes
             FOR ALL TO authenticated
             USING (contractor_id = auth.uid())
             WITH CHECK (contractor_id = auth.uid())';
  END IF;
END $$;

-- Line items follow quote access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='quote_line_items'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Quote line items follow quote access" ON public.quote_line_items';
    EXECUTE 'CREATE POLICY "Quote line items follow quote access" ON public.quote_line_items
             FOR ALL TO authenticated
             USING (quote_id IN (SELECT id FROM public.contractor_quotes WHERE contractor_id = auth.uid() OR client_id = auth.uid()))
             WITH CHECK (quote_id IN (SELECT id FROM public.contractor_quotes WHERE contractor_id = auth.uid() OR client_id = auth.uid()))';
  END IF;
END $$;

COMMIT;

