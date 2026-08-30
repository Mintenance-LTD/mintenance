-- invoice_payments — add columns the Stripe webhook handlers write

ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_due  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

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
;
