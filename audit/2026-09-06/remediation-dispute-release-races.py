"""Real dispute/release lock races, on the disposable audit DB only."""
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


cases = [
 ('release','dispute',True,'completed/release_pending/true/none'),
 ('dispute','release',False,'completed/disputed/true/pending_review'),
]
for first, second, blocked, expected in cases:
    owner, contractor, job, escrow = [str(uuid.uuid4()) for _ in range(4)]
    calls = {
        'dispute': f"SELECT dispute_id FROM public.create_dispute_atomic('{escrow}','{owner}','{contractor}','Incomplete repair','Synthetic dispute')",
        'verify': f"SELECT public.record_completion_photo_verification('{job}','{escrow}','{contractor}','2026-09-15T10:00:00Z',ARRAY(SELECT id FROM public.job_photos_metadata WHERE job_id='{job}'),true,true,true,0.9,true)",
        'approve': f"SELECT public.approve_job_completion('{job}','{owner}','2026-09-15T10:00:00Z')->>'applied'",
        'rework': f"SELECT public.request_job_rework('{job}','{owner}','race-{job}','Repair the seal')",
        'release': f"SELECT count(*) FROM public.claim_escrow_release('{escrow}','homeowner_approved',gen_random_uuid())",
    }
    calls.update({
        'inspect': f"SELECT public.record_completion_review('{job}','{escrow}','{owner}','2026-09-15T10:00:00Z','inspect')",
        'reject': f"SELECT public.record_completion_review('{job}','{escrow}','{owner}','2026-09-15T10:00:00Z','reject','Please repair the seal')",
        'request': f"SELECT public.record_completion_review('{job}','{escrow}','{contractor}','2026-09-15T10:00:00Z','request')",
    })
    try:
        sql(f"""
          INSERT INTO auth.users(id,email) VALUES ('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid');
          INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status,completed_at)
          VALUES('{job}','{owner}','{contractor}','Synthetic decision race','Synthetic maintenance race fixture','Synthetic','completed','2026-09-15T10:00:00Z');
          INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,photo_verification_status)
          VALUES('{escrow}','{job}','{owner}','{contractor}',500,'held','verified');
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
            if not blocked:
                assert follower.result(timeout=16) == '0', 'Disputed escrow unexpectedly acquired a release claim'
            else:
                try:
                    follower.result(timeout=16)
                    raise AssertionError('Incompatible following review was accepted')
                except RuntimeError as error:
                    assert any(message in str(error) for message in [
                        'The completion changed', 'already approved', 'not available for approval', 'Completion changed', 'not eligible for a new dispute', 'Escrow release prerequisites changed'])
        result = sql(f"SELECT j.status||'/'||e.status||'/'||e.homeowner_approval::text||'/'||e.admin_hold_status FROM public.jobs j JOIN public.escrow_transactions e ON e.job_id=j.id WHERE j.id='{job}'")
        assert result == expected, (first, second, result)
        if 'rework' in [first, second]:
            assert sql(f"SELECT count(*) FROM public.escrow_transactions WHERE id='{escrow}' AND (homeowner_inspection_completed OR auto_approval_date IS NOT NULL)") == '0'
        print(f'PASS: {first} then {second}: {expected}; conflicting settlement blocked')
    finally:
        sql(f"""
          DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}';
          DELETE FROM public.disputes WHERE job_id='{job}';
          DELETE FROM public.job_rework_requests WHERE job_id='{job}';
          DELETE FROM public.job_photos_metadata WHERE job_id='{job}';
          DELETE FROM public.escrow_transactions WHERE job_id='{job}';
          DELETE FROM public.jobs WHERE id='{job}';
          DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');
        """)
