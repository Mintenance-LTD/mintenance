"""Observed overlapping transactions and actual PostgREST join; isolated fixtures only."""
import concurrent.futures
import json
import subprocess
import time
import urllib.parse
import urllib.request
import uuid

owner, contractor, payer, other_payer, job, escrow, other_escrow = [str(uuid.uuid4()) for _ in range(7)]
def sql(query):
    result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906',
        'psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],
        input=query,text=True,encoding='utf-8',capture_output=True,timeout=20)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout.strip()

status = subprocess.run(['node','C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js','--offline',
    'supabase','status','--workdir','audit/2026-09-06/isolated-stack','--output','env'],
    text=True,capture_output=True,timeout=30)
if status.returncode: raise RuntimeError('Unable to inspect isolated runtime')
env = {}
for line in status.stdout.splitlines():
    if '=' in line:
        key,value=line.split('=',1); env[key.strip()]=value.strip().strip('"')
base=env.get('API_URL','')
if base.rstrip('/') != 'http://127.0.0.1:55321': raise RuntimeError('Refusing non-local runtime')
service=env['SERVICE_ROLE_KEY']
try:
    sql(f"""INSERT INTO auth.users(id,email) VALUES
    ('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid'),
    ('{payer}','{payer}@example.invalid'),('{other_payer}','{other_payer}@example.invalid');
    INSERT INTO public.jobs(id,homeowner_id,payer_user_id,contractor_id,title,description,location,status)
    VALUES('{job}','{owner}','{payer}','{contractor}','Synthetic dispute','Synthetic fixture','Synthetic','completed');
    INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
    VALUES('{escrow}','{job}','{payer}','{contractor}',100,'held');""")
    request=f"SELECT dispute_id FROM public.create_customer_job_dispute('{job}','{owner}','The completed repair is incomplete','incomplete')"
    app1='audit_job_dispute_'+str(uuid.uuid4()); app2=app1+'_retry'
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        first=pool.submit(sql,f"SET application_name='{app1}'; BEGIN; SET LOCAL ROLE service_role; {request}; SELECT pg_sleep(4); COMMIT;")
        for _ in range(30):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app1}' AND wait_event='PgSleep'")=='1': break
            if first.done(): raise AssertionError('First request exited before overlap')
            time.sleep(0.05)
        else: raise AssertionError('First lock not observed')
        second=pool.submit(sql,f"SET application_name='{app2}'; SET ROLE service_role; {request};")
        for _ in range(20):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app2}' AND wait_event_type='Lock'")=='1': break
            if second.done(): raise AssertionError('Retry did not wait for the original transaction')
            time.sleep(0.05)
        else: raise AssertionError('Retry lock wait not observed')
        original=first.result(timeout=10); replay=second.result(timeout=10)
    assert original==replay and original, 'Concurrent retry did not recover the same dispute'
    assert sql(f"SELECT count(*) FROM public.disputes WHERE job_id='{job}'")=='1'
    assert sql(f"SELECT count(*) FROM public.notifications WHERE metadata->>'jobId'='{job}'")=='3'
    sql(f"""INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status)
    VALUES('{other_escrow}','{job}','{other_payer}','{contractor}',100,'held');
    SELECT dispute_id FROM public.create_dispute_atomic('{other_escrow}','{other_payer}','{contractor}','Other payment issue','Synthetic other payer evidence');
    NOTIFY pgrst, 'reload schema';""")
    query={'select':'id,reason,description,dispute_escrow_links!inner(escrow_id)',
        'job_id':'eq.'+job,'dispute_escrow_links.escrow_id':'eq.'+escrow,'order':'created_at.desc','limit':'1'}
    req=urllib.request.Request(base+'/rest/v1/disputes?'+urllib.parse.urlencode(query),
        headers={'apikey':service,'Authorization':'Bearer '+service})
    with urllib.request.urlopen(req,timeout=15) as response: rows=json.load(response)
    assert len(rows)==1 and rows[0]['id']==original and rows[0]['reason']=='The completed repair is incomplete'
    assert rows[0]['dispute_escrow_links']=={'escrow_id':escrow}
    print('PASS: observed concurrent customer disputes serialize to one record and three notices; actual REST join excludes another payer dispute on the same job')
finally:
    sql(f"""DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}';
    DELETE FROM public.dispute_escrow_links WHERE escrow_id IN('{escrow}','{other_escrow}');
    DELETE FROM public.disputes WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}';
    DELETE FROM public.jobs WHERE id='{job}';
    DELETE FROM auth.users WHERE id IN('{owner}','{contractor}','{payer}','{other_payer}');""")
