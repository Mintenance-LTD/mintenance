-- =============================================================================
-- Migration: Unify invoices schema with web app contract
-- Date: 2026-04-30
-- Audit: P0 — "Invoice And Contractor Financial Data Are Split Across Tables"
--
-- Background: the canonical `invoices` table was created by
-- `20260303000003_add_invoices_and_expenses.sql` with a lean mobile-native
-- schema (client info via FK to `contractor_clients`). The web invoice routes
-- (POST /api/contractor/invoices, /pay, /[id]/pdf) all expect a richer schema
-- with denormalised client fields + invoice-display metadata. Audit closure on
-- 2026-04-30 swapped pay/pdf routes from the phantom `contractor_invoices`
-- table to `invoices`, but those routes still reference columns that don't
-- exist on the live table. With zero rows in production today, we can
-- backfill the schema in one shot.
--
-- All new columns are NULLABLE so the existing `client_id` FK path keeps
-- working. The web POST route's NOT NULL assumptions are at the application
-- layer.
-- =============================================================================

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

-- The `client_id` column from the original migration is NOT NULL — make it
-- nullable so the web POST flow (which uses inline client_name/email instead
-- of contractor_clients FK) can succeed.
ALTER TABLE public.invoices
  ALTER COLUMN client_id DROP NOT NULL;

-- Status check constraint allows 'viewed' (used by pay route) — extend the
-- constraint without dropping/recreating the table.
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'partial'));

-- Index supporting client-email lookups used by pay-route authorization
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
