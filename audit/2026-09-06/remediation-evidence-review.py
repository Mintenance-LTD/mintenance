"""Rolled-back retention review authorization and concurrency-precondition diagnostics."""
import subprocess, uuid
admin, outsider, record, job = [str(uuid.uuid4()) for _ in range(4)]
sql = f"""BEGIN;
INSERT INTO auth.users(id,email) VALUES('{admin}','{admin}@example.invalid'),('{outsider}','{outsider}@example.invalid');
UPDATE public.profiles SET role='admin' WHERE id='{admin}';
INSERT INTO public.retained_dispute_records(dispute_id,job_id,participant_ids,evidence) VALUES('{record}','{job}',ARRAY['{outsider}'::uuid],'{{}}');
INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence) VALUES('{record}','{job}',ARRAY['{outsider}'::uuid],'{{}}');
DO $$ DECLARE kind text; BEGIN
 FOREACH kind IN ARRAY ARRAY['contract','dispute'] LOOP
  BEGIN PERFORM public.review_retained_evidence('{outsider}',kind,'{record}',0,true,'Synthetic reason',now()+interval '30 days');
   RAISE EXCEPTION 'Nonadmin allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.review_retained_evidence('{admin}',kind,'{record}',0,true,'Synthetic reason',now()-interval '1 day');
   RAISE EXCEPTION 'Past review allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF public.review_retained_evidence('{admin}',kind,'{record}',0,true,'Synthetic hold',now()+interval '30 days')<>1 THEN RAISE EXCEPTION 'Revision wrong'; END IF;
  BEGIN PERFORM public.review_retained_evidence('{admin}',kind,'{record}',0,false,'Stale decision',now()+interval '30 days');
   RAISE EXCEPTION 'Stale decision overwrote hold'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  IF NOT (SELECT legal_hold FROM public.evidence_retention_reviews WHERE record_kind=kind AND record_id='{record}') THEN RAISE EXCEPTION 'Hold lost'; END IF;
  PERFORM public.review_retained_evidence('{admin}',kind,'{record}',1,false,'Synthetic hold release',now()+interval '60 days');
  IF (SELECT count(*) FROM public.evidence_retention_review_log WHERE record_kind=kind AND record_id='{record}')<>2 THEN RAISE EXCEPTION 'Audit history missing'; END IF;
 END LOOP;
 IF has_function_privilege('authenticated','public.review_retained_evidence(uuid,text,uuid,integer,boolean,text,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'Client can review'; END IF;
 IF has_table_privilege('service_role','public.evidence_retention_review_log','DELETE') THEN RAISE EXCEPTION 'Service can erase audit'; END IF;
 IF (SELECT count(*) FROM public.retained_dispute_records WHERE dispute_id='{record}')<>1 THEN RAISE EXCEPTION 'Evidence erased'; END IF;
END $$;
ROLLBACK;
"""
result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-v','ON_ERROR_STOP=1'],input=sql,text=True,encoding='utf-8',capture_output=True,timeout=40)
if result.returncode:
 print(result.stderr); raise SystemExit(result.returncode)
print('PASS: both archive types, administrator checks, stale revision rejection, hold/release history, invalid date rejection and denied direct client access; all rolled back.')

# Independent connections race the first review; only one revision-zero decision may win.
from concurrent.futures import ThreadPoolExecutor
def execute(query):
 return subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,encoding='utf-8',capture_output=True,timeout=40)
try:
 fixture=execute(f"INSERT INTO auth.users(id,email) VALUES('{admin}','{admin}@example.invalid'); UPDATE public.profiles SET role='admin' WHERE id='{admin}'; INSERT INTO public.retained_dispute_records(dispute_id,job_id,participant_ids,evidence) VALUES('{record}','{job}',ARRAY['{admin}'::uuid],'{{}}');")
 if fixture.returncode: raise RuntimeError('Synthetic concurrency fixture failed')
 def decide(hold):
  return execute(f"SELECT public.review_retained_evidence('{admin}','dispute','{record}',0,{str(hold).lower()},'Concurrent synthetic decision',now()+interval '30 days');")
 with ThreadPoolExecutor(max_workers=2) as pool:
  outcomes=list(pool.map(decide,[True,False]))
 if sum(item.returncode==0 for item in outcomes)!=1: raise RuntimeError('Concurrent first reviews did not produce exactly one winner')
 if not any('Review changed; reload' in item.stderr for item in outcomes): raise RuntimeError('Losing review failed for an unexpected reason')
 history=execute(f"SELECT count(*) FROM public.evidence_retention_review_log WHERE record_kind='dispute' AND record_id='{record}';")
 if history.returncode or history.stdout.strip()!='1': raise RuntimeError('Concurrent history does not contain exactly one decision')
 print('PASS: two independent database connections racing the same first review produce one success and one revision conflict.')
finally:
 cleanup=execute(f"DELETE FROM public.evidence_retention_review_log WHERE record_id='{record}'; DELETE FROM public.evidence_retention_reviews WHERE record_id='{record}'; DELETE FROM public.retained_dispute_records WHERE dispute_id='{record}'; DELETE FROM auth.users WHERE id='{admin}';")
 if cleanup.returncode: raise RuntimeError('Synthetic concurrency cleanup failed')
