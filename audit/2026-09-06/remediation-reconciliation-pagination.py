"""Synthetic local Auth verification; credentials are captured in memory and never printed."""
import json
import secrets
import subprocess
import urllib.request
import urllib.error
import uuid

status = subprocess.run(['node', 'C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js', '--offline', 'supabase', 'status', '--workdir', 'audit/2026-09-06/isolated-stack', '--output', 'env'], text=True, capture_output=True)
if status.returncode: raise RuntimeError('Unable to read isolated stack status')
env = {}
for line in status.stdout.splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip().strip('"')
base = env.get('API_URL', '')
if base.rstrip('/') != 'http://127.0.0.1:55321': raise RuntimeError('Refusing non-isolated Auth URL')
service = env['SERVICE_ROLE_KEY']
anon = env['ANON_KEY']


import urllib.parse
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
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','page-{owner}@example.invalid'),('{contractor}','page-{contractor}@example.invalid'); INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic pagination','Synthetic pagination description','Synthetic','posted'); INSERT INTO public.escrow_transactions(job_id,payer_id,payee_id,amount,status,created_at,metadata) SELECT '{job}','{owner}','{contractor}',100,'refunded',CASE WHEN i<=55 THEN NULL ELSE '2026-09-01T00:00:00.123456Z'::timestamptz END,jsonb_build_object('reconciliation_flag',i<=105) FROM generate_series(1,205) i;")
    expected=set(json.loads(sql(f"SELECT jsonb_agg(id) FROM public.escrow_transactions WHERE job_id='{job}' AND metadata->>'reconciliation_flag'='true'")))
    seen=[]; cursor=None
    for _ in range(3):
        params={'select':'id,created_at', 'job_id':'eq.'+job,
            'metadata->reconciliation_flag':'not.is.null', 'metadata->>reconciliation_flag':'neq.false',
            'order':'created_at.desc.nullslast,id.desc','limit':'51'}
        if cursor:
            if cursor['created_at'] is None:
                params['created_at']='is.null'; params['id']='lt.'+cursor['id']
            else:
                stamp=cursor['created_at']; eid=cursor['id']
                params['or']=f'(created_at.lt.{stamp},and(created_at.eq.{stamp},id.lt.{eid}),created_at.is.null)'
        request=urllib.request.Request(base+'/rest/v1/escrow_transactions?'+urllib.parse.urlencode(params),headers={'apikey':service,'Authorization':'Bearer '+service})
        with urllib.request.urlopen(request,timeout=15) as response: rows=json.load(response)
        page=rows[:50]; seen.extend(row['id'] for row in page)
        cursor=page[-1] if len(rows)>50 else None
    assert len(seen)==105 and len(set(seen))==105 and set(seen)==expected and cursor is None
    print('PASS: real PostgREST cursor traversal returns all 105 unresolved rows, including null dates and microsecond timestamp ties; excludes 100 resolved rows')
finally:
    sql(f"DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.job_audit_log WHERE changed_by IN ('{owner}','{contractor}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}')")
