ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quote_id        UUID REFERENCES public.contractor_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_name     TEXT,
  ADD COLUMN IF NOT EXISTS client_email    TEXT,
  ADD COLUMN IF NOT EXISTS client_phone    TEXT,
  ADD COLUMN IF NOT EXISTS client_address  TEXT,
  ADD COLUMN IF NOT EXISTS title           TEXT,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms   TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate        NUMERIC(5, 2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS vat_number      TEXT,
  ADD COLUMN IF NOT EXISTS paid_amount     NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS viewed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_date    TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.invoices
  ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'partial'));

CREATE INDEX IF NOT EXISTS idx_invoices_client_email
  ON public.invoices(client_email);

COMMENT ON COLUMN public.invoices.quote_id IS
  'Optional FK to contractor_quotes — set when an accepted quote is converted to an invoice.';
COMMENT ON COLUMN public.invoices.client_name IS
  'Denormalised client name. Either set inline (web flow) or populated from contractor_clients FK (mobile flow).';
COMMENT ON COLUMN public.invoices.client_email IS
  'Denormalised client email. Used by /api/contractor/invoices/pay to authorise the payer.';
COMMENT ON COLUMN public.invoices.viewed_at IS
  'Set by pay route when the client first views the invoice.';
COMMENT ON COLUMN public.invoices.paid_amount IS
  'Actual amount received. May differ from total_amount on partial payments.';
