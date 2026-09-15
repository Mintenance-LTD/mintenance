-- Lock the same job/escrow rows as refunds and return the principal from that
-- serialization point. A read before an independent status CAS can be stale
-- after a concurrent refund completes and restores status='held'.
CREATE FUNCTION public.claim_escrow_release(
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
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id OR e.status<>'held' THEN RETURN; END IF;
 IF j.status<>'completed' OR e.payee_id IS DISTINCT FROM j.contractor_id OR
    p_release_reason IS NULL OR p_release_reason='refund_pending' OR p_reconciliation_id IS NULL THEN
  RAISE EXCEPTION 'Escrow release prerequisites changed' USING ERRCODE='23514';
 END IF;
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
 UPDATE public.escrow_transactions SET status='release_pending',release_reason=p_release_reason,
  reconciliation_id=p_reconciliation_id,transfer_attempted_at=now(),updated_at=now() WHERE id=e.id;
 RETURN QUERY SELECT e.id,available;
END $$;
REVOKE ALL ON FUNCTION public.claim_escrow_release(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_escrow_release(uuid,text,uuid) TO service_role;
