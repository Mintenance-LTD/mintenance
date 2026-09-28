CREATE OR REPLACE FUNCTION public.claim_escrow_release(
 p_escrow_id uuid, p_release_reason text, p_reconciliation_id uuid
) RETURNS TABLE(escrow_id uuid, remaining_minor integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions; j public.jobs; b public.escrow_refund_balances;
 job_key uuid; available integer;
BEGIN
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 IF job_key IS NULL THEN RETURN; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id OR e.status NOT IN ('held','release_pending') THEN RETURN; END IF;
 IF j.status<>'completed' OR e.payee_id IS DISTINCT FROM j.contractor_id OR
    p_release_reason IS NULL OR p_release_reason='refund_pending' OR p_reconciliation_id IS NULL THEN
  RAISE EXCEPTION 'Escrow release prerequisites changed' USING ERRCODE='23514';
 END IF;
 -- Only a previously journaled payout for this operation can resume. In
 -- particular, pending refunds and unjournaled/admin claims cannot be adopted.
 IF e.status='release_pending' AND (
    e.release_reason IS DISTINCT FROM p_release_reason OR
    e.reconciliation_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.escrow_transfer_attempts a WHERE a.escrow_id=e.id
    )) THEN RETURN; END IF;
 -- Recheck the decision at the money claim, not only in earlier API/agent reads.
 IF e.homeowner_approval IS NOT TRUE OR e.cooling_off_ends_at>now() OR
    coalesce(e.admin_hold_status,'none') NOT IN('none','admin_approved') OR EXISTS(
     SELECT 1 FROM public.disputes WHERE job_id=j.id AND status IN('open','under_review','pending')) OR
    (p_release_reason='auto_release' AND (e.auto_release_enabled IS NOT TRUE OR
      e.auto_release_date IS NULL OR e.auto_release_date>now())) THEN
  RAISE EXCEPTION 'Completion approval or release conditions changed' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_refund_balances.escrow_id=e.id;
 IF FOUND THEN
  IF b.needs_review OR b.gross_minor<>round(e.amount*100) OR EXISTS(
   SELECT 1 FROM public.escrow_refund_operations r WHERE r.escrow_id=e.id
    AND r.state IN('reserved','pending','requires_action','reconciliation_required')
  ) THEN RAISE EXCEPTION 'Refund requires reconciliation before release' USING ERRCODE='23514'; END IF;
  available:=b.remaining_minor;
 ELSE available:=round(e.amount*100); END IF;
 IF available IS NULL OR available<=0 THEN
  RAISE EXCEPTION 'No funded principal remains for release' USING ERRCODE='23514'; END IF;
 IF e.status='held' THEN
 UPDATE public.escrow_transactions SET status='release_pending',release_reason=p_release_reason,
  reconciliation_id=p_reconciliation_id,transfer_attempted_at=now(),updated_at=now() WHERE id=e.id;
 END IF; -- Preserve the original claim and durable Stripe idempotency key on retry.
 RETURN QUERY SELECT e.id,available;
END $$;
REVOKE ALL ON FUNCTION public.claim_escrow_release(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_release(uuid,text,uuid) TO service_role;

