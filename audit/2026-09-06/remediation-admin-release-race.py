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
    def reserve(index):
        return sql(f"BEGIN; SET LOCAL ROLE service_role; SELECT id FROM public.reserve_admin_escrow_release('{administrator}','{escrow}','Synthetic release',0.12); SELECT pg_sleep(0.4); COMMIT;")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, range(2)))
    assert len(set(results)) == 1, 'Concurrent requests created different operations'
    op=results[0]
    assert sql(f"SELECT count(*) FROM public.escrow_admin_release_operations WHERE escrow_id='{escrow}'") == '1'
    assert sql(f"SELECT principal_minor||','||fee_minor||','||payout_minor FROM public.escrow_admin_release_operations WHERE id='{op}'") == '50000,6000,44000'
    sql(f"SET ROLE service_role; SELECT escrow_id FROM public.reserve_escrow_transfer('{escrow}',44000,'acct_release_race')")
    # Synthetic provider evidence, no external transfer or provider call.
    sql(f"UPDATE public.escrow_transfer_attempts SET transfer_id='tr_release_race_{job}' WHERE escrow_id='{escrow}'")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: sql(f"BEGIN; SET LOCAL ROLE service_role; SELECT id FROM public.finalize_admin_escrow_release('{op}','tr_release_race_{job}'); SELECT pg_sleep(0.4); COMMIT;"),range(2)))
    assert sql(f"SELECT status||','||platform_fee||','||contractor_payout FROM public.escrow_transactions WHERE id='{escrow}'") == 'completed,60.00,440.00'
    assert sql(f"SELECT count(*) FROM public.notifications WHERE metadata->>'releaseOperationId'='{op}'") == '2'
    assert sql(f"SELECT count(*) FROM public.audit_logs WHERE new_values->>'operation_id'='{op}'") == '1'
    assert sql(f"SELECT count(*) FROM public.platform_fee_transfers WHERE escrow_transaction_id='{escrow}'") == '1'
    print('PASS: concurrent admin release claims share one operation; concurrent finalization emits notifications and audit once')

finally:
    sql(f"DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}'; DELETE FROM public.audit_logs WHERE record_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_admin_release_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_transfer_attempts WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_balances WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.retained_contract_records WHERE contract_id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.job_audit_log WHERE changed_by IN ('{owner}','{contractor}','{administrator}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{administrator}');")

