\set ON_ERROR_STOP on
BEGIN;
-- Isolated local database only. All fixtures, fault injection and changes roll back.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('fd260924-0000-4000-8000-000000000001','disposal-admin@example.invalid','{}'),
 ('fd260924-0000-4000-8000-000000000002','disposal-unrelated@example.invalid','{}');
UPDATE public.profiles SET role='admin' WHERE id='fd260924-0000-4000-8000-000000000001';
INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence)
SELECT ('fd260924-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'fd260924-0000-4000-8000-000000000099','{}','{"version":1,"contract":{}}'::jsonb
FROM generate_series(10,15) n;
DO $$ DECLARE item record; decision uuid; again uuid; due timestamptz:=clock_timestamp()+interval '2 days'; result jsonb; BEGIN
 FOR item IN SELECT contract_id FROM public.retained_contract_records WHERE contract_id::text LIKE 'fd260924-%' LOOP
  PERFORM public.review_retained_evidence('fd260924-0000-4000-8000-000000000001','contract',item.contract_id,0,false,'Synthetic classified case',clock_timestamp()+interval '30 days');
 END LOOP;
 BEGIN
  PERFORM public.schedule_retained_evidence_disposal('fd260924-0000-4000-8000-000000000002','contract','fd260924-0000-4000-8000-000000000010',1,due,'Synthetic classified case','AUDIT-CASE');
  RAISE EXCEPTION 'Unrelated user scheduled deletion';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.schedule_retained_evidence_disposal('fd260924-0000-4000-8000-000000000001','contract','fd260924-0000-4000-8000-000000000010',1,clock_timestamp(),'Synthetic classified case','AUDIT-CASE');
  RAISE EXCEPTION 'Early disposal accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 FOR item IN SELECT contract_id FROM public.retained_contract_records WHERE contract_id::text LIKE 'fd260924-%' LOOP
  decision:=public.schedule_retained_evidence_disposal('fd260924-0000-4000-8000-000000000001','contract',item.contract_id,1,due,'Synthetic classified case','AUDIT-CASE');
  again:=public.schedule_retained_evidence_disposal('fd260924-0000-4000-8000-000000000001','contract',item.contract_id,1,due,'Synthetic classified case','AUDIT-CASE');
  IF decision<>again THEN RAISE EXCEPTION 'Retry created a second decision'; END IF;
 END LOOP;
 result:=public.process_retained_evidence_disposals(25);
 IF (result->>'processed')::int<>0 THEN RAISE EXCEPTION 'Worker processed future decision'; END IF;
 -- Simulate elapsed notice in isolated fixtures; never weaken the scheduling function.
 UPDATE public.evidence_disposal_requests SET scheduled_for=clock_timestamp()-interval '1 day' WHERE record_id::text LIKE 'fd260924-%';
 PERFORM public.review_retained_evidence('fd260924-0000-4000-8000-000000000001','contract','fd260924-0000-4000-8000-000000000011',1,true,'Synthetic litigation hold',clock_timestamp()+interval '30 days');
 PERFORM public.review_retained_evidence('fd260924-0000-4000-8000-000000000001','contract','fd260924-0000-4000-8000-000000000012',1,false,'Synthetic changed classification',clock_timestamp()+interval '30 days');
 UPDATE public.retained_contract_records SET evidence='{"version":1,"contract":{"url":"https://example.invalid/evidence"}}' WHERE contract_id='fd260924-0000-4000-8000-000000000013';
 UPDATE public.retained_contract_records SET retention_until=clock_timestamp()+interval '1 year' WHERE contract_id='fd260924-0000-4000-8000-000000000014';
 SELECT id INTO decision FROM public.evidence_disposal_requests WHERE record_id='fd260924-0000-4000-8000-000000000015';
 IF NOT public.cancel_retained_evidence_disposal('fd260924-0000-4000-8000-000000000001','contract','fd260924-0000-4000-8000-000000000015',decision)
 OR NOT public.cancel_retained_evidence_disposal('fd260924-0000-4000-8000-000000000001','contract','fd260924-0000-4000-8000-000000000015',decision) THEN RAISE EXCEPTION 'Cancel/retry failed'; END IF;
 result:=public.process_retained_evidence_disposals(25);
 IF result<>'{"processed":5,"completed":1,"needsReconciliation":2,"cancelled":2}'::jsonb THEN RAISE EXCEPTION 'Unexpected worker result: %',result; END IF;
 IF EXISTS(SELECT 1 FROM public.retained_contract_records WHERE contract_id='fd260924-0000-4000-8000-000000000010') THEN RAISE EXCEPTION 'Eligible database evidence remains'; END IF;
 IF (SELECT count(*) FROM public.retained_contract_records WHERE contract_id::text LIKE 'fd260924-%')<>5 THEN RAISE EXCEPTION 'Protected evidence lost'; END IF;
 result:=public.process_retained_evidence_disposals(25);
 IF (result->>'processed')::int<>0 THEN RAISE EXCEPTION 'Retry reprocessed terminal decisions'; END IF;
END $$;
INSERT INTO public.retained_dispute_records(dispute_id,job_id,participant_ids,evidence)
 VALUES ('fd260924-0000-4000-8000-000000000020','fd260924-0000-4000-8000-000000000099','{}','{"resolved_at":"2020-01-01T00:00:00Z","resolution":"Synthetic resolved case"}'),
 ('fd260924-0000-4000-8000-000000000021','fd260924-0000-4000-8000-000000000099','{}','{"resolved_at":null,"resolution":null}');
DO $$ DECLARE item record; result jsonb; BEGIN
 FOR item IN SELECT dispute_id FROM public.retained_dispute_records WHERE dispute_id::text LIKE 'fd260924-%' LOOP
  PERFORM public.review_retained_evidence('fd260924-0000-4000-8000-000000000001','dispute',item.dispute_id,0,false,'Synthetic reviewed dispute',clock_timestamp()+interval '30 days');
  PERFORM public.schedule_retained_evidence_disposal('fd260924-0000-4000-8000-000000000001','dispute',item.dispute_id,1,clock_timestamp()+interval '2 days','Synthetic classified case','AUDIT-CASE');
 END LOOP;
 UPDATE public.evidence_disposal_requests SET scheduled_for=clock_timestamp()-interval '1 day' WHERE record_id::text LIKE 'fd260924-%' AND record_kind='dispute';
 result:=public.process_retained_evidence_disposals(25);
 IF result<>'{"processed":2,"completed":1,"needsReconciliation":1,"cancelled":0}'::jsonb THEN RAISE EXCEPTION 'Unexpected dispute result: %',result; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.retained_dispute_records WHERE dispute_id='fd260924-0000-4000-8000-000000000021') THEN RAISE EXCEPTION 'Unresolved dispute erased'; END IF;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.process_retained_evidence_disposals(1);
  RAISE EXCEPTION 'Client invoked erasure worker';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM * FROM public.evidence_disposal_requests;
  RAISE EXCEPTION 'Client read staff decisions';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  DELETE FROM public.evidence_disposal_requests;
  RAISE EXCEPTION 'Service client removed audit decisions';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'PASS: disposal authorization, notice, retries, holds, revisions, external references, retention deadlines, cancellation and client privileges'
