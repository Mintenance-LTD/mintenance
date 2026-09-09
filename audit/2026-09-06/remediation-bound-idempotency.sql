\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('e395bb8c-efbf-4d06-95f5-55c509de4301','idempotency-one@example.invalid'),
 ('e395bb8c-efbf-4d06-95f5-55c509de4302','idempotency-two@example.invalid');
SET LOCAL ROLE service_role;
DO $$
DECLARE r record;
BEGIN
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key('audit-bound','test',
 'e395bb8c-efbf-4d06-95f5-55c509de4301',repeat('a',64),60,86400);
 IF NOT r.claimed THEN RAISE EXCEPTION 'Initial claim failed'; END IF;
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key('audit-bound','test',
 'e395bb8c-efbf-4d06-95f5-55c509de4301',repeat('a',64),60,86400);
 IF NOT r.is_pending THEN RAISE EXCEPTION 'Concurrent retry was not pending'; END IF;
 BEGIN
  PERFORM public.try_claim_bound_idempotency_key('audit-bound','test',
  'e395bb8c-efbf-4d06-95f5-55c509de4301',repeat('b',64),60,86400);
  RAISE EXCEPTION 'Changed payload accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM public.complete_idempotency_claim('audit-bound','test','{"receipt":"synthetic"}',
 'e395bb8c-efbf-4d06-95f5-55c509de4301','{"resource":"synthetic"}');
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key('audit-bound','test',
 'e395bb8c-efbf-4d06-95f5-55c509de4301',repeat('a',64),60,86400);
 IF NOT r.is_duplicate OR r.cached_result <> '{"receipt":"synthetic"}'::jsonb THEN
  RAISE EXCEPTION 'Identical completed retry failed'; END IF;
 BEGIN
  PERFORM public.try_claim_bound_idempotency_key('audit-bound','test',
  'e395bb8c-efbf-4d06-95f5-55c509de4302',repeat('a',64),60,86400);
  RAISE EXCEPTION 'Cross-user cached response returned';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.try_claim_bound_idempotency_key('audit-bound','test',
  'e395bb8c-efbf-4d06-95f5-55c509de4301',repeat('b',64),60,86400);
  RAISE EXCEPTION 'Changed completed payload accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 RAISE NOTICE 'PASS: bound pending/completed retries; changed actor/payload rejected; completion metadata preserves fingerprint';
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('authenticated','public.try_claim_bound_idempotency_key(text,text,uuid,text,integer,integer)','EXECUTE') OR
    has_function_privilege('anon','public.try_claim_bound_idempotency_key(text,text,uuid,text,integer,integer)','EXECUTE') THEN
   RAISE EXCEPTION 'Client claim grant exposed'; END IF;
END $$;
ROLLBACK;
