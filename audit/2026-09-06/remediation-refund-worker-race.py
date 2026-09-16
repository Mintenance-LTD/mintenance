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
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','refund-race-{owner}@example.invalid'),('{contractor}','refund-race-{contractor}@example.invalid'),('{administrator}','admin-race-{administrator}@example.invalid'); UPDATE public.profiles SET role='admin' WHERE id='{administrator}'; UPDATE public.profiles SET role='contractor' WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic refund','Synthetic maintenance description','Synthetic','posted'); INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{bid}','{job}','{contractor}',500,'Synthetic bid','accepted'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract}','{job}','{owner}','{contractor}',500,'accepted'); INSERT INTO public.user_credits(user_id,balance_pence) VALUES ('{owner}',5000);")
    funding=sql(f"SELECT id FROM public.reserve_payment_funding('{owner}','{job}','{bid}','{contract}','funding-{job}',50000)")
    escrow=sql(f"SELECT id FROM public.attach_payment_funding('{funding}','pi_synthetic_{job}')")
    sql(f"UPDATE public.escrow_transactions SET status='held' WHERE id='{escrow}'")
    assert sql("SELECT count(*) FROM public.escrow_refund_operations WHERE state IN('reserved','pending','requires_action') AND created_at<now()-interval '2 minutes' AND recovery_after<=now() AND (recovery_lease_until IS NULL OR recovery_lease_until<=now())") == '0', 'Other due audit work exists; do not claim it'
    op=sql(f"SELECT id FROM public.reserve_admin_escrow_refund('{administrator}','{job}','{escrow}','lease-{job}',10000,'Synthetic')")
    sql(f"UPDATE public.escrow_refund_operations SET created_at=now()-interval '5 minutes' WHERE id='{op}'")
    def claim(_):
        return sql("BEGIN; SET LOCAL ROLE service_role; SELECT recovery_token FROM public.claim_refund_recovery(); SELECT pg_sleep(0.4); COMMIT;")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        tokens=list(pool.map(claim, range(2)))
    winners=[token for token in tokens if token]
    assert len(winners)==1, 'Overlapping workers obtained the same work'
    old_token=winners[0]
    sql(f"UPDATE public.escrow_refund_operations SET recovery_lease_until=now()-interval '1 second' WHERE id='{op}'")
    new_token=sql("SET ROLE service_role; SELECT recovery_token FROM public.claim_refund_recovery()")
    assert new_token and old_token != new_token, 'Expired claim was not replaced'
    assert sql(f"SET ROLE service_role; SELECT public.finish_refund_recovery('{op}','{old_token}',NULL)")=='f'
    assert sql(f"SET ROLE service_role; SELECT public.finish_refund_recovery('{op}','{new_token}',NULL)")=='t'
    print('PASS: separate workers claim once; expired takeover rejects stale acknowledgement')

finally:
    sql(f"DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}'; DELETE FROM public.audit_logs WHERE record_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_balances WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.retained_contract_records WHERE contract_id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.job_audit_log WHERE changed_by IN ('{owner}','{contractor}','{administrator}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{administrator}');")
