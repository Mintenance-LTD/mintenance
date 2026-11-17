-- Closing a withdrawn/erroneous case is deliberately separate from settlement.
CREATE TABLE public.dispute_nonfinancial_closures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dispute_id uuid NOT NULL UNIQUE REFERENCES public.disputes(id),
 escrow_id uuid NOT NULL REFERENCES public.escrow_transactions(id),
 closed_by uuid NOT NULL REFERENCES public.profiles(id),
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dispute_nonfinancial_closures_escrow ON public.dispute_nonfinancial_closures(escrow_id);
ALTER TABLE public.dispute_nonfinancial_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispute_nonfinancial_closures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dispute_nonfinancial_closures TO service_role;

CREATE FUNCTION public.close_dispute_without_settlement(
 p_admin_id uuid, p_escrow_id uuid, p_dispute_id uuid, p_reason text
) RETURNS SETOF public.dispute_nonfinancial_closures
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
 e public.escrow_transactions;
 d public.disputes;
 c public.dispute_nonfinancial_closures;
 job_key uuid;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
  RAISE EXCEPTION 'A closure reason of 10-1000 characters is required' USING ERRCODE='23514';
 END IF;
 -- Match the settlement RPC lock order: job, then exact payment, then case.
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE='23514'; END IF;
 SELECT * INTO d FROM public.disputes WHERE id=p_dispute_id AND job_id=e.job_id
  AND EXISTS(SELECT FROM public.dispute_escrow_links l WHERE l.dispute_id=p_dispute_id AND l.escrow_id=e.id)
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Case does not belong to this payment' USING ERRCODE='23514'; END IF;
 SELECT * INTO c FROM public.dispute_nonfinancial_closures WHERE dispute_id=d.id;
 IF FOUND THEN
  IF c.escrow_id<>e.id OR c.reason<>btrim(p_reason) THEN
   RAISE EXCEPTION 'Closure already recorded; reload the case' USING ERRCODE='23514';
  END IF;
  -- A replay only returns the existing record. It never rewinds later decisions.
  RETURN NEXT c; RETURN;
 END IF;
 IF e.status<>'disputed' OR d.status NOT IN('open','under_review','escalated') THEN
  RAISE EXCEPTION 'Case is not open for nonfinancial closure' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_admin_release_operations WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND state IN('reserved','pending','requires_action','reconciliation_required')) OR
    EXISTS(SELECT FROM public.escrow_refund_balances WHERE escrow_id=e.id AND needs_review) THEN
  RAISE EXCEPTION 'Settlement or reconciliation already started; recover it before closing' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT FROM public.disputes other JOIN public.dispute_escrow_links l ON l.dispute_id=other.id
    WHERE l.escrow_id=e.id AND other.id<>d.id AND other.status IN('open','under_review','escalated')) THEN
  RAISE EXCEPTION 'Multiple open cases require reconciliation' USING ERRCODE='23514';
 END IF;
 INSERT INTO public.dispute_nonfinancial_closures(dispute_id,escrow_id,closed_by,reason)
 VALUES(d.id,e.id,p_admin_id,btrim(p_reason)) RETURNING * INTO c;
 UPDATE public.disputes SET status='closed',resolved_at=now(),updated_at=now(),
  resolution='Closed without settlement. Payment remains on administrator hold. Reason: '||btrim(p_reason)
  WHERE id=d.id;
 UPDATE public.escrow_transactions SET status='held',admin_hold_status='admin_hold',
  admin_hold_by=p_admin_id,admin_hold_at=now(),admin_hold_reason='Case closed without settlement: '||btrim(p_reason),
  release_blocked_reason='Case closed without settlement; a separate administrator payment decision is required',
  auto_release_enabled=false,auto_approval_date=NULL,auto_release_date=NULL,cooling_off_ends_at=NULL,updated_at=now()
  WHERE id=e.id;
 UPDATE public.admin_dispute_tasks SET status='completed',completed_at=now() WHERE dispute_id=d.id AND status='open';
 -- Preserve job status, approvals, contracts, refund balances and provider journals.
 -- Neither notifications nor provider calls are sent by this operation.
 RETURN NEXT c;
END $$;
REVOKE ALL ON FUNCTION public.close_dispute_without_settlement(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.close_dispute_without_settlement(uuid,uuid,uuid,text) TO service_role;
