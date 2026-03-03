-- =============================================================================
-- Migration: Add invoices and expenses tables
-- Date: 2026-03-03
-- Fixes: "Could not find the table 'public.invoices' in the schema cache"
--        Also adds the 'expenses' table used by FinancialManagementService
-- =============================================================================

-- ============================================================================
-- invoices
-- Used by: FinancialManagementService (mobile), InvoiceManagementScreen
-- NOTE: Separate from contractor_invoices (web app). This is the mobile-native
--       invoice table linked to contractor_clients.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id         UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  client_id      UUID NOT NULL REFERENCES public.contractor_clients(id) ON DELETE RESTRICT,

  invoice_number TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- Financial amounts
  subtotal       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Dates
  issue_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE NOT NULL,
  paid_date      TIMESTAMPTZ,

  -- Content
  notes          TEXT,
  -- [{ description, quantity, rate, amount }]
  line_items     JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Unique invoice number per contractor
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_contractor_number
  ON public.invoices(contractor_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoices_contractor_id
  ON public.invoices(contractor_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id
  ON public.invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices(contractor_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices(contractor_id, due_date ASC);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select"
  ON public.invoices FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "invoices_insert"
  ON public.invoices FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "invoices_update"
  ON public.invoices FOR UPDATE
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "invoices_delete"
  ON public.invoices FOR DELETE
  USING (contractor_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- expenses
-- Used by: FinancialManagementService.getExpenses() / createExpense()
-- NOTE: Separate from contractor_expenses (job-level tool/material expenses).
--       This table is for contractor's own business expense tracking.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  subcategory    TEXT,
  amount         NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  description    TEXT NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url    TEXT,
  tax_deductible BOOLEAN NOT NULL DEFAULT false,
  vendor         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_contractor_id
  ON public.expenses(contractor_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON public.expenses(contractor_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON public.expenses(contractor_id, category);

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "expenses_update"
  ON public.expenses FOR UPDATE
  USING (contractor_id = auth.uid())
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE
  USING (contractor_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
