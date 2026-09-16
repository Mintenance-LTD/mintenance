\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fa140909-0000-4000-8000-000000000201','funding-owner@example.invalid','{}'),
 ('fa140909-0000-4000-8000-000000000202','funding-contractor@example.invalid','{}'),
 ('fa140909-0000-4000-8000-000000000203','funding-unrelated@example.invalid','{}');
UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_refund_synthetic' WHERE id='fa140909-0000-4000-8000-000000000202';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
 VALUES('fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202','Synthetic audit','Synthetic maintenance description for funding audit','Synthetic','posted');
INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status)
 VALUES('fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000202',500,'Synthetic accepted bid','accepted');
INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status)
 VALUES('fa140909-0000-4000-8000-000000000230','fa140909-0000-4000-8000-000000000210','fa140909-0000-4000-8000-000000000201','fa140909-0000-4000-8000-000000000202',500,'accepted');
INSERT INTO public.user_credits(user_id,balance_pence)
 VALUES('fa140909-0000-4000-8000-000000000201',5000);

UPDATE public.profiles SET role='admin' WHERE id='fa140909-0000-4000-8000-000000000203';
CREATE FUNCTION pg_temp.fail_admin_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('audit.fail_admin_notification',true)='on' THEN
  RAISE EXCEPTION 'Synthetic notification failure' USING ERRCODE='ZX001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_fail_admin_notification BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_admin_notification();

-- Hide any other disposable fixtures for this rollback-only claim test.
UPDATE public.escrow_refund_operations SET recovery_after=now()+interval '1 day';
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions;
 r public.escrow_refund_operations; first_claim public.escrow_refund_operations; second_claim public.escrow_refund_operations;
 payer uuid:='fa140909-0000-4000-8000-000000000201';
 administrator uuid:='fa140909-0000-4000-8000-000000000203';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(payer,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','lease-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_lease_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 SELECT * INTO r FROM public.reserve_admin_escrow_refund(administrator,job,e.id,'lease-refund',10000,'Synthetic');
 IF EXISTS(SELECT FROM public.claim_refund_recovery()) THEN RAISE EXCEPTION 'Fresh request claimed too early'; END IF;
 UPDATE public.escrow_refund_operations SET created_at=now()-interval '5 minutes' WHERE id=r.id;
 SELECT * INTO first_claim FROM public.claim_refund_recovery();
 IF first_claim.id IS DISTINCT FROM r.id OR first_claim.recovery_token IS NULL THEN RAISE EXCEPTION 'Due refund not claimed'; END IF;
 IF EXISTS(SELECT FROM public.claim_refund_recovery()) THEN RAISE EXCEPTION 'Live lease claimed twice'; END IF;
 IF public.finish_refund_recovery(r.id,gen_random_uuid(),NULL) THEN RAISE EXCEPTION 'Wrong token acknowledged'; END IF;
 UPDATE public.escrow_refund_operations SET recovery_lease_until=now()-interval '1 second' WHERE id=r.id;
 IF public.finish_refund_recovery(r.id,first_claim.recovery_token,NULL) THEN RAISE EXCEPTION 'Expired token acknowledged'; END IF;
 SELECT * INTO second_claim FROM public.claim_refund_recovery();
 IF second_claim.recovery_token IS NOT DISTINCT FROM first_claim.recovery_token THEN RAISE EXCEPTION 'Takeover did not rotate token'; END IF;
 IF public.finish_refund_recovery(r.id,first_claim.recovery_token,NULL) THEN RAISE EXCEPTION 'Stale worker acknowledged replacement'; END IF;
 IF NOT public.finish_refund_recovery(r.id,second_claim.recovery_token,'provider_unavailable') THEN RAISE EXCEPTION 'Current worker could not acknowledge'; END IF;
 IF EXISTS(SELECT FROM public.claim_refund_recovery()) THEN RAISE EXCEPTION 'Backoff ignored'; END IF;
 IF has_function_privilege('authenticated','public.claim_refund_recovery()','EXECUTE') OR
    has_function_privilege('anon','public.finish_refund_recovery(uuid,uuid,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Client can claim or acknowledge internal recovery'; END IF;
END $$;
ROLLBACK;
