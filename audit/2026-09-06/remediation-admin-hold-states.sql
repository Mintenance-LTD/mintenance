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

UPDATE public.escrow_transactions SET admin_hold_status='admin_hold',admin_hold_reason='Synthetic hold' WHERE id='fc160906-0000-4000-8000-000000000020' AND status IN('held','awaiting_homeowner_approval','disputed','pending_review');
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND status='held' AND admin_hold_status='admin_hold') THEN RAISE EXCEPTION 'Hold changed payment state'; END IF;
END $$;
UPDATE public.escrow_transactions SET admin_hold_status='none',admin_approved_at=now(),status='held' WHERE id='fc160906-0000-4000-8000-000000000020' AND status IN('held','awaiting_homeowner_approval','pending_review');
UPDATE public.escrow_transactions SET status='disputed',admin_hold_status='pending_review' WHERE id='fc160906-0000-4000-8000-000000000020';
UPDATE public.escrow_transactions SET admin_hold_status='admin_hold' WHERE id='fc160906-0000-4000-8000-000000000020' AND status IN('held','awaiting_homeowner_approval','disputed','pending_review');
UPDATE public.escrow_transactions SET admin_hold_status='none',status='held' WHERE id='fc160906-0000-4000-8000-000000000020' AND status IN('held','awaiting_homeowner_approval','pending_review');
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM public.escrow_transactions WHERE id='fc160906-0000-4000-8000-000000000020' AND status='disputed' AND admin_hold_status='admin_hold') THEN RAISE EXCEPTION 'Generic approval cleared dispute'; END IF;
END $$;
ROLLBACK;
