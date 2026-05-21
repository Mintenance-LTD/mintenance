-- invoice_payments — add columns the Stripe webhook handlers write (2026-05-21)
--
-- Bug verified live on 2026-05-21:
--   apps/web/lib/services/stripe-webhook/invoice-handlers.ts:52 + :148
--   upserts user_id, amount_due, updated_at — none of which exist on the
--   live table or in the canonical CREATE TABLE migration
--   (20260208001000_add_missing_tables_and_functions.sql:143).
--
-- Effect today: every Stripe invoice.payment_succeeded /
-- invoice.payment_failed webhook upsert into invoice_payments fails the
-- column check on PostgREST. The handler swallows the error in a try/catch
-- and only logs — so reactivation of past_due subscriptions and failed-
-- payment alerts both rely on this write completing. Live invoice_payments
-- has 0 rows because every attempted insert errored out.
--
-- Fix: add the missing columns idempotently. contractor_id stays as a
-- legacy column (no readers in app code today). idx_invoice_payments_user
-- added to match the existing idx_invoice_payments_contractor.

ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_due  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- Updated_at maintenance trigger reusing canonical helper if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'invoice_payments_updated_at'
  ) THEN
    CREATE TRIGGER invoice_payments_updated_at
      BEFORE UPDATE ON public.invoice_payments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_payments_user
  ON public.invoice_payments (user_id)
  WHERE user_id IS NOT NULL;
