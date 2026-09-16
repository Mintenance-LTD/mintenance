CREATE TABLE public.job_exit_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.jobs(id),
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 contractor_id uuid NOT NULL REFERENCES public.profiles(id),
 kind text NOT NULL CHECK(kind IN('withdraw','terminate')),
 reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 1000),
 request_key text NOT NULL UNIQUE CHECK(length(request_key) BETWEEN 1 AND 255),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','completed')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE UNIQUE INDEX one_pending_job_exit ON public.job_exit_operations(job_id) WHERE state='reserved';
ALTER TABLE public.job_exit_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_exit_operations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.job_exit_operations TO service_role;
ALTER TABLE public.escrow_refund_operations ADD COLUMN job_exit_id uuid REFERENCES public.job_exit_operations(id);
CREATE INDEX escrow_refund_job_exit ON public.escrow_refund_operations(job_exit_id) WHERE job_exit_id IS NOT NULL;

CREATE FUNCTION public.guard_pending_job_exit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE job_key uuid;
BEGIN
 IF TG_TABLE_NAME='jobs' THEN
  IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.contractor_id IS NOT DISTINCT FROM OLD.contractor_id AND NEW.homeowner_id IS NOT DISTINCT FROM OLD.homeowner_id AND NEW.payer_user_id IS NOT DISTINCT FROM OLD.payer_user_id THEN RETURN NEW; END IF;
  job_key:=NEW.id;
 ELSE job_key:=NEW.job_id;
 END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 IF EXISTS(SELECT FROM public.job_exit_operations WHERE job_id=job_key AND state='reserved') THEN
  RAISE EXCEPTION 'Job exit must reconcile before changing this assignment' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_pending_job_exit() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_pending_job_exit BEFORE UPDATE OF status,contractor_id,homeowner_id,payer_user_id ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.guard_pending_job_exit();
CREATE TRIGGER guard_pending_job_exit BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_pending_job_exit();
CREATE TRIGGER guard_pending_job_exit BEFORE INSERT OR UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.guard_pending_job_exit();
CREATE TRIGGER guard_pending_job_exit BEFORE INSERT ON public.payment_funding_reservations FOR EACH ROW EXECUTE FUNCTION public.guard_pending_job_exit();
CREATE TRIGGER guard_pending_job_exit BEFORE INSERT ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_pending_job_exit();

CREATE FUNCTION public.reserve_job_exit_refund(p_exit_id uuid,p_escrow_id uuid)
RETURNS SETOF public.escrow_refund_operations LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs; e public.escrow_transactions; b public.escrow_refund_balances;
 r public.escrow_refund_operations; funding public.payment_funding_reservations;
 x public.job_exit_operations; p_actor_id uuid; p_job_id uuid; p_request_key text; p_gross_minor integer; p_reason text; cash integer; credit integer; operation_id uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO x FROM public.job_exit_operations WHERE id=p_exit_id;
 IF NOT FOUND OR x.state<>'reserved' THEN RAISE EXCEPTION 'Active job exit required' USING ERRCODE='23514'; END IF;
 p_job_id:=x.job_id; p_request_key:='job_exit_'||x.id::text||'_'||p_escrow_id::text||'_'||operation_id::text; p_reason:=x.reason;
 -- Preserve job-before-escrow lock order.
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund job missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id<>j.id OR e.payer_id IS NULL THEN
  RAISE EXCEPTION 'Escrow does not belong to this payer and job' USING ERRCODE='42501'; END IF;
 p_actor_id:=e.payer_id;
 SELECT * INTO r FROM public.escrow_refund_operations WHERE job_exit_id=x.id AND escrow_id=p_escrow_id
 ORDER BY (state NOT IN('failed','canceled')) DESC,created_at DESC,id DESC LIMIT 1;
 IF FOUND THEN
  IF r.job_exit_id IS DISTINCT FROM x.id OR r.actor_id<>p_actor_id OR r.escrow_id<>p_escrow_id OR r.reason<>p_reason THEN
   RAISE EXCEPTION 'Refund request identity changed' USING ERRCODE='23514'; END IF;
  IF r.state NOT IN('failed','canceled') THEN RETURN NEXT r; RETURN; END IF;
 END IF;
 IF e.status NOT IN('held','pending_review','awaiting_homeowner_approval') OR
    e.payment_intent_id IS NULL OR EXISTS(SELECT FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT FROM public.contractor_payout_credit_events WHERE job_id=j.id) THEN
  RAISE EXCEPTION 'Escrow cannot be claimed for refund' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=e.id AND
  state IN('reserved','pending','requires_action','reconciliation_required')) THEN
  RAISE EXCEPTION 'Another refund requires recovery' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id;
 IF NOT FOUND THEN
  SELECT * INTO funding FROM public.payment_funding_reservations WHERE escrow_id=e.id;
  IF FOUND THEN
   IF funding.state<>'attached' OR funding.payer_id<>p_actor_id OR funding.payment_intent_id<>e.payment_intent_id
     OR funding.gross_minor<>round(e.amount*100) THEN
    RAISE EXCEPTION 'Funding requires reconciliation' USING ERRCODE='23514'; END IF;
   cash:=funding.cash_minor; credit:=funding.credit_minor;
  ELSE
   IF coalesce(e.metadata->>'credit_applied_pence','0')<>'0' THEN
    RAISE EXCEPTION 'Legacy credit funding requires reconciliation' USING ERRCODE='23514'; END IF;
   cash:=round(e.amount*100); credit:=0;
  END IF;
  INSERT INTO public.escrow_refund_balances(escrow_id,gross_minor,cash_minor,credit_minor)
   VALUES(e.id,cash+credit,cash,credit) RETURNING * INTO b;
 END IF;
 p_gross_minor:=b.remaining_minor;
 IF b.needs_review OR p_gross_minor<=0 THEN
  RAISE EXCEPTION 'Refund exceeds available balance or requires reconciliation' USING ERRCODE='23514'; END IF;
 cash:=least(p_gross_minor,b.cash_minor-b.cash_refunded_minor);
 credit:=p_gross_minor-cash;
 INSERT INTO public.escrow_refund_operations(id,escrow_id,actor_id,job_exit_id,request_key,gross_minor,cash_minor,
  credit_minor,reason,payment_intent_id,stripe_parameters)
 VALUES(operation_id,e.id,p_actor_id,x.id,p_request_key,p_gross_minor,cash,credit,p_reason,e.payment_intent_id,
  jsonb_build_object('payment_intent',e.payment_intent_id,'amount',cash,'reason','requested_by_customer',
   'metadata',jsonb_build_object('refundOperationId',operation_id::text,'escrowTransactionId',e.id::text,
    'jobId',j.id::text,'requestedBy',x.actor_id::text,'payerId',p_actor_id::text))) RETURNING * INTO r;
 UPDATE public.escrow_transactions SET status='release_pending',release_reason='refund_pending',updated_at=now() WHERE id=e.id;
 RETURN NEXT r;
END $$;

REVOKE ALL ON FUNCTION public.reserve_job_exit_refund(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.finalize_job_exit(p_exit_id uuid) RETURNS SETOF public.job_exit_operations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE x public.job_exit_operations; j public.jobs;
BEGIN
 SELECT * INTO x FROM public.job_exit_operations WHERE id=p_exit_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job exit missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=x.job_id FOR UPDATE;
 SELECT * INTO x FROM public.job_exit_operations WHERE id=p_exit_id FOR UPDATE;
 IF x.state='completed' THEN RETURN NEXT x; RETURN; END IF;
 IF j.contractor_id IS DISTINCT FROM x.contractor_id OR j.status NOT IN('assigned','in_progress') THEN
  RAISE EXCEPTION 'Job exit assignment changed' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT FROM public.escrow_refund_operations WHERE job_exit_id=x.id AND state NOT IN('succeeded','failed','canceled')) THEN
  RETURN NEXT x; RETURN; END IF;
 IF EXISTS(SELECT FROM public.escrow_transactions WHERE job_id=j.id AND status<>'refunded') THEN
  RAISE EXCEPTION 'Job payment requires reconciliation' USING ERRCODE='23514'; END IF;
 UPDATE public.job_exit_operations SET state='completed',completed_at=now() WHERE id=x.id RETURNING * INTO x;
 -- Credits were restored by refund settlement. Retire only the funding claim;
 -- calling funding cancellation here would risk a second credit restoration.
 UPDATE public.payment_funding_reservations SET state='cancelled',cancelled_at=now()
 WHERE job_id=j.id AND state='attached';
 UPDATE public.contracts SET status='cancelled',updated_at=now() WHERE job_id=j.id AND contractor_id=x.contractor_id
  AND status IN('draft','pending_homeowner','pending_contractor','accepted');
 UPDATE public.bids SET status=CASE WHEN x.kind='withdraw' THEN 'withdrawn' ELSE 'rejected' END,updated_at=now()
  WHERE job_id=j.id AND contractor_id=x.contractor_id AND status='accepted';
 UPDATE public.jobs SET status='posted',contractor_id=NULL,
  payment_status=CASE WHEN EXISTS(SELECT FROM public.escrow_transactions WHERE job_id=j.id) THEN 'refunded' ELSE 'pending' END,
  updated_at=now() WHERE id=j.id;
 INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
 SELECT recipient,'Contractor assignment ended','The job is open for new bids. Any linked refund has been confirmed.',
  'job_terminated','/jobs/'||j.id::text,jsonb_build_object('jobId',j.id,'jobExitId',x.id,'reason',x.reason)
 FROM (SELECT DISTINCT unnest(ARRAY[j.homeowner_id,x.contractor_id,j.payer_user_id]) AS recipient
 UNION SELECT payer_id FROM public.escrow_transactions WHERE job_id=j.id) r WHERE recipient IS NOT NULL;
 INSERT INTO public.audit_logs(user_id,table_name,record_id,action,new_values)
 VALUES(x.actor_id,'jobs',j.id,'UPDATE',jsonb_build_object('event','JOB_EXIT_COMPLETED','jobExitId',x.id,'kind',x.kind));
 RETURN NEXT x;
END $$;
REVOKE ALL ON FUNCTION public.finalize_job_exit(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.reserve_job_exit(p_actor_id uuid,p_job_id uuid,p_kind text,p_reason text,p_request_key text)
RETURNS SETOF public.job_exit_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs; x public.job_exit_operations; e public.escrow_transactions; actor_role text;
BEGIN
 SELECT role INTO actor_role FROM public.profiles WHERE id=p_actor_id AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current user required' USING ERRCODE='42501'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job missing' USING ERRCODE='23514'; END IF;
 SELECT * INTO x FROM public.job_exit_operations WHERE request_key=p_request_key;
 IF FOUND THEN
  IF x.actor_id<>p_actor_id OR x.job_id<>p_job_id OR x.kind IS DISTINCT FROM p_kind OR x.reason IS DISTINCT FROM p_reason THEN
   RAISE EXCEPTION 'Job exit request changed' USING ERRCODE='23514'; END IF;
  IF x.state='completed' THEN RETURN NEXT x; RETURN; END IF;
  IF j.contractor_id IS DISTINCT FROM x.contractor_id OR j.status NOT IN('assigned','in_progress') THEN
   RAISE EXCEPTION 'Job exit assignment changed' USING ERRCODE='23514'; END IF;
  FOR e IN SELECT * FROM public.escrow_transactions WHERE job_id=j.id AND status<>'refunded' ORDER BY id FOR UPDATE LOOP
   PERFORM public.reserve_job_exit_refund(x.id,e.id);
  END LOOP;
  RETURN QUERY SELECT * FROM public.finalize_job_exit(x.id); RETURN;
 END IF;
 IF p_kind IS NULL OR p_kind NOT IN('withdraw','terminate') OR
   (p_kind='withdraw' AND (actor_role<>'contractor' OR j.contractor_id IS DISTINCT FROM p_actor_id)) OR
   (p_kind='terminate' AND (actor_role<>'homeowner' OR (j.homeowner_id IS DISTINCT FROM p_actor_id AND j.payer_user_id IS DISTINCT FROM p_actor_id))) THEN
  RAISE EXCEPTION 'Job exit not authorized' USING ERRCODE='42501'; END IF;
 IF j.status NOT IN('assigned','in_progress') OR j.contractor_id IS NULL THEN
  RAISE EXCEPTION 'Job cannot exit this assignment' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT FROM public.payment_funding_reservations WHERE job_id=j.id AND state NOT IN('attached','cancelled')) OR
    EXISTS(SELECT FROM public.contractor_payout_credit_events WHERE job_id=j.id) THEN
  RAISE EXCEPTION 'Payment operation must reconcile before job exit' USING ERRCODE='23514'; END IF;
 INSERT INTO public.job_exit_operations(job_id,actor_id,contractor_id,kind,reason,request_key)
 VALUES(j.id,p_actor_id,j.contractor_id,p_kind,p_reason,p_request_key) RETURNING * INTO x;
 FOR e IN SELECT * FROM public.escrow_transactions WHERE job_id=j.id ORDER BY id FOR UPDATE LOOP
  IF e.status='refunded' THEN CONTINUE; END IF;
  IF e.payee_id IS DISTINCT FROM x.contractor_id THEN RAISE EXCEPTION 'Payment recipient changed' USING ERRCODE='23514'; END IF;
  PERFORM public.reserve_job_exit_refund(x.id,e.id);
 END LOOP;
 RETURN QUERY SELECT * FROM public.finalize_job_exit(x.id);
END $$;
REVOKE ALL ON FUNCTION public.reserve_job_exit(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_job_exit(uuid,uuid,text,text,text) TO service_role;

CREATE FUNCTION public.complete_refunded_job_exit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.job_exit_id IS NOT NULL AND NEW.state='succeeded' AND OLD.state<>'succeeded' THEN
  PERFORM public.finalize_job_exit(NEW.job_exit_id);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.complete_refunded_job_exit() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER complete_refunded_job_exit AFTER UPDATE OF state ON public.escrow_refund_operations
FOR EACH ROW EXECUTE FUNCTION public.complete_refunded_job_exit();

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
   UPDATE public.jobs SET status='cancelled',payment_status='refunded',updated_at=now() WHERE id=e.job_id;
  END IF;
 ELSIF p_state IN('failed','canceled') THEN
  UPDATE public.escrow_transactions SET status='held',release_reason=NULL,updated_at=now() WHERE id=e.id;
 END IF;
 UPDATE public.escrow_refund_operations SET provider_refund_id=p_refund_id,state=p_state,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN NEXT r;
END $$;

CREATE FUNCTION public.guard_job_exit_financial_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE escrow_key uuid; job_key uuid; exit_key uuid;
BEGIN
 IF TG_TABLE_NAME='escrow_transactions' THEN
  IF NEW.status<>'release_pending' OR NEW.release_reason IS NOT DISTINCT FROM 'refund_pending' THEN RETURN NEW; END IF;
  escrow_key:=NEW.id;
 ELSE escrow_key:=NEW.escrow_id;
 END IF;
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=escrow_key;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT id INTO exit_key FROM public.job_exit_operations WHERE job_id=job_key AND state='reserved';
 IF exit_key IS NOT NULL THEN
  IF TG_TABLE_NAME='escrow_refund_operations' THEN
   IF NEW.job_exit_id=exit_key THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'Job exit must reconcile before another payment operation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_job_exit_financial_claim() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_job_exit_financial_claim BEFORE INSERT ON public.escrow_refund_operations FOR EACH ROW EXECUTE FUNCTION public.guard_job_exit_financial_claim();
CREATE TRIGGER guard_job_exit_financial_claim BEFORE INSERT ON public.escrow_transfer_attempts FOR EACH ROW EXECUTE FUNCTION public.guard_job_exit_financial_claim();
CREATE TRIGGER guard_job_exit_financial_claim BEFORE UPDATE OF status,release_reason ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_job_exit_financial_claim();
