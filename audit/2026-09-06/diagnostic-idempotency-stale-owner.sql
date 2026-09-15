\set ON_ERROR_STOP on
-- Reproduction of an OPEN defect, not an expected-safe regression test.
-- Run only on the disposable audit stack. All changes roll back.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('fa060915-0000-4000-8000-000000009901','stale-claim-audit@example.invalid');
SET LOCAL ROLE service_role;
DO $$
DECLARE r record; completed boolean; removed boolean;
BEGIN
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key(
   'audit-stale-owner-complete','audit', 'fa060915-0000-4000-8000-000000009901',repeat('a',64),60,86400);
 IF NOT r.claimed THEN RAISE EXCEPTION 'Initial claim missing'; END IF;
 UPDATE public.idempotency_keys SET claimed_at=now()-interval '2 minutes'
   WHERE idempotency_key='audit-stale-owner-complete' AND operation='audit';
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key(
   'audit-stale-owner-complete','audit', 'fa060915-0000-4000-8000-000000009901',repeat('a',64),60,86400);
 IF NOT r.claimed THEN RAISE EXCEPTION 'Takeover did not occur'; END IF;
 -- The old request has exactly the same completion arguments as the new owner.
 completed := public.complete_idempotency_claim('audit-stale-owner-complete','audit',
   '{"writer":"expired-request"}', 'fa060915-0000-4000-8000-000000009901',NULL);
 IF NOT completed THEN RAISE EXCEPTION 'Defect no longer reproduced: stale completion rejected'; END IF;

 SELECT * INTO r FROM public.try_claim_bound_idempotency_key(
   'audit-stale-owner-release','audit', 'fa060915-0000-4000-8000-000000009901',repeat('a',64),60,86400);
 UPDATE public.idempotency_keys SET claimed_at=now()-interval '2 minutes'
   WHERE idempotency_key='audit-stale-owner-release' AND operation='audit';
 SELECT * INTO r FROM public.try_claim_bound_idempotency_key(
   'audit-stale-owner-release','audit', 'fa060915-0000-4000-8000-000000009901',repeat('a',64),60,86400);
 IF NOT r.claimed THEN RAISE EXCEPTION 'Release takeover did not occur'; END IF;
 removed := public.release_idempotency_claim('audit-stale-owner-release','audit');
 IF NOT removed THEN RAISE EXCEPTION 'Defect no longer reproduced: stale release rejected'; END IF;
 RAISE NOTICE 'REPRODUCED OPEN DEFECT: expired request can complete or delete a replacement claim';
END $$;
ROLLBACK;
