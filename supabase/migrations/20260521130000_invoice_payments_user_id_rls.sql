-- invoice_payments — add RLS policy scoping reads by user_id (2026-05-21)
--
-- Follow-up to 20260521120000_invoice_payments_canonical_columns.sql, which
-- added user_id as the new canonical owner column. The pre-existing RLS
-- policy on this table reads by contractor_id only:
--
--   invoice_payments_contractor_read: USING (contractor_id = auth.uid())
--
-- The Stripe webhook handlers now write user_id but NOT contractor_id, so
-- rows created post-handler upgrade would be invisible to the contractor
-- via PostgREST (service-role bypasses RLS for the actual write).
--
-- Fix: additive policy. Either column matching auth.uid() lets the user
-- read the row. Old rows (contractor_id populated) still work; new rows
-- (user_id populated) now also work. Service role retains full access via
-- its bypass.
--
-- Tracked follow-up (not in this migration): retire contractor_id once we
-- backfill user_id from contractor_id and migrate downstream queries.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoice_payments'
      AND policyname = 'invoice_payments_user_read'
  ) THEN
    CREATE POLICY invoice_payments_user_read ON public.invoice_payments
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
