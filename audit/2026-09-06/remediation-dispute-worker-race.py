"""Real concurrent connections; synthetic fixtures; isolated audit database only."""
import concurrent.futures
import subprocess
import time
import uuid

owner, contractor, administrator, job, escrow = [str(uuid.uuid4()) for _ in range(5)]


def sql(query):
    result = subprocess.run([
        'docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906',
        'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'
    ], input=query, text=True, encoding='utf-8', capture_output=True, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


try:
    assert sql("SELECT count(*) FROM public.escrow_dispute_resolutions WHERE state='processing' AND created_at<now()-interval '2 minutes' AND recovery_after<=now() AND (recovery_lease_until IS NULL OR recovery_lease_until<=now())") == '0', 'Other due work exists; do not claim it'
    sql(f"""
    INSERT INTO auth.users(id,email) VALUES
      ('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid'),('{administrator}','{administrator}@example.invalid');
    UPDATE public.profiles SET role='admin' WHERE id='{administrator}';
    INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status)
      VALUES('{job}','{owner}','{contractor}','Synthetic dispute race','Synthetic recovery fixture','Synthetic','completed');
    INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
      VALUES('{escrow}','{job}','{owner}','{contractor}',100,'held');
    SELECT dispute_id FROM public.create_dispute_atomic('{escrow}','{owner}','{contractor}','Incomplete repair','Synthetic recovery test');
    """)
    resolution = sql(f"SELECT id FROM public.reserve_dispute_resolution('{administrator}','{escrow}','refund_homeowner','Synthetic recovery decision',0.1)")
    sql(f"UPDATE public.escrow_dispute_resolutions SET created_at=now()-interval '5 minutes' WHERE id='{resolution}'")
    app = 'audit_dispute_lease_' + str(uuid.uuid4())
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(sql, f"SET application_name='{app}'; BEGIN; SET LOCAL ROLE service_role; SELECT recovery_token FROM public.claim_dispute_resolution_recovery(); SELECT pg_sleep(4); COMMIT;")
        for _ in range(40):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep'") == '1':
                break
            if first.done():
                raise AssertionError('First worker exited before overlap was observed')
            time.sleep(0.05)
        else:
            raise AssertionError('First worker lock not observed')
        second = pool.submit(sql, "SET ROLE service_role; SELECT recovery_token FROM public.claim_dispute_resolution_recovery()")
        assert second.result(timeout=3) == '', 'Second worker claimed locked decision'
        old_token = first.result(timeout=10)
    assert old_token, 'First worker did not claim the decision'
    sql(f"UPDATE public.escrow_dispute_resolutions SET recovery_lease_until=now()-interval '1 second' WHERE id='{resolution}'")
    new_token = sql("SET ROLE service_role; SELECT recovery_token FROM public.claim_dispute_resolution_recovery()")
    assert new_token and new_token != old_token, 'Abandoned decision not reclaimed'
    assert sql(f"SET ROLE service_role; SELECT public.finish_dispute_resolution_recovery('{resolution}','{old_token}',NULL)") == 'f'
    assert sql(f"SET ROLE service_role; SELECT public.finish_dispute_resolution_recovery('{resolution}','{new_token}',NULL)") == 't'
    print('PASS: observed overlapping workers claim once; expired takeover rejects stale acknowledgement')
finally:
    sql(f"""
    DELETE FROM public.escrow_dispute_resolutions WHERE escrow_id='{escrow}';
    DELETE FROM public.dispute_escrow_links WHERE escrow_id='{escrow}';
    DELETE FROM public.disputes WHERE job_id='{job}';
    DELETE FROM public.escrow_transactions WHERE id='{escrow}';
    DELETE FROM public.jobs WHERE id='{job}';
    DELETE FROM public.job_audit_log WHERE changed_by IN('{owner}','{contractor}','{administrator}');
    DELETE FROM auth.users WHERE id IN('{owner}','{contractor}','{administrator}');
    """)
