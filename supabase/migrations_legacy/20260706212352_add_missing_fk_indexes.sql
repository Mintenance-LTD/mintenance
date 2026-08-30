-- 2026-07-06 full-stack audit (#7): covering indexes for unindexed FKs.
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_admin_hold_by
  ON public.escrow_transactions (admin_hold_by);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_mediation_mediator_id
  ON public.escrow_transactions (mediation_mediator_id);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_mediation_requested_by
  ON public.escrow_transactions (mediation_requested_by);

CREATE INDEX IF NOT EXISTS idx_invoices_job_id
  ON public.invoices (job_id);

CREATE INDEX IF NOT EXISTS idx_invoices_quote_id
  ON public.invoices (quote_id);;
