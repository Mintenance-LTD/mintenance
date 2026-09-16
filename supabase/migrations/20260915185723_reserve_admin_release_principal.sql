CREATE TABLE public.escrow_admin_release_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 escrow_id uuid NOT NULL UNIQUE REFERENCES public.escrow_transactions(id),
 initiated_by uuid NOT NULL REFERENCES public.profiles(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),
 principal_minor integer NOT NULL CHECK(principal_minor>0),
 fee_minor integer NOT NULL CHECK(fee_minor>=0),
 payout_minor integer NOT NULL CHECK(payout_minor>=0),
 destination text NOT NULL,
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','completed')),
 transfer_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK(fee_minor+payout_minor=principal_minor)
);
ALTER TABLE public.escrow_admin_release_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.escrow_admin_release_operations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.escrow_admin_release_operations TO service_role;

CREATE FUNCTION public.reserve_admin_escrow_release(p_admin_id uuid,p_escrow_id uuid,p_reason text,p_fee_rate numeric)
RETURNS SETOF public.escrow_admin_release_operations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions; j public.jobs; b public.escrow_refund_balances;
 op public.escrow_admin_release_operations; job_key uuid; available integer; fee integer; destination_key text;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE='42501'; END IF;
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 SELECT * INTO j FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id THEN RAISE EXCEPTION 'Escrow missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO op FROM public.escrow_admin_release_operations WHERE escrow_id=e.id;
 IF FOUND THEN
  IF op.reason IS DISTINCT FROM p_reason THEN RAISE EXCEPTION 'Release reason changed; recover the existing operation' USING ERRCODE='23514'; END IF;
  RETURN NEXT op; RETURN;
 END IF;
 IF e.status NOT IN('held','pending_review','awaiting_homeowner_approval') OR
    e.payee_id IS DISTINCT FROM j.contractor_id OR e.payee_id IS NULL OR
    p_reason IS NULL OR length(p_reason) NOT BETWEEN 5 AND 500 OR
    p_fee_rate IS NULL OR p_fee_rate<0 OR p_fee_rate>1 OR p_fee_rate='NaN'::numeric OR
    EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.contractor_payout_credit_events WHERE job_id=j.id) OR
    EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND state IN('reserved','pending','requires_action','reconciliation_required')) THEN
  RAISE EXCEPTION 'Escrow is not available for admin release' USING ERRCODE='23514'; END IF;
 SELECT stripe_connect_account_id INTO destination_key FROM public.profiles
 WHERE id=e.payee_id AND deleted_at IS NULL AND stripe_payouts_enabled IS TRUE AND stripe_transfers_active IS TRUE;
 IF destination_key IS NULL OR length(destination_key)=0 THEN RAISE EXCEPTION 'Contractor payout setup incomplete' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id;
 IF FOUND THEN
  IF b.needs_review OR b.gross_minor<>round(e.amount*100) THEN RAISE EXCEPTION 'Refund balance requires reconciliation' USING ERRCODE='23514'; END IF;
  available:=b.remaining_minor;
 ELSE available:=round(e.amount*100); END IF;
 IF available IS NULL OR available<=0 THEN RAISE EXCEPTION 'No principal remains' USING ERRCODE='23514'; END IF;
 fee:=least(available,greatest(50,round(available*p_fee_rate)::integer));
 INSERT INTO public.escrow_admin_release_operations(escrow_id,initiated_by,reason,principal_minor,fee_minor,payout_minor,destination)
 VALUES(e.id,p_admin_id,p_reason,available,fee,available-fee,destination_key) RETURNING * INTO op;
 UPDATE public.escrow_transactions SET status='release_pending',release_reason='admin_release_pending',
 reconciliation_id=op.id,transfer_attempted_at=now(),updated_at=now() WHERE id=e.id;
 RETURN NEXT op;
END $$;
REVOKE ALL ON FUNCTION public.reserve_admin_escrow_release(uuid,uuid,text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_admin_escrow_release(uuid,uuid,text,numeric) TO service_role;


CREATE FUNCTION public.finalize_admin_escrow_release(p_operation_id uuid,p_transfer_id text)
RETURNS SETOF public.escrow_admin_release_operations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE op public.escrow_admin_release_operations; e public.escrow_transactions;
 t public.escrow_transfer_attempts; job_key uuid; escrow_key uuid;
BEGIN
 SELECT o.escrow_id,et.job_id INTO escrow_key,job_key FROM public.escrow_admin_release_operations o
 JOIN public.escrow_transactions et ON et.id=o.escrow_id WHERE o.id=p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Release operation missing' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=escrow_key FOR UPDATE;
 SELECT * INTO op FROM public.escrow_admin_release_operations WHERE id=p_operation_id FOR UPDATE;
 IF op.state='completed' THEN
  IF op.transfer_id IS DISTINCT FROM p_transfer_id THEN RAISE EXCEPTION 'Transfer identity changed' USING ERRCODE='23514'; END IF;
  RETURN NEXT op; RETURN;
 END IF;
 IF e.status<>'release_pending' OR e.reconciliation_id IS DISTINCT FROM op.id OR e.release_reason<>'admin_release_pending' THEN
  RAISE EXCEPTION 'Release claim changed' USING ERRCODE='23514'; END IF;
 IF op.payout_minor>0 THEN
  SELECT * INTO t FROM public.escrow_transfer_attempts WHERE escrow_id=e.id;
  IF NOT FOUND OR t.transfer_id IS NULL OR t.transfer_id IS DISTINCT FROM p_transfer_id OR
     (t.stripe_parameters->>'amount')::integer<>op.payout_minor OR t.stripe_parameters->>'destination' IS DISTINCT FROM op.destination THEN
   RAISE EXCEPTION 'Verified transfer missing or inconsistent' USING ERRCODE='23514'; END IF;
 ELSIF p_transfer_id IS NOT NULL OR EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) THEN
  RAISE EXCEPTION 'Fee-only release has a transfer' USING ERRCODE='23514';
 END IF;
 UPDATE public.escrow_admin_release_operations SET state='completed',transfer_id=p_transfer_id,completed_at=now()
 WHERE id=op.id RETURNING * INTO op;
 UPDATE public.escrow_transactions SET status='completed',transfer_id=p_transfer_id,platform_fee=op.fee_minor/100.0,
 contractor_payout=op.payout_minor/100.0,released_at=now(),updated_at=now() WHERE id=e.id;
 UPDATE public.jobs SET payment_status='paid',updated_at=now() WHERE id=job_key;
 INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
 SELECT recipient,'Payment release confirmed',
 'An administrator confirmed a contractor payout of GBP '||(op.payout_minor/100.0)::numeric(10,2)::text||
 ' and a platform fee of GBP '||(op.fee_minor/100.0)::numeric(10,2)::text||'.',
 'payment','/payments/'||e.id::text,jsonb_build_object('releaseOperationId',op.id,'escrowTransactionId',e.id,'jobId',job_key)
 FROM (SELECT DISTINCT unnest(ARRAY[e.payer_id,e.payee_id]) AS recipient) recipients WHERE recipient IS NOT NULL;
 INSERT INTO public.audit_logs(user_id,table_name,record_id,action,new_values)
 VALUES(op.initiated_by,'escrow_transactions',e.id,'UPDATE',jsonb_build_object('event','ADMIN_ESCROW_RELEASE',
 'operation_id',op.id,'principal_minor',op.principal_minor,'fee_minor',op.fee_minor,'payout_minor',op.payout_minor,'reason',op.reason));
 RETURN NEXT op;
END $$;
REVOKE ALL ON FUNCTION public.finalize_admin_escrow_release(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_admin_escrow_release(uuid,text) TO service_role;

CREATE FUNCTION public.guard_pending_admin_release_job() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.contractor_id IS DISTINCT FROM OLD.contractor_id) AND EXISTS(
  SELECT FROM public.escrow_admin_release_operations o JOIN public.escrow_transactions e ON e.id=o.escrow_id
  WHERE e.job_id=OLD.id AND o.state='reserved') THEN
  RAISE EXCEPTION 'Admin payment release must reconcile before changing the job' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_pending_admin_release_job() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_pending_admin_release_job BEFORE UPDATE OF status,contractor_id ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.guard_pending_admin_release_job();
