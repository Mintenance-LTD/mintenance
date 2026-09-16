import concurrent.futures
import subprocess
import uuid
owner, contractor, job, bid, contract = [str(uuid.uuid4()) for _ in range(5)]

def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906',
        'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'],
        input=query, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','refund-race-{owner}@example.invalid'),('{contractor}','refund-race-{contractor}@example.invalid'); UPDATE public.profiles SET role='contractor' WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic refund','Synthetic maintenance description','Synthetic','posted'); INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{bid}','{job}','{contractor}',500,'Synthetic bid','accepted'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract}','{job}','{owner}','{contractor}',500,'accepted'); INSERT INTO public.user_credits(user_id,balance_pence) VALUES ('{owner}',5000);")
    funding=sql(f"SELECT id FROM public.reserve_payment_funding('{owner}','{job}','{bid}','{contract}','funding-{job}',50000)")
    escrow=sql(f"SELECT id FROM public.attach_payment_funding('{funding}','pi_synthetic_{job}')")
    sql(f"UPDATE public.escrow_transactions SET status='held' WHERE id='{escrow}'")
    import threading
    import time
    def held_transaction(query, competing, expected_error):
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
                    sql(f"SET application_name='audit-payout-race-{job}'; " + competing)
                except RuntimeError as error:
                    assert expected_error in str(error), str(error)
                    return
                raise AssertionError('Competing financial operation succeeded')
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future=pool.submit(compete)
                assert started.wait(5)
                deadline=time.monotonic()+15
                while sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='audit-payout-race-{job}' AND wait_event_type='Lock'")!='1':
                    if future.done(): future.result(); raise AssertionError('Competitor did not wait on financial locks')
                    if time.monotonic()>deadline: raise AssertionError('Competitor did not reach lock wait')
                    time.sleep(0.05)
                proc.stdin.write('COMMIT;\n')
                proc.stdin.close()
                assert proc.wait(timeout=15)==0, proc.stderr.read()
                future.result(timeout=15)
        finally:
            if proc.poll() is None: proc.kill()
    held_transaction(
        f"SELECT id FROM public.reserve_escrow_refund('{owner}','{job}','{escrow}','refund-{job}',10000,'Synthetic')",
        f"SELECT public.credit_payout_balance('{contractor}',35000,'GBP','{job}')",
        'Escrow cannot be credited')
    op=sql(f"SELECT id FROM public.escrow_refund_operations WHERE escrow_id='{escrow}'")
    sql(f"SELECT id FROM public.record_escrow_refund_outcome('{op}','re_synthetic_{job}','failed'); UPDATE public.escrow_transactions SET status='release_pending',release_reason='auto_release' WHERE id='{escrow}'")
    held_transaction(
        f"SELECT public.credit_payout_balance('{contractor}',35000,'GBP','{job}'); UPDATE public.escrow_transactions SET status='held',release_reason=NULL WHERE id='{escrow}'",
        f"SELECT id FROM public.reserve_escrow_refund('{owner}','{job}','{escrow}','after-credit-{job}',10000,'Synthetic')",
        'Escrow cannot be claimed for refund')
    assert sql(f"SELECT pending_amount_minor FROM public.contractor_payout_balances WHERE contractor_id='{contractor}' AND currency='GBP'")=='35000'
    assert sql(f"SELECT count(*) FROM public.escrow_refund_operations WHERE escrow_id='{escrow}'")=='1'
    print('PASS: refund-first and accumulated-credit-first concurrent transactions exclude the competing operation')
finally:
    sql(f"DELETE FROM public.contractor_payout_credit_events WHERE job_id='{job}'; DELETE FROM public.contractor_payout_balances WHERE contractor_id='{contractor}'; DELETE FROM public.escrow_refund_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_balances WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.retained_contract_records WHERE contract_id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
