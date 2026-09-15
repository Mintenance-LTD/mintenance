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

def patch(generated_filter=True):
    params={'contractor_id':'eq.'+contractor,'tax_year':'eq.2025','select':'contractor_id'}
    if generated_filter: params['statement_generated']='eq.true'
    request=urllib.request.Request(base+'/rest/v1/tax_year_summaries?'+urllib.parse.urlencode(params),
        data=json.dumps({'statement_filed':True}).encode(), method='PATCH',
        headers={'apikey':service,'Authorization':'Bearer '+service,'Content-Type':'application/json','Prefer':'return=representation'})
    with urllib.request.urlopen(request,timeout=15) as response: return json.load(response)

try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{contractor}','filing-{contractor}@example.invalid')")
    assert patch()==[]
    sql(f"INSERT INTO public.tax_year_summaries(contractor_id,tax_year) VALUES ('{contractor}',2025)")
    assert patch()==[]
    assert sql(f"SELECT statement_filed FROM public.tax_year_summaries WHERE contractor_id='{contractor}'")=='f'
    assert patch(False)==[{'contractor_id':contractor}]
    print('REPRODUCED: old update permits filing an ungenerated statement')
    sql(f"UPDATE public.tax_year_summaries SET statement_filed=false,statement_generated=true WHERE contractor_id='{contractor}'")
    assert patch()==[{'contractor_id':contractor}]
    assert sql(f"SELECT statement_filed FROM public.tax_year_summaries WHERE contractor_id='{contractor}'")=='t'
    print('PASS: missing and ungenerated rows yield zero changes; generated row is returned and persisted')
finally:
    sql(f"DELETE FROM public.tax_year_summaries WHERE contractor_id='{contractor}'; DELETE FROM auth.users WHERE id='{contractor}'")
