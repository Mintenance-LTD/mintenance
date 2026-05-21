-- Drop redundant escrow_transactions indexes (2026-05-21)
--
-- Codex re-audit P2: escrow_transactions has overlapping indexes. The
-- single-column indexes below are fully subsumed by composite indexes
-- whose leading column matches, so dropping them frees ~10–20% per-row
-- write overhead without losing any query coverage.
--
--   idx_escrow_job_id          → covered by idx_escrow_job_status (job_id, status)
--   idx_escrow_payee_id        → covered by idx_escrow_payee_status (payee_id, status, created_at DESC)
--
-- Postgres can use a leading-column-prefix of a composite btree for
-- single-column equality lookups, so any "WHERE job_id = ?" or
-- "WHERE payee_id = ?" planner choice that previously hit the standalone
-- index now hits the composite — same I/O, one fewer index to maintain.
--
-- NOT dropped (would lose coverage):
--   idx_escrow_status     — status alone, not a leading column on any composite
--   idx_escrow_payer_id   — payer_id has no composite cousin
--   The two homeowner_approval partials — different WHERE clauses

DROP INDEX IF EXISTS public.idx_escrow_job_id;
DROP INDEX IF EXISTS public.idx_escrow_payee_id;
