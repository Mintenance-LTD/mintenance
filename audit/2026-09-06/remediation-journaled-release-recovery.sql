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
SET LOCAL ROLE service_role;
DO $$
DECLARE f public.payment_funding_reservations; e public.escrow_transactions; r public.escrow_refund_operations;
 actor uuid:='fa140909-0000-4000-8000-000000000201';
 contractor uuid:='fa140909-0000-4000-8000-000000000202';
 job uuid:='fa140909-0000-4000-8000-000000000210';
BEGIN
 SELECT * INTO f FROM public.reserve_payment_funding(actor,job,'fa140909-0000-4000-8000-000000000220','fa140909-0000-4000-8000-000000000230','payout-funding',50000);
 SELECT * INTO e FROM public.attach_payment_funding(f.id,'pi_payout_fixture');
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;

 -- Unfinished work cannot be released.
 BEGIN
  PERFORM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid());
  RAISE EXCEPTION 'Unfinished job was claimed';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO r FROM public.reserve_escrow_refund(actor,job,e.id,'claim-refund',10000,'Synthetic');
 PERFORM public.record_escrow_refund_outcome(r.id,'re_claim_fixture','succeeded');
 UPDATE public.jobs SET status='assigned' WHERE id=job;
 UPDATE public.jobs SET status='in_progress' WHERE id=job;
 UPDATE public.jobs SET status='completed' WHERE id=job;
 INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified) VALUES(job,'https://example.invalid/synthetic-after','after',true);
 PERFORM public.approve_job_completion(job,actor,NULL,e.id,NULL,false,true);
 IF (SELECT remaining_minor FROM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid())) IS DISTINCT FROM 40000 THEN
  RAISE EXCEPTION 'Claim did not return remaining principal'; END IF;
 IF EXISTS(SELECT 1 FROM public.claim_escrow_release(e.id,'auto_release',gen_random_uuid())) THEN
  RAISE EXCEPTION 'Second claimant acquired same escrow'; END IF;
 BEGIN
  PERFORM public.reserve_escrow_refund(actor,job,e.id,'after-claim',1000,'Synthetic');
  RAISE EXCEPTION 'Claimed principal was refunded';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- No journal means recovery is not yet safe.
 IF EXISTS(SELECT 1 FROM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid())) THEN
  RAISE EXCEPTION 'Unjournaled claim was adopted'; END IF;
 PERFORM public.reserve_escrow_transfer(e.id,35000,'acct_refund_synthetic');
 SELECT * INTO e FROM public.escrow_transactions WHERE id=e.id;
 IF (SELECT remaining_minor FROM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid())) IS DISTINCT FROM 40000 THEN
  RAISE EXCEPTION 'Journaled release did not resume'; END IF;
 IF (SELECT reconciliation_id FROM public.escrow_transactions WHERE id=e.id) IS DISTINCT FROM e.reconciliation_id THEN
  RAISE EXCEPTION 'Retry replaced original reconciliation ID'; END IF;
 IF EXISTS(SELECT 1 FROM public.claim_escrow_release(e.id,'dispute_resolved',gen_random_uuid())) THEN
  RAISE EXCEPTION 'Changed operation adopted existing payout'; END IF;
 UPDATE public.escrow_transactions SET homeowner_approval=false WHERE id=e.id;
 BEGIN
  PERFORM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid());
  RAISE EXCEPTION 'Recovery bypassed approval';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.escrow_transactions SET homeowner_approval=true,cooling_off_ends_at=now()+interval '1 day' WHERE id=e.id;
 BEGIN
  PERFORM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid());
  RAISE EXCEPTION 'Recovery bypassed cooling period';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.escrow_transactions SET cooling_off_ends_at=null,status='held' WHERE id=e.id;
 DELETE FROM public.escrow_transfer_attempts WHERE escrow_id=e.id;
 PERFORM public.flag_escrow_refund_review(e.id);
 BEGIN
  PERFORM public.claim_escrow_release(e.id,'manual_release',gen_random_uuid());
  RAISE EXCEPTION 'Review-held escrow was released';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.claim_escrow_release(uuid,text,uuid)','EXECUTE') OR
    has_function_privilege('authenticated','public.claim_escrow_release(uuid,text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Untrusted client may claim release'; END IF;
END $$;
ROLLBACK;

