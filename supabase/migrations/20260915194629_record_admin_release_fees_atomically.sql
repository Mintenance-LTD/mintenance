-- A provider processing cost is unknown until reconciled, not zero.
ALTER TABLE public.platform_fee_transfers ALTER COLUMN net_revenue DROP NOT NULL;

CREATE FUNCTION public.record_admin_release_fee() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions;
BEGIN
 IF NEW.state<>'completed' OR OLD.state='completed' THEN RETURN NEW; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=NEW.escrow_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Release escrow missing' USING ERRCODE='23514'; END IF;
 -- Never silently combine or overwrite earlier accounting for this escrow.
 IF EXISTS(SELECT FROM public.platform_fee_transfers WHERE escrow_transaction_id=e.id) THEN
  RAISE EXCEPTION 'Existing fee accounting requires reconciliation' USING ERRCODE='23514'; END IF;
 INSERT INTO public.platform_fee_transfers(
  id,escrow_transaction_id,job_id,contractor_id,amount,currency,
  stripe_processing_fee,net_revenue,stripe_payment_intent_id,status,transferred_at,metadata)
 VALUES(NEW.id,e.id,e.job_id,e.payee_id,NEW.fee_minor/100.0,'gbp',
  NULL,NULL,e.payment_intent_id,'transferred',now(),
  jsonb_build_object('releaseOperationId',NEW.id,'processingFeeStatus','pending',
   'principalMinor',NEW.principal_minor,'payoutMinor',NEW.payout_minor,
   'accountingMeaning','platform fee retained; not a separate bank transfer'));
 UPDATE public.escrow_transactions SET fee_transfer_status='transferred',fee_transferred_at=now(),
  stripe_processing_fee=NULL WHERE id=e.id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_admin_release_fee() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER record_admin_release_fee AFTER UPDATE OF state ON public.escrow_admin_release_operations
FOR EACH ROW EXECUTE FUNCTION public.record_admin_release_fee();

-- Detect conflicting accounting before any new provider transfer.
CREATE OR REPLACE FUNCTION public.reserve_admin_escrow_release(p_admin_id uuid,p_escrow_id uuid,p_reason text,p_fee_rate numeric)
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
    EXISTS(SELECT FROM public.platform_fee_transfers WHERE escrow_transaction_id=e.id) OR
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
