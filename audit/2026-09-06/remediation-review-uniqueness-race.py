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



owner, contractor, job = [str(uuid.uuid4()) for _ in range(3)]
insert = f"INSERT INTO public.reviews(job_id,reviewer_id,reviewee_id,rating,comment) VALUES('{job}','{owner}','{contractor}',5,'Synthetic review concurrency evidence') RETURNING id"
try:
    sql(f"INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid'); INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES('{job}','{owner}','{contractor}','Synthetic review race','Synthetic review concurrency fixture','Synthetic','completed');")
    app = 'audit_review_' + str(uuid.uuid4())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(sql, f"SET application_name='{app}'; BEGIN; {insert}; SELECT pg_sleep(3); COMMIT;")
        for _ in range(40):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep'") == '1': break
            if first.done(): raise AssertionError('Insert exited before observation')
            time.sleep(0.05)
        else: raise AssertionError('First insert not observed')
        second = pool.submit(sql, f"SET application_name='{app}_second'; SET statement_timeout='12s'; {insert};")
        for _ in range(30):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}_second' AND wait_event_type='Lock'") == '1': break
            if second.done(): raise AssertionError('Concurrent insert did not wait')
            time.sleep(0.05)
        else: raise AssertionError('Unique-index lock wait not observed')
        first.result(timeout=16)
        try:
            second.result(timeout=16)
            raise AssertionError('Duplicate review inserted')
        except RuntimeError as error:
            assert 'duplicate key value violates unique constraint' in str(error), str(error)
    assert sql(f"SELECT count(*) FROM public.reviews WHERE job_id='{job}' AND reviewer_id='{owner}' AND rating=5 AND comment='Synthetic review concurrency evidence'") == '1'
    print('PASS: concurrent review insert waited, duplicate rejected, one exact review persisted')
finally:
    sql(f"DELETE FROM public.reviews WHERE job_id='{job}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN('{owner}','{contractor}');")
