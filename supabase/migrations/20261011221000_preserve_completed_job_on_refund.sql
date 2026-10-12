-- Record successful refunds without cancelling already-completed work.
CREATE OR REPLACE FUNCTION public.record_escrow_refund_outcome(p_operation_id uuid,p_refund_id text,p_state text)
RETURNS SETOF public.escrow_refund_operations LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_refund_operations; e public.escrow_transactions; b public.escrow_refund_balances;
 job_id uuid;
BEGIN
 SELECT et.job_id INTO job_id FROM public.escrow_refund_operations op JOIN public.escrow_transactions et ON et.id=op.escrow_id WHERE op.id=p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund operation missing' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_id FOR UPDATE;
 SELECT et.* INTO e FROM public.escrow_transactions et JOIN public.escrow_refund_operations op ON op.escrow_id=et.id WHERE op.id=p_operation_id FOR UPDATE OF et;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE id=p_operation_id FOR UPDATE;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id FOR UPDATE;
 IF p_state IS NULL OR p_state NOT IN('pending','requires_action','succeeded','failed','canceled') OR
    (r.cash_minor>0 AND (p_refund_id IS NULL OR length(trim(p_refund_id))=0)) OR
    (r.cash_minor=0 AND (p_refund_id IS NOT NULL OR p_state<>'succeeded')) OR
    (r.provider_refund_id IS NOT NULL AND r.provider_refund_id IS DISTINCT FROM p_refund_id) THEN
  RAISE EXCEPTION 'Refund outcome does not match its operation' USING ERRCODE='23514'; END IF;
 IF r.state=p_state THEN RETURN NEXT r; RETURN; END IF;
 IF r.state IN('succeeded','failed','canceled','reconciliation_required') THEN
  -- A late bank return or contradictory result cannot silently restore money
  -- already credited/spent by the user. Freeze the account for reconciliation.
  UPDATE public.escrow_refund_balances SET needs_review=true WHERE escrow_id=e.id;
  UPDATE public.escrow_refund_operations SET state='reconciliation_required',updated_at=now() WHERE id=r.id RETURNING * INTO r;
  RETURN NEXT r; RETURN;
 END IF;
 IF e.status<>'release_pending' OR e.release_reason IS DISTINCT FROM 'refund_pending' THEN
  RAISE EXCEPTION 'Refund escrow claim was lost; reconciliation required' USING ERRCODE='23514'; END IF;
 IF p_state='succeeded' THEN
  IF r.credit_minor>0 AND NOT public.restore_user_credit(r.actor_id,r.credit_minor,r.id) THEN
   RAISE EXCEPTION 'Refund credit restoration failed' USING ERRCODE='23514'; END IF;
  UPDATE public.escrow_refund_balances SET cash_refunded_minor=cash_refunded_minor+r.cash_minor,
   credit_returned_minor=credit_returned_minor+r.credit_minor WHERE escrow_id=e.id RETURNING * INTO b;
  UPDATE public.escrow_transactions SET status=CASE WHEN b.remaining_minor=0 THEN 'refunded' ELSE 'held' END,
   refunded_at=CASE WHEN b.remaining_minor=0 THEN now() ELSE NULL END,release_reason=NULL,updated_at=now() WHERE id=e.id;
  IF b.remaining_minor=0 AND r.job_exit_id IS NULL THEN
   -- Completed work remains completed even when its payment is refunded.
   -- Preserve the terminal-state guard; only unfinished work is cancelled.
   UPDATE public.jobs SET status=CASE WHEN status='completed' THEN status ELSE 'cancelled' END,
    payment_status='refunded',updated_at=now() WHERE id=e.job_id;
  END IF;
 ELSIF p_state IN('failed','canceled') THEN
  UPDATE public.escrow_transactions SET status='held',release_reason=NULL,updated_at=now() WHERE id=e.id;
 END IF;
 UPDATE public.escrow_refund_operations SET provider_refund_id=p_refund_id,state=p_state,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN NEXT r;
END $$;
