"""Observe overlapping recurring-cycle inserts against isolated Docker only."""
import concurrent.futures
import subprocess
import time
import uuid
owner,prop,schedule=[str(uuid.uuid4()) for _ in range(3)]
def sql(query):
    r=subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,encoding='utf-8',capture_output=True,timeout=20)
    return r
try:
    setup=sql(f"""INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid');
    INSERT INTO public.properties(id,owner_id,property_name,address,property_type) VALUES('{prop}','{owner}','Synthetic','Synthetic','residential');
    INSERT INTO public.recurring_schedules(id,owner_id,property_id,task_type,title,frequency,next_due_date,auto_create_job) VALUES('{schedule}','{owner}','{prop}','general','Synthetic','monthly','2026-01-31',true);""")
    assert setup.returncode==0, 'Fixture setup failed'
    insert=f"""INSERT INTO public.jobs(homeowner_id,property_id,title,description,location,status,requirements) VALUES('{owner}','{prop}','Synthetic recurring job','Synthetic recurring maintenance diagnostic','Synthetic','posted','{{"from_schedule_id":"{schedule}","schedule_cycle_due":"2026-01-31"}}');"""
    app='audit_cycle_'+uuid.uuid4().hex
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        first=pool.submit(sql,f"SET application_name='{app}'; BEGIN; {insert} SELECT pg_sleep(3); COMMIT;")
        sleeping=False
        for _ in range(30):
            state=sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep';")
            if state.stdout.strip()=='1': sleeping=True;break
            time.sleep(.1)
        assert sleeping, 'Did not observe the first transaction holding the cycle lock'
        second=pool.submit(sql,insert)
        one,two=first.result(),second.result()
        assert one.returncode==0, 'First insert failed'
        assert two.returncode!=0 and 'jobs_recurring_schedule_cycle_unique' in two.stderr, 'Concurrent duplicate was not rejected by the unique index'
    assert sql(f"SELECT count(*) FROM public.jobs WHERE homeowner_id='{owner}';").stdout.strip()=='1'
    print('PASS: overlapping transactions produced exactly one job for the due-date cycle')
finally:
    cleanup=sql(f"DELETE FROM public.jobs WHERE homeowner_id='{owner}'; DELETE FROM public.recurring_schedules WHERE id='{schedule}'; DELETE FROM public.properties WHERE id='{prop}'; DELETE FROM auth.users WHERE id='{owner}';")
    if cleanup.returncode: raise RuntimeError('Synthetic fixture cleanup failed')
