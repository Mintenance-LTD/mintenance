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
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','funding-{owner}@example.invalid'),('{contractor}','funding-{contractor}@example.invalid'); UPDATE public.profiles SET role='contractor' WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic funding','Synthetic maintenance description','Synthetic','draft'); INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{bid}','{job}','{contractor}',500,'Synthetic bid','accepted'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract}','{job}','{owner}','{contractor}',500,'accepted'); INSERT INTO public.user_credits(user_id,balance_pence) VALUES ('{owner}',5000);")
    def reserve(index):
        return sql(f"BEGIN; SELECT id FROM public.reserve_payment_funding('{owner}','{job}','{bid}','{contract}','race-{job}-{index}',50000); SELECT pg_sleep(0.4); COMMIT;")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, range(2)))
    assert results[0] == results[1], 'Concurrent requests reserved different funding'
    assert sql(f"SELECT count(*) FROM public.payment_funding_reservations WHERE job_id='{job}'") == '1'
    assert sql(f"SELECT balance_pence FROM public.user_credits WHERE user_id='{owner}'") == '0'
    assert sql(f"SELECT count(*) FROM public.user_credit_ledger WHERE user_id='{owner}' AND delta_pence=-5000") == '1'
    print('PASS: concurrent different request keys reuse one reservation and debit credit once')
finally:
    sql(f"DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
