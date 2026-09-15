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
    def reserve(index):
        try:
            return sql(f"BEGIN; SELECT id FROM public.reserve_escrow_refund('{owner}','{job}','{escrow}','refund-{job}-{index}',10000,'Synthetic'); SELECT pg_sleep(0.4); COMMIT;")
        except RuntimeError as error:
            assert 'Escrow cannot be claimed for refund' in str(error), str(error)
            return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, range(2)))
    winners=[item for item in results if item is not None]
    assert len(winners)==1, 'Concurrent operations both reserved the escrow'
    op=winners[0]
    assert sql(f"SELECT count(*) FROM public.escrow_refund_operations WHERE escrow_id='{escrow}'") == '1'
    # The second request races a duplicate finalization of the winning request.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: sql(f"BEGIN; SELECT id FROM public.record_escrow_refund_outcome('{op}','re_synthetic_{job}','succeeded'); SELECT pg_sleep(0.4); COMMIT;"),range(2)))
    assert sql(f"SELECT remaining_minor FROM public.escrow_refund_balances WHERE escrow_id='{escrow}'") == '40000'
    assert sql(f"SELECT balance_pence FROM public.user_credits WHERE user_id='{owner}'") == '0'
    print('PASS: concurrent refund requests reserve once; concurrent finalizations deduct principal once')
finally:
    sql(f"DELETE FROM public.escrow_refund_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_balances WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.retained_contract_records WHERE contract_id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
