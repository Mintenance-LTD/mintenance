import concurrent.futures
import subprocess
import uuid
owner, contractor, job, bid, contract, administrator = [str(uuid.uuid4()) for _ in range(6)]

def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906',
        'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'],
        input=query, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','refund-race-{owner}@example.invalid'),('{contractor}','refund-race-{contractor}@example.invalid'),('{administrator}','admin-race-{administrator}@example.invalid'); UPDATE public.profiles SET role='admin' WHERE id='{administrator}'; UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_release_race',stripe_payouts_enabled=true,stripe_transfers_active=true WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic refund','Synthetic maintenance description','Synthetic','posted'); INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{bid}','{job}','{contractor}',500,'Synthetic bid','accepted'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract}','{job}','{owner}','{contractor}',500,'accepted'); INSERT INTO public.user_credits(user_id,balance_pence) VALUES ('{owner}',5000);")
    funding=sql(f"SELECT id FROM public.reserve_payment_funding('{owner}','{job}','{bid}','{contract}','funding-{job}',50000)")
    escrow=sql(f"SELECT id FROM public.attach_payment_funding('{funding}','pi_synthetic_{job}')")
    sql(f"UPDATE public.escrow_transactions SET status='held' WHERE id='{escrow}'")
    sql(f"UPDATE public.jobs SET status='assigned' WHERE id='{job}'")
    def reserve(_):
        return sql(f"BEGIN; SET LOCAL ROLE service_role; SELECT id FROM public.reserve_job_exit('{contractor}','{job}','withdraw','The appointment cannot proceed','exit-{job}'); SELECT pg_sleep(0.4); COMMIT;")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        operations=list(pool.map(reserve,range(2)))
    assert len(set(operations))==1
    op=operations[0]
    refund=sql(f"SELECT id FROM public.escrow_refund_operations WHERE job_exit_id='{op}'")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: sql(f"BEGIN; SET LOCAL ROLE service_role; SELECT id FROM public.record_escrow_refund_outcome('{refund}','re_exit_race_{job}','succeeded'); SELECT pg_sleep(0.4); COMMIT;"),range(2)))
    assert sql(f"SELECT count(*) FROM public.job_exit_operations WHERE job_id='{job}'")=='1'
    assert sql(f"SELECT state FROM public.job_exit_operations WHERE id='{op}'")=='completed'
    assert sql(f"SELECT status FROM public.jobs WHERE id='{job}'")=='posted'
    assert sql(f"SELECT balance_pence FROM public.user_credits WHERE user_id='{owner}'")=='5000'
    assert sql(f"SELECT count(*) FROM public.notifications WHERE metadata->>'jobExitId'='{op}'")=='2'
    assert sql(f"SELECT count(*) FROM public.audit_logs WHERE new_values->>'jobExitId'='{op}'")=='1'
    print('PASS: concurrent exit requests share one operation and refund settlement restores credits and reopens the job once')

finally:
    sql(f"DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}'; DELETE FROM public.audit_logs WHERE record_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_admin_release_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_transfer_attempts WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_balances WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.retained_contract_records WHERE contract_id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.job_exit_operations WHERE job_id='{job}'; DELETE FROM public.audit_logs WHERE record_id='{job}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.job_audit_log WHERE changed_by IN ('{owner}','{contractor}','{administrator}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{administrator}');")

