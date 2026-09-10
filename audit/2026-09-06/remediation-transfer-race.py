import concurrent.futures
import subprocess
import uuid
owner, contractor, job, escrow = [str(uuid.uuid4()) for _ in range(4)]
def sql(query):
    r = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()
try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','transfer-{owner}@example.invalid'),('{contractor}','transfer-{contractor}@example.invalid'); UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_synthetic' WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,title,description,location,status) VALUES ('{job}','{owner}','Synthetic transfer','Synthetic maintenance description','Synthetic','draft'); INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status) VALUES ('{escrow}','{job}','{owner}','{contractor}',500,'release_pending');")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _: sql(f"BEGIN; SELECT idempotency_key||stripe_parameters::text FROM public.reserve_escrow_transfer('{escrow}',43000,'acct_synthetic'); SELECT pg_sleep(0.4); COMMIT;"),range(2)))
    assert results[0] == results[1]
    assert sql(f"SELECT count(*) FROM public.escrow_transfer_attempts WHERE escrow_id='{escrow}';") == '1'
    print('PASS: two concurrent release paths reserve one identical provider operation')
finally:
    sql(f"DELETE FROM public.escrow_transfer_attempts WHERE escrow_id='{escrow}'; DELETE FROM public.escrow_transactions WHERE id='{escrow}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
