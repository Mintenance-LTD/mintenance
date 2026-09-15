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


ids=[str(uuid.uuid4()) for _ in range(2)]
try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','queue-{owner}@example.invalid'),('{contractor}','queue-{contractor}@example.invalid'); INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic queue','Synthetic queue description','Synthetic','posted');")
    for eid in ids:
        sql(f"INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status,payment_intent_id,created_at) VALUES ('{eid}','{job}','{owner}','{contractor}',100,'refunded','pi_synthetic_{eid}','1700-01-01')")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        claims=list(executor.map(lambda _: json.loads(sql('SET ROLE service_role; SELECT public.claim_payment_reconciliation()')),range(2)))
    assert {c['escrow_id'] for c in claims}==set(ids)
    assert claims[0]['token']!=claims[1]['token']
    for c in claims:
        assert sql(f"SET ROLE service_role; SELECT public.finish_payment_reconciliation('{c['escrow_id']}','{c['token']}','error','{{}}')")=='t'
    print('PASS: concurrent service-role workers claim different escrows; exact tokens acknowledge')
finally:
    sql(f"DELETE FROM public.escrow_transactions WHERE id IN ('{ids[0]}','{ids[1]}'); DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.job_audit_log WHERE changed_by IN ('{owner}','{contractor}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}')")
