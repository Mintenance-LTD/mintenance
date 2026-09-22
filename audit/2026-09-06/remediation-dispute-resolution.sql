\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fc160906-0000-4000-8000-000000000001','review-owner@example.invalid'),
 ('fc160906-0000-4000-8000-000000000002','review-contractor@example.invalid'),
 ('fc160906-0000-4000-8000-000000000003','review-payer@example.invalid');
INSERT INTO public.jobs(id,homeowner_id,payer_user_id,contractor_id,title,description,location,status,completed_at)
 VALUES('fc160906-0000-4000-8000-000000000010','fc160906-0000-4000-8000-000000000001',
 'fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002',
 'Synthetic review','Synthetic maintenance review fixture','Synthetic','completed','2026-09-15T10:00:00Z');
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,photo_verification_status)
 VALUES('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000010',
 'fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002',500,'held','verified');
INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified)
 VALUES('fc160906-0000-4000-8000-000000000010','https://example.invalid/synthetic-review-after','after',true);

UPDATE public.profiles SET role='admin' WHERE id='fc160906-0000-4000-8000-000000000001';
UPDATE public.escrow_transactions SET amount=500.01 WHERE id='fc160906-0000-4000-8000-000000000020';
SELECT dispute_id FROM public.create_dispute_atomic('fc160906-0000-4000-8000-000000000020','fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000002','Incomplete repair','Synthetic dispute');
DO $$ DECLARE r public.escrow_dispute_resolutions; replay public.escrow_dispute_resolutions; BEGIN
 BEGIN
 PERFORM public.reserve_dispute_resolution('fc160906-0000-4000-8000-000000000003','fc160906-0000-4000-8000-000000000020','split_50_50','Synthetic decision',0.1);
 RAISE EXCEPTION 'Payer obtained admin authority';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT * INTO r FROM public.reserve_dispute_resolution('fc160906-0000-4000-8000-000000000001','fc160906-0000-4000-8000-000000000020','split_50_50','Synthetic decision',0.1);
 IF r.principal_minor<>50001 OR r.refund_minor<>25000 OR r.release_minor<>25001 OR r.state<>'processing' THEN RAISE EXCEPTION 'Split principal not frozen precisely'; END IF;
 SELECT * INTO replay FROM public.reserve_dispute_resolution('fc160906-0000-4000-8000-000000000001','fc160906-0000-4000-8000-000000000020','split_50_50','Synthetic decision',0.2);
 IF replay.id<>r.id OR replay.fee_rate<>0.1 OR replay.refund_minor<>25000 THEN RAISE EXCEPTION 'Replay recomputed frozen decision'; END IF;
 BEGIN
 PERFORM public.reserve_dispute_resolution('fc160906-0000-4000-8000-000000000001','fc160906-0000-4000-8000-000000000020','refund_homeowner','Synthetic decision',0.1);
 RAISE EXCEPTION 'Changed decision accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id=r.escrow_id AND status='disputed' AND admin_hold_status='admin_hold') THEN RAISE EXCEPTION 'Reservation lost dispute hold'; END IF;
 IF EXISTS(SELECT FROM public.escrow_refund_operations WHERE escrow_id=r.escrow_id) OR EXISTS(SELECT FROM public.escrow_admin_release_operations WHERE escrow_id=r.escrow_id) THEN RAISE EXCEPTION 'Decision alone created payment operation'; END IF;
 IF has_function_privilege('authenticated','public.reserve_dispute_resolution(uuid,uuid,text,text,numeric)','EXECUTE') OR has_table_privilege('authenticated','public.escrow_dispute_resolutions','UPDATE') THEN RAISE EXCEPTION 'Client can alter resolution'; END IF;
END $$;
-- Recovery leases survive a lost worker without allowing an expired worker to
-- acknowledge a replacement worker's claim. All fixtures are rolled back.
DO $$ DECLARE first_claim public.escrow_dispute_resolutions; next_claim public.escrow_dispute_resolutions; BEGIN
 IF has_function_privilege('anon','public.claim_dispute_resolution_recovery()','EXECUTE') OR
    has_function_privilege('authenticated','public.finish_dispute_resolution_recovery(uuid,uuid,text)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.claim_dispute_resolution_recovery()','EXECUTE') THEN
  RAISE EXCEPTION 'Incorrect recovery privileges'; END IF;
 IF EXISTS(SELECT FROM public.claim_dispute_resolution_recovery()) THEN RAISE EXCEPTION 'Fresh decision claimed too early'; END IF;
 UPDATE public.escrow_dispute_resolutions SET created_at=clock_timestamp()-interval '5 minutes',recovery_after=clock_timestamp()-interval '1 minute'
 WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 SELECT * INTO first_claim FROM public.claim_dispute_resolution_recovery();
 IF first_claim.id IS NULL OR first_claim.recovery_token IS NULL OR first_claim.recovery_attempts<>1 THEN RAISE EXCEPTION 'Lease not claimed'; END IF;
 IF EXISTS(SELECT FROM public.claim_dispute_resolution_recovery()) THEN RAISE EXCEPTION 'Active lease claimed twice'; END IF;
 IF public.finish_dispute_resolution_recovery(first_claim.id,gen_random_uuid(),NULL) THEN RAISE EXCEPTION 'Wrong token acknowledged lease'; END IF;
 UPDATE public.escrow_dispute_resolutions SET recovery_lease_until=clock_timestamp()-interval '1 second' WHERE id=first_claim.id;
 IF public.finish_dispute_resolution_recovery(first_claim.id,first_claim.recovery_token,NULL) THEN RAISE EXCEPTION 'Expired token acknowledged lease'; END IF;
 SELECT * INTO next_claim FROM public.claim_dispute_resolution_recovery();
 IF next_claim.id IS DISTINCT FROM first_claim.id OR next_claim.recovery_token IS NOT DISTINCT FROM first_claim.recovery_token OR
    next_claim.recovery_attempts<>2 THEN RAISE EXCEPTION 'Abandoned work not reclaimed'; END IF;
 IF public.finish_dispute_resolution_recovery(first_claim.id,first_claim.recovery_token,NULL) THEN RAISE EXCEPTION 'Stale worker acknowledged replacement'; END IF;
 IF NOT public.finish_dispute_resolution_recovery(next_claim.id,next_claim.recovery_token,'provider_unavailable') THEN RAISE EXCEPTION 'Current lease acknowledgement failed'; END IF;
 IF NOT EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE id=next_claim.id AND recovery_token IS NULL AND recovery_lease_until IS NULL
   AND recovery_error='provider_unavailable' AND recovery_after>clock_timestamp()+interval '3 minutes') THEN RAISE EXCEPTION 'Failure backoff missing'; END IF;
 IF EXISTS(SELECT FROM public.claim_dispute_resolution_recovery()) THEN RAISE EXCEPTION 'Backoff ignored'; END IF;
END $$;
DO $$ DECLARE rid uuid; BEGIN
 SELECT id INTO rid FROM public.escrow_dispute_resolutions WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 UPDATE public.profiles SET role='homeowner' WHERE id='fc160906-0000-4000-8000-000000000001';
 BEGIN
  PERFORM public.reserve_dispute_refund('fc160906-0000-4000-8000-000000000001',rid);
  RAISE EXCEPTION 'Revoked administrator reserved refund';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.reserve_dispute_release('fc160906-0000-4000-8000-000000000001',rid);
  RAISE EXCEPTION 'Revoked administrator reserved release';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.profiles SET role='admin' WHERE id='fc160906-0000-4000-8000-000000000001';
END $$;
UPDATE public.escrow_transactions SET payment_intent_id='pi_synthetic_dispute' WHERE id='fc160906-0000-4000-8000-000000000020';
DO $$ DECLARE rid uuid; first_op public.escrow_refund_operations; replay public.escrow_refund_operations; BEGIN
 SELECT id INTO rid FROM public.escrow_dispute_resolutions WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 SELECT * INTO first_op FROM public.reserve_dispute_refund('fc160906-0000-4000-8000-000000000001',rid);
 SELECT * INTO replay FROM public.reserve_dispute_refund('fc160906-0000-4000-8000-000000000001',rid);
 IF first_op.id IS NULL OR first_op.id<>replay.id OR first_op.gross_minor<>25000 OR first_op.cash_minor<>25000 OR first_op.credit_minor<>0 THEN RAISE EXCEPTION 'Refund reservation not frozen'; END IF;
 IF NOT EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE id=rid AND refund_operation_id=first_op.id AND state='processing') THEN RAISE EXCEPTION 'Refund not linked atomically'; END IF;
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id=first_op.escrow_id AND status='release_pending' AND release_reason='refund_pending' AND admin_hold_status='admin_hold') THEN RAISE EXCEPTION 'Refund claim missing'; END IF;
 IF (SELECT count(*) FROM public.escrow_refund_operations WHERE escrow_id=first_op.escrow_id)<>1 THEN RAISE EXCEPTION 'Retry duplicated refund'; END IF;
END $$;
UPDATE public.profiles SET stripe_connect_account_id='acct_synthetic_dispute',stripe_payouts_enabled=true,stripe_transfers_active=true WHERE id='fc160906-0000-4000-8000-000000000002';
DO $$ DECLARE r public.escrow_dispute_resolutions; op public.escrow_admin_release_operations; replay public.escrow_admin_release_operations; BEGIN
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 BEGIN
 PERFORM public.reserve_dispute_release('fc160906-0000-4000-8000-000000000001',r.id);
 RAISE EXCEPTION 'Release accepted before confirmed refund';
 EXCEPTION WHEN check_violation THEN NULL; END;
 -- Simulate the trusted provider-verification boundary; no provider is called.
 PERFORM public.record_escrow_refund_outcome(r.refund_operation_id,'re_synthetic_dispute','succeeded');
 BEGIN
 PERFORM public.reserve_admin_escrow_refund('fc160906-0000-4000-8000-000000000001','fc160906-0000-4000-8000-000000000010',r.escrow_id,'unrelated-refund',1,'Different refund');
 RAISE EXCEPTION 'Competing refund escaped frozen resolution';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
 PERFORM public.reserve_admin_escrow_release('fc160906-0000-4000-8000-000000000001',r.escrow_id,'Different release',0.1);
 RAISE EXCEPTION 'Competing release escaped frozen resolution';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO op FROM public.reserve_dispute_release('fc160906-0000-4000-8000-000000000001',r.id);
 SELECT * INTO replay FROM public.reserve_dispute_release('fc160906-0000-4000-8000-000000000001',r.id);
 IF op.id IS NULL OR op.id<>replay.id OR op.principal_minor<>25001 OR op.fee_minor<>2500 OR op.payout_minor<>22501 THEN RAISE EXCEPTION 'Split release not frozen correctly'; END IF;
 IF NOT EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE id=r.id AND release_operation_id=op.id AND state='processing') THEN RAISE EXCEPTION 'Release association missing'; END IF;
 BEGIN
 PERFORM public.finalize_dispute_resolution(r.id);
 RAISE EXCEPTION 'Unconfirmed transfer finalized dispute';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.disputes WHERE id=r.dispute_id AND status='open') THEN RAISE EXCEPTION 'Pending settlement closed dispute'; END IF;

END $$;
-- Simulated provider evidence exercises database finalization, not Stripe.
DO $$ DECLARE o public.escrow_admin_release_operations; BEGIN
 SELECT * INTO o FROM public.escrow_admin_release_operations WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 PERFORM public.reserve_escrow_transfer(o.escrow_id,o.payout_minor,o.destination);
 UPDATE public.escrow_transfer_attempts SET transfer_id='tr_synthetic_dispute' WHERE escrow_id=o.escrow_id;
 PERFORM public.finalize_admin_escrow_release(o.id,'tr_synthetic_dispute');
END $$;
CREATE FUNCTION public.audit_fail_dispute_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.metadata ? 'resolutionId' THEN RAISE EXCEPTION 'Synthetic resolution notice failure' USING ERRCODE='ZX002'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_fail_dispute_notice BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.audit_fail_dispute_notice();
DO $$ DECLARE r public.escrow_dispute_resolutions; BEGIN
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 BEGIN
 PERFORM public.finalize_dispute_resolution(r.id);
 RAISE EXCEPTION 'Injected notice failure not reached';
 EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
 IF NOT EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE id=r.id AND state='processing' AND completed_at IS NULL) OR
    NOT EXISTS(SELECT FROM public.disputes WHERE id=r.dispute_id AND status='open' AND resolved_at IS NULL) OR
    NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id=r.escrow_id AND status='completed' AND admin_hold_status='admin_hold') THEN
 RAISE EXCEPTION 'Failed notice left partial dispute resolution'; END IF;
 IF EXISTS(SELECT FROM public.notifications WHERE metadata->>'resolutionId'=r.id::text) THEN RAISE EXCEPTION 'Notice partially committed'; END IF;
END $$;
DROP TRIGGER audit_fail_dispute_notice ON public.notifications;
DO $$ DECLARE r public.escrow_dispute_resolutions; BEGIN
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE escrow_id='fc160906-0000-4000-8000-000000000020';
 PERFORM public.finalize_dispute_resolution(r.id);
 PERFORM public.finalize_dispute_resolution(r.id);
 IF NOT EXISTS(SELECT FROM public.escrow_dispute_resolutions WHERE id=r.id AND state='completed' AND completed_at IS NOT NULL) OR
    NOT EXISTS(SELECT FROM public.disputes WHERE id=r.dispute_id AND status='resolved' AND resolution=r.reason) OR
    NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id=r.escrow_id AND admin_hold_status='released') THEN RAISE EXCEPTION 'Resolution did not finalize'; END IF;
 IF (SELECT count(*) FROM public.notifications WHERE metadata->>'resolutionId'=r.id::text)<>2 OR
    (SELECT count(*) FROM public.audit_logs WHERE new_values->>'resolution_id'=r.id::text)<>1 OR
    (SELECT count(*) FROM public.escrow_transfer_attempts WHERE escrow_id=r.escrow_id)<>1 OR
    (SELECT count(*) FROM public.escrow_refund_operations WHERE escrow_id=r.escrow_id)<>1 THEN RAISE EXCEPTION 'Replay duplicated effects or money operations'; END IF;
END $$;
ROLLBACK;
