"""Local synthetic disposal races and transactional fault injection; fixtures always cleaned."""
import concurrent.futures
import json
import subprocess
import uuid

admin, record, job = [str(uuid.uuid4()) for _ in range(3)]


def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906',
                             'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'],
                            input=query, text=True, capture_output=True, timeout=30)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


try:
    sql(f"""INSERT INTO auth.users(id,email) VALUES('{admin}','{admin}@example.invalid');
        UPDATE public.profiles SET role='admin' WHERE id='{admin}';
        INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence)
        VALUES('{record}','{job}','{{}}','{{"version":1,"contract":{{}}}}');
        SELECT public.review_retained_evidence('{admin}','contract','{record}',0,false,'Synthetic classification',clock_timestamp()+interval '30 days');""")
    due = sql("SELECT (clock_timestamp()+interval '2 days')::text;")

    def schedule(_):
        return sql(f"SELECT public.schedule_retained_evidence_disposal('{admin}','contract','{record}',1,'{due}','Synthetic classified case','AUDIT-RACE');")

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(schedule, [1, 2]))
    assert ids[0] == ids[1], 'Concurrent identical scheduling created multiple decisions'
    sql(f"UPDATE public.evidence_disposal_requests SET scheduled_for=clock_timestamp()-interval '1 day' WHERE record_id='{record}';")
    # A failure to write the final audit decision must roll back evidence removal.
    sql(f"""BEGIN;
        CREATE FUNCTION pg_temp.reject_disposal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.status='completed' AND NEW.record_id='{record}' THEN RAISE EXCEPTION 'synthetic finalization failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER audit_disposal_failure BEFORE UPDATE ON public.evidence_disposal_requests FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_disposal();
        DO $$ BEGIN
          BEGIN PERFORM public.process_retained_evidence_disposals(25); RAISE EXCEPTION 'Expected failure missing';
          EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'synthetic finalization failure' THEN RAISE; END IF; END;
          IF NOT EXISTS(SELECT 1 FROM public.retained_contract_records WHERE contract_id='{record}') THEN RAISE EXCEPTION 'Evidence lost after audit failure'; END IF;
        END $$;
        ROLLBACK;""")

    def process(_):
        return json.loads(sql('SELECT public.process_retained_evidence_disposals(25);'))

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(process, [1, 2]))
    assert sum(row['completed'] for row in outcomes) == 1, 'Concurrent workers did not finish exactly once'
    assert sql(f"SELECT status FROM public.evidence_disposal_requests WHERE record_id='{record}';") == 'completed'
    assert sql(f"SELECT count(*) FROM public.retained_contract_records WHERE contract_id='{record}';") == '0'
    print('PASS: concurrent scheduling is idempotent; finalization failure retains evidence; competing workers complete once.')
finally:
    sql(f"DELETE FROM public.evidence_disposal_requests WHERE record_id='{record}'; DELETE FROM public.evidence_retention_review_log WHERE record_id='{record}'; DELETE FROM public.evidence_retention_reviews WHERE record_id='{record}'; DELETE FROM public.retained_contract_records WHERE contract_id='{record}'; DELETE FROM auth.users WHERE id='{admin}';")
