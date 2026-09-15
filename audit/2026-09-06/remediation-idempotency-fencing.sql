\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fa060915-0000-4000-8000-000000009911','fenced-claim-audit@example.invalid');
SET LOCAL ROLE service_role;
DO $$
DECLARE first_claim record; next_claim record; replay record;
 actor uuid := 'fa060915-0000-4000-8000-000000009911';
BEGIN
 SELECT * INTO first_claim FROM public.claim_fenced_idempotency('audit-fenced','audit',actor,repeat('a',64),60,86400);
 IF NOT first_claim.claimed OR first_claim.claim_token IS NULL THEN RAISE EXCEPTION 'Missing ownership token'; END IF;
 UPDATE public.idempotency_keys SET claimed_at=now()-interval '2 minutes',claim_expires_at=now()-interval '1 minute'
 WHERE idempotency_key='audit-fenced' AND operation='audit';
 IF public.complete_fenced_idempotency('audit-fenced','audit',actor,first_claim.claim_token,'{}',NULL) THEN
  RAISE EXCEPTION 'Expired claim completed before takeover'; END IF;
 SELECT * INTO next_claim FROM public.claim_fenced_idempotency('audit-fenced','audit',actor,repeat('a',64),60,86400);
 IF NOT next_claim.claimed OR next_claim.claim_token IS NULL OR next_claim.claim_token=first_claim.claim_token THEN
  RAISE EXCEPTION 'Takeover did not rotate token'; END IF;
 IF public.complete_fenced_idempotency('audit-fenced','audit',actor,first_claim.claim_token,'{}',NULL) OR
    public.release_fenced_idempotency('audit-fenced','audit',actor,first_claim.claim_token) THEN
  RAISE EXCEPTION 'Old request changed replacement claim'; END IF;
 IF public.complete_fenced_idempotency('audit-fenced','audit',gen_random_uuid(),next_claim.claim_token,'{}',NULL) THEN
  RAISE EXCEPTION 'Wrong actor completed claim'; END IF;
 IF NOT public.complete_fenced_idempotency('audit-fenced','audit',actor,next_claim.claim_token,'{"receipt":"current"}',NULL) THEN
  RAISE EXCEPTION 'Current owner could not complete'; END IF;
 SELECT * INTO replay FROM public.claim_fenced_idempotency('audit-fenced','audit',actor,repeat('a',64),60,86400);
 IF NOT replay.is_duplicate OR replay.claim_token IS NOT NULL OR replay.cached_result<>'{"receipt":"current"}'::jsonb THEN
  RAISE EXCEPTION 'Cached replay incorrect or disclosed token'; END IF;
 IF public.release_fenced_idempotency('audit-fenced','audit',actor,next_claim.claim_token) THEN
  RAISE EXCEPTION 'Completed claim deleted'; END IF;
 SELECT * INTO first_claim FROM public.claim_fenced_idempotency('audit-fenced-release','audit',actor,repeat('a',64),60,86400);
 IF NOT public.release_fenced_idempotency('audit-fenced-release','audit',actor,first_claim.claim_token) THEN
  RAISE EXCEPTION 'Valid owner release failed'; END IF;
 RAISE NOTICE 'PASS: expired/stale/wrong-actor writes denied; replacement completion and valid release succeed';
END $$;
RESET ROLE;
DO $$
DECLARE signature text; client text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
 'public.claim_fenced_idempotency(text,text,uuid,text,integer,integer)',
 'public.complete_fenced_idempotency(text,text,uuid,uuid,jsonb,jsonb)',
 'public.release_fenced_idempotency(text,text,uuid,uuid)'] LOOP
  FOREACH client IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(client,signature,'EXECUTE') THEN RAISE EXCEPTION 'Client RPC privilege exposed'; END IF;
  END LOOP;
 END LOOP;
END $$;
DO $$
DECLARE signature text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
 'public.try_claim_idempotency_key(text,text,uuid,jsonb,integer)',
 'public.try_claim_idempotency_key(text,text,uuid,jsonb,integer,integer)',
 'public.try_claim_bound_idempotency_key(text,text,uuid,text,integer,integer)',
 'public.complete_idempotency_claim(text,text,jsonb,uuid,jsonb)',
 'public.release_idempotency_claim(text,text)'] LOOP
  IF has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION 'Unfenced entry point remains callable'; END IF;
 END LOOP;
END $$;
ROLLBACK;
