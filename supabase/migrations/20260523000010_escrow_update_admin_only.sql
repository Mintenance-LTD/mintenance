-- 2026-05-23 audit-19 P0: escrow_update_policy currently permits any
-- payer or payee to UPDATE escrow_transactions rows directly:
--
--   USING ((auth.uid() = payer_id) OR (auth.uid() = payee_id) OR is_admin())
--
-- Migration 20260523000006_tighten_update_grants_jobs_contracts_escrow
-- already REVOKE UPDATE on this table from `authenticated`, which is the
-- effective gate today (Postgres requires BOTH the table-level grant AND
-- the RLS policy to permit), so the existing posture is safe in practice.
--
-- This migration aligns the RLS layer with that intent so the two layers
-- agree. If a future hand-rolled migration accidentally re-grants UPDATE
-- to authenticated (we've seen that happen during table renames /
-- column-add scripts), the RLS layer must NOT silently fall back to
-- letting payers/payees mutate financial state directly. Status, amount,
-- homeowner_approval, auto_release_date, admin_hold_status, transfer_id
-- and payout metadata all live on this table and must only move through
-- the API state machine (validateEscrowTransition, EscrowAutoRelease,
-- HomeownerApprovalService, etc.).
--
-- service_role bypasses RLS entirely, so all server-side flows
-- (`serverSupabase` proxy in apps/web/lib/api/supabaseServer.ts) keep
-- working with no code changes.

DROP POLICY IF EXISTS escrow_update_policy ON public.escrow_transactions;

CREATE POLICY escrow_update_admin_only
  ON public.escrow_transactions
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY escrow_update_admin_only ON public.escrow_transactions IS
  'Direct client UPDATE locked to admin only. Service-role bypass keeps API mutations working (audit-19 P0, 2026-05-23).';
