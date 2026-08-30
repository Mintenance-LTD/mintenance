DROP POLICY IF EXISTS escrow_update_policy ON public.escrow_transactions;

CREATE POLICY escrow_update_admin_only
  ON public.escrow_transactions
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY escrow_update_admin_only ON public.escrow_transactions IS
  'Direct client UPDATE locked to admin only. Service-role bypass keeps API mutations working (audit-19 P0, 2026-05-23).';
;
