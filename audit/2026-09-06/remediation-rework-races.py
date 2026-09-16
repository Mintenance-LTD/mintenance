"""Two real connections to the disposable audit DB; exact synthetic cleanup."""
import concurrent.futures
import subprocess
import time
import uuid

CONTAINER = 'supabase_db_mintenance-audit-20260906'


def sql(query):
    result = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d',
         'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'],
        input=query, text=True, capture_output=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


for same_key in [True, False]:
    owner, contractor, job, escrow = [str(uuid.uuid4()) for _ in range(4)]
    key = 'synthetic-rework-' + job
    follower_key = key if same_key else key + '-different'
    try:
        sql(f"""
          INSERT INTO auth.users(id,email) VALUES
            ('{owner}','{owner}@example.invalid'),
            ('{contractor}','{contractor}@example.invalid');
          INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
            VALUES('{job}','{owner}','{contractor}','Synthetic rework race',
              'Synthetic maintenance race fixture','Synthetic','completed');
          INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,auto_approval_date)
            VALUES('{escrow}','{job}','{owner}','{contractor}',500,'awaiting_homeowner_approval',now());
        """)
        app = 'audit_rework_' + str(uuid.uuid4())
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            leader = pool.submit(sql, f"""
              SET application_name='{app}'; BEGIN; SET LOCAL statement_timeout='10s';
              SELECT id FROM public.jobs WHERE id='{job}' FOR UPDATE;
              SELECT pg_sleep(2);
              SELECT public.request_job_rework('{job}','{owner}','{key}','Repair the seal');
              COMMIT;
            """)
            for _ in range(30):
                if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep'") == '1':
                    break
                if leader.done():
                    raise AssertionError('Leader exited before lock observation')
                time.sleep(0.05)
            else:
                raise AssertionError('Leader job lock was not observed')
            follower = pool.submit(sql, f"""
              SET statement_timeout='10s';
              SELECT public.request_job_rework('{job}','{owner}','{follower_key}','Repair the seal');
            """)
            assert leader.result(timeout=15).splitlines()[-1] == 't'
            if same_key:
                assert follower.result(timeout=15) == 'f'
            else:
                try:
                    follower.result(timeout=15)
                    raise AssertionError('A competing independent rework request succeeded')
                except RuntimeError as error:
                    assert 'Job is not completed' in str(error)
        assert sql(f"SELECT count(*) FROM public.job_rework_requests WHERE job_id='{job}'") == '1'
        assert sql(f"SELECT count(*) FROM public.notifications WHERE metadata->>'jobId'='{job}' AND type='changes_requested'") == '1'
        assert sql(f"SELECT j.status||'/'||e.status||'/'||(e.auto_approval_date IS NULL)::text FROM public.jobs j JOIN public.escrow_transactions e ON e.job_id=j.id WHERE j.id='{job}'") == 'in_progress/held/true'
        print('PASS: concurrent ' + ('replay returns false' if same_key else 'different key is rejected') + '; one rework, one notification, deadlines cleared')
    finally:
        sql(f"""
          DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}';
          DELETE FROM public.job_rework_requests WHERE job_id='{job}';
          DELETE FROM public.escrow_transactions WHERE job_id='{job}';
          DELETE FROM public.jobs WHERE id='{job}';
          DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');
        """)
