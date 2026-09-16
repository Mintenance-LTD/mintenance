\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('fa360906-0000-4000-8000-000000000001','audit-erasure@example.invalid','{}');
INSERT INTO public.homeowner_subscriptions(homeowner_id,plan_type,stripe_subscription_id,status)
 VALUES('fa360906-0000-4000-8000-000000000001','landlord','sub_audit_erasure','active');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"fa360906-0000-4000-8000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN
 BEGIN
  UPDATE public.homeowner_subscriptions SET stripe_subscription_id='sub_someone_else';
  RAISE EXCEPTION 'Client can substitute subscription identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.homeowner_subscriptions(homeowner_id,plan_type,stripe_subscription_id) VALUES('fa360906-0000-4000-8000-000000000001','agency','sub_someone_else');
  RAISE EXCEPTION 'Client can insert paid subscription identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.delete_account_with_recovery('fa360906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Client can invoke privileged erasure';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.claim_account_cleanup_step(NULL);
  RAISE EXCEPTION 'Client can claim provider cleanup work';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM * FROM public.account_deletion_cleanup_steps;
  RAISE EXCEPTION 'Client can read retained provider identifiers';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

END $$;
RESET ROLE;
CREATE FUNCTION pg_temp.reject_profile_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'injected profile erasure failure'; END $$;
CREATE TRIGGER audit_profile_delete_failure BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_profile_delete();
DO $$ BEGIN
 BEGIN
  PERFORM public.delete_account_with_recovery('fa360906-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Expected erasure failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'injected profile erasure failure' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.account_deletion_operations WHERE user_id='fa360906-0000-4000-8000-000000000001') OR
  (SELECT count(*) FROM public.homeowner_subscriptions WHERE homeowner_id='fa360906-0000-4000-8000-000000000001')<>1 THEN
  RAISE EXCEPTION 'Deletion and journal did not roll back together'; END IF;
END $$;
DROP TRIGGER audit_profile_delete_failure ON public.profiles;
DO $$ DECLARE op uuid; again uuid; a jsonb; b jsonb; BEGIN
 op:=public.delete_account_with_recovery('fa360906-0000-4000-8000-000000000001');
 again:=public.delete_account_with_recovery('fa360906-0000-4000-8000-000000000001');
 IF again<>op OR (SELECT count(*) FROM public.account_deletion_cleanup_steps WHERE operation_id=op)<>2 THEN
  RAISE EXCEPTION 'Replay did not preserve one immutable operation'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='fa360906-0000-4000-8000-000000000001') OR
  EXISTS(SELECT 1 FROM public.homeowner_subscriptions WHERE homeowner_id='fa360906-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Eligible data not erased'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE operation_id=op AND resource_id='sub_audit_erasure') THEN
  RAISE EXCEPTION 'Provider identity lost with profile'; END IF;
 a:=public.claim_account_cleanup_step(op);
 IF a->>'kind'<>'auth_user' THEN RAISE EXCEPTION 'Credential cleanup not prioritised'; END IF;
 UPDATE public.account_deletion_cleanup_steps SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=(a->>'id')::uuid;
 b:=public.claim_account_cleanup_step(op);
 IF a->>'id'<>b->>'id' OR a->>'lease_token'=b->>'lease_token' THEN RAISE EXCEPTION 'Expired lease not replaced'; END IF;
 BEGIN
  PERFORM public.finish_account_cleanup_step((a->>'id')::uuid,(a->>'lease_token')::uuid,'completed');
  RAISE EXCEPTION 'Stale worker overwrote renewed lease';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM public.finish_account_cleanup_step((b->>'id')::uuid,(b->>'lease_token')::uuid,'completed');
 b:=public.claim_account_cleanup_step(op);
 IF b->>'resource_id'<>'sub_audit_erasure' THEN RAISE EXCEPTION 'Frozen cancellation target lost'; END IF;
 PERFORM public.finish_account_cleanup_step((b->>'id')::uuid,(b->>'lease_token')::uuid,'retry');
 IF public.claim_account_cleanup_step(op) IS NOT NULL THEN RAISE EXCEPTION 'Retry ignored backoff'; END IF;
 UPDATE public.account_deletion_cleanup_steps SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE id=(b->>'id')::uuid;
 b:=public.claim_account_cleanup_step(op);
 PERFORM public.finish_account_cleanup_step((b->>'id')::uuid,(b->>'lease_token')::uuid,'needs_review');
 IF public.claim_account_cleanup_step(op) IS NOT NULL THEN RAISE EXCEPTION 'Review case automatically retried'; END IF;
END $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  UPDATE public.account_deletion_cleanup_steps SET resource_id='sub_someone_else';
  RAISE EXCEPTION 'Unrestricted service update can change frozen cleanup identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
