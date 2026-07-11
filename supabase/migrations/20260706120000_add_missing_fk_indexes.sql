-- 2026-07-06 full-stack audit (#7): add covering indexes for foreign keys the
-- performance advisor flagged as unindexed. Without a leading index on the FK
-- column, Postgres must sequentially scan the child table for cascade checks
-- and for any join/filter on the FK — and it makes DELETEs on the referenced
-- parent row slow. All five columns were confirmed to have no leading index.
--
-- Plain CREATE INDEX (not CONCURRENTLY) is fine here: both tables are tiny, so
-- the brief lock is negligible and this stays inside the migration transaction.

-- escrow_transactions: admin-hold + mediation actor FKs (financial table)
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_admin_hold_by
  ON public.escrow_transactions (admin_hold_by);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_mediation_mediator_id
  ON public.escrow_transactions (mediation_mediator_id);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_mediation_requested_by
  ON public.escrow_transactions (mediation_requested_by);

-- invoices: job + quote FKs (both joined on frequently by invoice listings)
CREATE INDEX IF NOT EXISTS idx_invoices_job_id
  ON public.invoices (job_id);

CREATE INDEX IF NOT EXISTS idx_invoices_quote_id
  ON public.invoices (quote_id);
