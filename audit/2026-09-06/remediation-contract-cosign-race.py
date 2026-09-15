import concurrent.futures
import subprocess
import uuid
owner, contractor, cosigner, job, contract, job2, contract2, job3, contract3 = [str(uuid.uuid4()) for _ in range(9)]

def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906',
        'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'],
        input=query, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','audit-{owner}@example.invalid'),('{contractor}','audit-{contractor}@example.invalid'),('{cosigner}','audit-{cosigner}@example.invalid'); UPDATE public.profiles SET role='contractor',first_name='Synthetic',last_name='Signer' WHERE id='{contractor}'; UPDATE public.profiles SET first_name='Synthetic',last_name='Signer' WHERE id='{owner}'; INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic race','Synthetic maintenance description','Synthetic','draft'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract}','{job}','{owner}','{contractor}',500,'pending_contractor'); INSERT INTO public.contract_signatories(contract_id,user_id,role) VALUES ('{contract}','{cosigner}','second_homeowner');")
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
        f"SELECT public.sign_contract_cosigner_atomic('{contract}','{cosigner}')->>'success'",
        f"SELECT public.delete_unsigned_contract_atomic('{contract}','{contractor}')",
        expected_error='Only unsigned draft or pending contracts can be deleted')
    sql(f"SELECT public.sign_contract_atomic('{contract}','{contractor}',NULL,NULL,NULL)")
    held_transaction(
        f"SELECT public.sign_contract_atomic('{contract}','{owner}',NULL,NULL,NULL)->>'status'",
        f"INSERT INTO public.contract_signatories(contract_id,user_id,role) VALUES ('{contract}','{owner}','second_homeowner')",
        expected_error='Contract no longer accepts invitations')
    held_transaction(
        f"SELECT public.sign_contract_cosigner_atomic('{contract}','{cosigner}')->>'already_signed'",
        f"SELECT public.sign_contract_cosigner_atomic('{contract}','{cosigner}')->>'already_signed'",
        expected_result='true')
    assert sql(f"SELECT count(*) FROM public.contract_cosignature_evidence WHERE contract_id='{contract}'")=='1'
    assert sql(f"SELECT status FROM public.contracts WHERE id='{contract}'")=='accepted'
    sql(f"INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job2}','{owner}','{contractor}','Synthetic final signing','Synthetic maintenance description','Synthetic','draft'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract2}','{job2}','{owner}','{contractor}',500,'pending_contractor'); INSERT INTO public.contract_signatories(contract_id,user_id,role) VALUES ('{contract2}','{cosigner}','second_homeowner'); SELECT public.sign_contract_atomic('{contract2}','{contractor}',NULL,NULL,NULL); SELECT public.sign_contract_atomic('{contract2}','{owner}',NULL,NULL,NULL);")
    held_transaction(
        f"SELECT public.sign_contract_cosigner_atomic('{contract2}','{cosigner}')->>'contract_promoted'",
        f"SELECT public.sign_contract_cosigner_atomic('{contract2}','{cosigner}')->>'already_signed'",
        expected_result='true')
    assert sql(f"SELECT count(*) FROM public.notifications WHERE metadata->>'contractId'='{contract2}'")=='2'
    assert sql(f"SELECT count(*) FROM public.contract_cosignature_evidence WHERE contract_id='{contract2}'")=='1'
    sql(f"INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job3}','{owner}','{contractor}','Synthetic deletion race','Synthetic maintenance description','Synthetic','draft'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract3}','{job3}','{owner}','{contractor}',500,'pending_contractor'); INSERT INTO public.contract_signatories(contract_id,user_id,role) VALUES ('{contract3}','{cosigner}','second_homeowner');")
    held_transaction(
        f"SELECT public.delete_unsigned_contract_atomic('{contract3}','{contractor}')",
        f"SELECT public.sign_contract_cosigner_atomic('{contract3}','{cosigner}')",
        expected_error='Contract not found')
    assert sql(f"SELECT count(*) FROM public.contract_cosignature_evidence WHERE contract_id='{contract3}'")=='0'
    print('PASS: co-sign/delete and primary-sign/invite serialize; concurrent replay retains one evidence row')
finally:
    sql(f"DELETE FROM public.notifications WHERE user_id IN ('{owner}','{contractor}','{cosigner}'); DELETE FROM public.contracts WHERE id IN ('{contract}','{contract2}','{contract3}'); DELETE FROM public.jobs WHERE id IN ('{job}','{job2}','{job3}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{cosigner}');")
