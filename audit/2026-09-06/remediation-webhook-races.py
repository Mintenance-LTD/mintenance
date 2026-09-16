"""Isolated synthetic connections; never contacts a payment provider."""
import concurrent.futures
import subprocess
import time
import uuid
container = 'supabase_db_mintenance-audit-20260906'
owner, contractor, job, escrow = [str(uuid.uuid4()) for _ in range(4)]
intent = 'pi_synthetic_' + escrow

def sql(query):
    result = subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout.strip()

try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid'); INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status,payment_status) VALUES ('{job}','{owner}','{contractor}','Synthetic webhook race','Synthetic webhook maintenance fixture','Synthetic','posted','pending'); INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,payment_intent_id) VALUES ('{escrow}','{job}','{owner}','{contractor}',500,'pending','{intent}');")
    for first, second in [('succeeded','failed'),('failed','succeeded')]:
        sql(f"UPDATE public.escrow_transactions SET status='pending' WHERE id='{escrow}'; UPDATE public.jobs SET payment_status='pending' WHERE id='{job}';")
        app = 'audit_webhook_' + str(uuid.uuid4())
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            leader = pool.submit(sql, f"SET application_name='{app}'; BEGIN; SET LOCAL statement_timeout='10s'; SELECT id FROM public.jobs WHERE id='{job}' FOR UPDATE; SELECT pg_sleep(2); SELECT count(*) FROM public.apply_payment_intent_state('{intent}','{first}',50000,'gbp'); COMMIT;")
            for _ in range(30):
                if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep'") == '1': break
                if leader.done(): raise AssertionError('Leader exited before lock observation')
                time.sleep(0.05)
            else: raise AssertionError('Did not observe the leader holding its job lock')
            follower = pool.submit(sql, f"SET statement_timeout='10s'; SELECT count(*) FROM public.apply_payment_intent_state('{intent}','{second}',50000,'gbp')")
            leader.result(timeout=15)
            count = follower.result(timeout=15)
        assert count == ('0' if first == 'succeeded' else '1')
        assert sql(f"SELECT e.status||'/'||j.payment_status FROM public.escrow_transactions e JOIN public.jobs j ON j.id=e.job_id WHERE e.id='{escrow}'") == 'held/paid'
        print('PASS: concurrent '+first+' then '+second+' preserves held/paid without split state')
    sql(f"UPDATE public.escrow_transactions SET status='failed' WHERE id='{escrow}'; INSERT INTO public.escrow_transactions(job_id,payer_id,payee_id,amount,status,payment_intent_id,created_at) VALUES ('{job}','{owner}','{contractor}',500,'held','{intent}_new',clock_timestamp()+interval '1 second');")
    assert sql(f"SELECT count(*) FROM public.apply_payment_intent_state('{intent}','failed')") == '0'
    assert sql(f"SELECT payment_status FROM public.jobs WHERE id='{job}'") == 'paid'
    assert sql("SELECT count(*) FROM public.apply_payment_intent_state('pi_missing_synthetic','failed')") == '0'
    print('PASS: obsolete and missing intents cannot mutate a newer paid job')
    sql(f"DELETE FROM public.escrow_transactions WHERE job_id='{job}'; UPDATE public.jobs SET payment_status='pending' WHERE id='{job}'; UPDATE public.profiles SET role='contractor' WHERE id='{contractor}'; INSERT INTO public.bids(job_id,contractor_id,amount,description,status) VALUES ('{job}','{contractor}',500,'Synthetic accepted funding bid','accepted'); INSERT INTO public.contracts(job_id,contractor_id,homeowner_id,amount,status) VALUES ('{job}','{contractor}','{owner}',500,'accepted'); INSERT INTO public.user_credits(user_id,balance_pence) VALUES ('{owner}',5000);")
    funding = sql(f"SELECT id FROM public.reserve_payment_funding('{owner}','{job}',(SELECT id FROM public.bids WHERE job_id='{job}'),(SELECT id FROM public.contracts WHERE job_id='{job}'),'audit-race-{job}',50000)")
    credited_intent = intent + '_credit'
    sql(f"SELECT id FROM public.attach_payment_funding('{funding}','{credited_intent}')")
    app = 'audit_cancel_' + str(uuid.uuid4())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        leader = pool.submit(sql, f"SET application_name='{app}'; BEGIN; SET LOCAL statement_timeout='10s'; SELECT id FROM public.jobs WHERE id='{job}' FOR UPDATE; SELECT pg_sleep(2); SELECT public.cancel_payment_funding('{funding}','{owner}','{credited_intent}'); COMMIT;")
        for _ in range(30):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep'") == '1': break
            if leader.done(): raise AssertionError('Cancellation exited before lock observation')
            time.sleep(0.05)
        else: raise AssertionError('Cancellation lock not observed')
        follower = pool.submit(sql, f"SET statement_timeout='10s'; SELECT count(*) FROM public.apply_payment_intent_state('{credited_intent}','succeeded',45000,'gbp')")
        leader.result(timeout=15)
        assert follower.result(timeout=15) == '0'
    assert sql(f"SELECT balance_pence FROM public.user_credits WHERE user_id='{owner}'") == '5000'
    assert sql(f"SELECT e.status||'/'||j.payment_status FROM public.escrow_transactions e JOIN public.jobs j ON j.id=e.job_id WHERE e.payment_intent_id='{credited_intent}'") == 'cancelled/canceled'
    print('PASS: cancellation wins the shared job lock; late success cannot revive escrow or consume restored credits')
finally:
    sql(f"DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE job_id='{job}'; DELETE FROM public.retained_contract_records WHERE job_id='{job}'; DELETE FROM public.bids WHERE job_id='{job}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.user_credit_ledger WHERE user_id='{owner}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
