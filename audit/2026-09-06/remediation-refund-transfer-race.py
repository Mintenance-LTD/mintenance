"""Synthetic, isolated database concurrency regression; no provider calls."""
import concurrent.futures
import subprocess
import time
import uuid

owner, contractor, job, escrow = [str(uuid.uuid4()) for _ in range(4)]
container = 'supabase_db_mintenance-audit-20260906'

def query(statement, expect_success=True):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], input=statement, text=True, capture_output=True)
    if expect_success and result.returncode:
        raise RuntimeError(result.stderr)
    return result

def sql(statement):
    return query(statement).stdout.strip()

def sleeping(name):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{name}' AND wait_event='PgSleep'") == '1':
            return
        time.sleep(0.05)
    raise AssertionError('First transaction did not reach its lock-held barrier')

reserve = f"SELECT escrow_id FROM public.reserve_escrow_transfer('{escrow}',43000,'acct_synthetic')"
refund = f"UPDATE public.escrow_transactions SET status='release_pending', release_reason='refund_pending' WHERE id='{escrow}'"
try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','refund-race-{owner}@example.invalid'),('{contractor}','refund-race-{contractor}@example.invalid'); UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_synthetic' WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,title,description,location,status) VALUES ('{job}','{owner}','Synthetic race','Synthetic maintenance description','Synthetic','draft'); INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status) VALUES ('{escrow}','{job}','{owner}','{contractor}',500,'release_pending');")
    for first, second, expected in [(reserve, refund, 'A payout attempt exists'), (refund, reserve, 'Escrow is not claimed for release')]:
        sql(f"DELETE FROM public.escrow_transfer_attempts WHERE escrow_id='{escrow}'; UPDATE public.escrow_transactions SET status='release_pending',release_reason=NULL WHERE id='{escrow}';")
        name = 'audit-race-' + str(uuid.uuid4())
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            winner = pool.submit(query, f"SET application_name='{name}'; BEGIN; {first}; SELECT pg_sleep(2); COMMIT;")
            sleeping(name)
            loser = pool.submit(query, second, False)
            winner.result()
            outcome = loser.result()
        assert outcome.returncode != 0 and expected in outcome.stderr, outcome.stderr
    assert sql(f"SELECT count(*) FROM public.escrow_transfer_attempts WHERE escrow_id='{escrow}'") == '0'
    print('PASS: payout-first and refund-first concurrent transactions reject the competing operation')
finally:
    sql(f"DELETE FROM public.escrow_transfer_attempts WHERE escrow_id='{escrow}'; DELETE FROM public.escrow_transactions WHERE id='{escrow}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
