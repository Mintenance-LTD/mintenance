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
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','earnings-{owner}@example.invalid'),('{contractor}','earnings-{contractor}@example.invalid'); UPDATE public.profiles SET role='contractor' WHERE id='{contractor}';")
    sql(f"INSERT INTO public.escrow_transactions(payer_id,payee_id,amount,platform_fee,contractor_payout,stripe_processing_fee,status,released_at) SELECT '{owner}','{contractor}',100,12,88,NULL,'released','2025-06-01T10:00:00Z' FROM generate_series(1,1205);")
    def page(after=None, limit=None):
        query={'select':'id,amount,platform_fee,contractor_payout,refund_balance:escrow_refund_balances(gross_minor,remaining_minor,needs_review)', 'payee_id':'eq.'+contractor, 'status':'in.(released,completed)', 'released_at':'gte.2025-04-06T00:00:00Z', 'order':'id.asc'}
        if after: query['id']='gt.'+after
        if limit: query['limit']=str(limit)
        request=urllib.request.Request(base+'/rest/v1/escrow_transactions?'+urllib.parse.urlencode(query),headers={'apikey':service,'Authorization':'Bearer '+service})
        try:
            with urllib.request.urlopen(request,timeout=15) as response: return json.load(response)
        except urllib.error.HTTPError as error: raise RuntimeError('Isolated earnings query failed: '+str(error.code)) from None
    original=page()
    assert len(original)==1000, 'Expected configured default API cap of 1000'
    rows=[]
    after=None
    while True:
        batch=page(after,500)
        if not batch: break
        assert all(after is None or row['id']>after for row in batch)
        rows.extend(batch)
        after=batch[-1]['id']
    assert len(rows)==1205 and len({r['id'] for r in rows})==1205
    assert sum(r['amount'] for r in rows)==120500 and sum(r['contractor_payout'] for r in rows)==106040
    print('PASS: original real REST query truncates to 1000; ordered cursor queries return all 1205 payments exactly once with correct principal/payout totals')
finally:
    sql(f"DELETE FROM public.escrow_transactions WHERE payer_id='{owner}' AND payee_id='{contractor}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
