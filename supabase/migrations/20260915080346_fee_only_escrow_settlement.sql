CREATE TABLE public.escrow_fee_only_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 escrow_id uuid NOT NULL UNIQUE REFERENCES public.escrow_transactions(id),
 principal_minor integer NOT NULL CHECK(principal_minor BETWEEN 1 AND 50),
 actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.escrow_fee_only_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.escrow_fee_only_settlements FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.escrow_fee_only_settlements TO service_role;

CREATE FUNCTION public.settle_fee_only_escrow(p_escrow_id uuid,p_fee_minor integer,p_actor_id uuid)
RETURNS SETOF public.escrow_fee_only_settlements
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions; j public.jobs; b public.escrow_refund_balances;
 s public.escrow_fee_only_settlements; job_key uuid; available integer; actor_role_value text;
BEGIN
 SELECT job_id INTO job_key FROM public.escrow_transactions WHERE id=p_escrow_id;
 SELECT * INTO j FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR e.job_id IS DISTINCT FROM j.id THEN
  RAISE EXCEPTION 'Escrow not found' USING ERRCODE='23514'; END IF;
 IF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM j.homeowner_id AND
    p_actor_id IS DISTINCT FROM j.payer_user_id AND NOT EXISTS(
     SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN
  RAISE EXCEPTION 'Unauthorized settlement actor' USING ERRCODE='42501'; END IF;
 actor_role_value:=CASE WHEN p_actor_id IS NULL THEN 'system' ELSE (SELECT role FROM public.profiles WHERE id=p_actor_id) END;
 SELECT * INTO s FROM public.escrow_fee_only_settlements WHERE escrow_id=e.id;
 IF FOUND THEN
  IF s.principal_minor IS DISTINCT FROM p_fee_minor THEN
   RAISE EXCEPTION 'Settlement terms changed' USING ERRCODE='23514'; END IF;
  RETURN NEXT s; RETURN;
 END IF;
 IF j.status<>'completed' OR e.status<>'release_pending' OR e.release_reason='refund_pending' OR
    e.payee_id IS DISTINCT FROM j.contractor_id OR e.transfer_id IS NOT NULL OR
    EXISTS(SELECT 1 FROM public.escrow_transfer_attempts WHERE escrow_id=e.id) OR
    EXISTS(SELECT 1 FROM public.contractor_payout_credit_events WHERE job_id=j.id) THEN
  RAISE EXCEPTION 'Escrow cannot be settled without a payout' USING ERRCODE='23514'; END IF;
 SELECT * INTO b FROM public.escrow_refund_balances WHERE escrow_id=e.id;
 IF FOUND THEN
  IF b.needs_review OR b.gross_minor<>round(e.amount*100) OR EXISTS(
   SELECT 1 FROM public.escrow_refund_operations WHERE escrow_id=e.id AND
    state IN('reserved','pending','requires_action','reconciliation_required')) THEN
   RAISE EXCEPTION 'Refund requires reconciliation' USING ERRCODE='23514'; END IF;
  available:=b.remaining_minor;
 ELSE available:=round(e.amount*100); END IF;
 IF p_fee_minor IS NULL OR p_fee_minor NOT BETWEEN 1 AND 50 OR p_fee_minor IS DISTINCT FROM available THEN
  RAISE EXCEPTION 'Fee does not equal remaining principal' USING ERRCODE='23514'; END IF;
 INSERT INTO public.escrow_fee_only_settlements(escrow_id,principal_minor,actor_id)
 VALUES(e.id,available,p_actor_id) RETURNING * INTO s;
 UPDATE public.escrow_transactions SET status='completed',released_at=now(),platform_fee=available/100.0,
  contractor_payout=0,transfer_id=NULL,updated_at=now() WHERE id=e.id;
 UPDATE public.jobs SET payment_status='paid',updated_at=now() WHERE id=j.id;
 INSERT INTO public.escrow_audit_log(escrow_transaction_id,action,actor_id,actor_role,job_id,
  amount,platform_fee,contractor_payout,release_reason,is_admin_action,metadata)
 VALUES(e.id,'released',p_actor_id,actor_role_value,j.id,
  available/100.0,available/100.0,0,e.release_reason,actor_role_value='admin',jsonb_build_object('settlementType','fee_only','settlementId',s.id));
 INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
 SELECT recipient,'Payment settled',
  'The remaining GBP '||(available/100.0)::numeric(10,2)::text||' was applied to the platform fee. No contractor payout is due.',
  'payment','/payments/'||e.id::text,jsonb_build_object('escrowTransactionId',e.id,'settlementId',s.id,'settlementType','fee_only')
 FROM (SELECT DISTINCT unnest(ARRAY[e.payer_id,e.payee_id]) AS recipient) recipients WHERE recipient IS NOT NULL;
 RETURN NEXT s;
END $$;
REVOKE ALL ON FUNCTION public.settle_fee_only_escrow(uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_fee_only_escrow(uuid,integer,uuid) TO service_role;

CREATE FUNCTION public.guard_fee_only_settlement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM 'completed' AND EXISTS(
  SELECT 1 FROM public.escrow_fee_only_settlements WHERE escrow_id=NEW.id) THEN
  RAISE EXCEPTION 'Settled escrow cannot be reopened' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_fee_only_settlement() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_fee_only_settlement BEFORE UPDATE OF status ON public.escrow_transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_fee_only_settlement();
