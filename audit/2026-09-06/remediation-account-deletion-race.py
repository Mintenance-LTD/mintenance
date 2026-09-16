import concurrent.futures
import subprocess
import uuid
user = str(uuid.uuid4())
job = user

def sql(query):
    result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout.strip()

try:
    sql(f"INSERT INTO auth.users(id,email) VALUES('{user}','audit-deletion-{user}@example.invalid'); INSERT INTO public.homeowner_subscriptions(homeowner_id,plan_type,stripe_subscription_id) VALUES('{user}','landlord','sub_audit_concurrency');")
    import threading
    import time
    def held_transaction(query, competing, expected_error=None, expected_result=None):
        # Flush a marker after the first statement has acquired its row locks.
        proc=subprocess.Popen(['docker','exec','-i','supabase_db_mintenance-audit-20260906',
            'psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],
            stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
        try:
            proc.stdin.write("BEGIN; " + query + "; SELECT 'LOCKED';\n")
            proc.stdin.flush()
            while True:
                line=proc.stdout.readline()
                if line.strip()=='LOCKED': break
                if not line: raise RuntimeError(proc.stderr.read())
            started=threading.Event()
            def compete():
                started.set()
                try:
                    result=sql(f"SET application_name='audit-contract-race-{job}'; " + competing)
                except RuntimeError as error:
                    assert expected_error in str(error), str(error)
                    return
                if expected_error: raise AssertionError('Competing contract operation succeeded')
                assert result==expected_result, repr(result)
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future=pool.submit(compete)
                assert started.wait(5)
                deadline=time.monotonic()+15
                while sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='audit-contract-race-{job}' AND wait_event_type='Lock'")!='1':
                    if future.done(): future.result(); raise AssertionError('Competitor did not wait on contract locks')
                    if time.monotonic()>deadline: raise AssertionError('Competitor did not reach lock wait')
                    time.sleep(0.05)
                proc.stdin.write('COMMIT;\n')
                proc.stdin.close()
                assert proc.wait(timeout=15)==0, proc.stderr.read()
                future.result(timeout=15)
        finally:
            if proc.poll() is None: proc.kill()


    held_transaction(
        f"SELECT public.delete_account_with_recovery('{user}')",
        f"SELECT public.delete_account_with_recovery('{user}') IS NOT NULL",
        expected_result='t')
    operation = sql(f"SELECT id FROM public.account_deletion_operations WHERE user_id='{user}'")
    assert sql(f"SELECT count(*) FROM public.account_deletion_operations WHERE user_id='{user}'")=='1'
    assert sql(f"SELECT count(*) FROM public.account_deletion_cleanup_steps WHERE operation_id='{operation}'")=='2'
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        claims=list(pool.map(lambda _: sql(f"SELECT public.claim_account_cleanup_step('{operation}')->>'id'"),range(2)))
    assert len(set(claims))==2 and all(claims), repr(claims)
    assert sql(f"SELECT public.claim_account_cleanup_step('{operation}') IS NULL")=='t'
    print('PASS: concurrent erasure creates one durable journal; concurrent workers claim different steps')
finally:
    sql(f"DELETE FROM public.account_deletion_operations WHERE user_id='{user}'; DELETE FROM auth.users WHERE id='{user}';")
