"""Real approval/rework/release lock races, on the disposable audit DB only."""
import concurrent.futures
import subprocess
import time
import uuid

CONTAINER = 'supabase_db_mintenance-audit-20260906'


def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'postgres',
                             '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'],
                            input=query, text=True, capture_output=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


for first, second in [('approve', 'rework'), ('rework', 'approve'), ('approve', 'approve'),
                      ('release', 'rework'), ('rework', 'release')]:
    owner, contractor, job, escrow = [str(uuid.uuid4()) for _ in range(4)]
    calls = {
        'approve': f"SELECT public.approve_job_completion('{job}','{owner}','2026-09-15T10:00:00Z')->>'applied'",
        'rework': f"SELECT public.request_job_rework_for_completion('{job}','{owner}','race-{job}','Repair the seal','2026-09-15T10:00:00Z')",
        'release': f"SELECT count(*) FROM public.claim_escrow_release('{escrow}','homeowner_approved',gen_random_uuid())",
    }
    try:
        sql(f"""
          INSERT INTO auth.users(id,email) VALUES ('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid');
          INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status,completed_at)
          VALUES('{job}','{owner}','{contractor}','Synthetic decision race','Synthetic maintenance race fixture','Synthetic','completed','2026-09-15T10:00:00Z');
          INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
          VALUES('{escrow}','{job}','{owner}','{contractor}',500,'held');
          INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified)
          VALUES('{job}','https://example.invalid/synthetic-photo','after',true);
        """)
        if 'release' in [first, second]:
            sql(f"SELECT public.approve_job_completion('{job}','{owner}','2026-09-15T10:00:00Z',NULL,NULL,false,true)")
        app = 'audit_approval_' + str(uuid.uuid4())
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            leader = pool.submit(sql, f"SET application_name='{app}'; BEGIN; SET LOCAL statement_timeout='12s'; SELECT id FROM public.jobs WHERE id='{job}' FOR UPDATE; SELECT pg_sleep(3); {calls[first]}; COMMIT;")
            for _ in range(40):
                if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep'") == '1':
                    break
                if leader.done():
                    raise AssertionError('Leader exited before lock observation')
                time.sleep(0.05)
            else:
                raise AssertionError('Leader job lock not observed')
            follower = pool.submit(sql, f"SET application_name='{app}_follower'; SET statement_timeout='12s'; {calls[second]}")
            for _ in range(30):
                if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}_follower' AND wait_event_type='Lock'") == '1':
                    break
                if follower.done():
                    raise AssertionError('Follower did not wait on the shared job lock')
                time.sleep(0.05)
            else:
                raise AssertionError('Follower lock wait not observed')
            leader.result(timeout=16)
            if first == 'approve':
                assert follower.result(timeout=16) == ('false' if second == 'approve' else 't')
            else:
                try:
                    follower.result(timeout=16)
                    raise AssertionError('Incompatible following decision was accepted')
                except RuntimeError as error:
                    assert any(message in str(error) for message in [
                        'The job completion changed', 'Escrow is not available for rework',
                        'Escrow release prerequisites changed'])
        result = sql(f"SELECT j.status||'/'||e.status||'/'||e.homeowner_approval::text FROM public.jobs j JOIN public.escrow_transactions e ON e.job_id=j.id WHERE j.id='{job}'")
        expected = ('completed/release_pending/true' if first == 'release' else
                    'completed/held/true' if second == first == 'approve' else 'in_progress/held/false')
        assert result == expected, (first, second, result)
        assert sql(f"SELECT count(*) FROM public.homeowner_approval_history WHERE escrow_transaction_id='{escrow}'") == ('0' if first == 'rework' and second == 'approve' else '1')
        print(f'PASS: {first} then {second}: {expected}, consistent history and no overwritten rework')
    finally:
        sql(f"""
          DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}';
          DELETE FROM public.job_rework_requests WHERE job_id='{job}';
          DELETE FROM public.job_photos_metadata WHERE job_id='{job}';
          DELETE FROM public.escrow_transactions WHERE job_id='{job}';
          DELETE FROM public.jobs WHERE id='{job}';
          DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');
        """)
