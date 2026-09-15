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
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','refund-race-{owner}@example.invalid'),('{contractor}','refund-race-{contractor}@example.invalid'),('{administrator}','admin-race-{administrator}@example.invalid'); UPDATE public.profiles SET role='admin' WHERE id='{administrator}'; UPDATE public.profiles SET role='contractor',stripe_connect_account_id='acct_release_race',stripe_payouts_enabled=true,stripe_transfers_active=true WHERE id='{contractor}'; INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{job}','{owner}','{contractor}','Synthetic refund','Synthetic maintenance description','Synthetic','posted'); INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{bid}','{job}','{contractor}',500,'Synthetic bid','accepted'); INSERT INTO public.contracts(id,job_id,homeowner_id,contractor_id,amount,status) VALUES ('{contract}','{job}','{owner}','{contractor}',500,'accepted'); INSERT INTO public.user_credits(user_id,balance_pence) VALUES ('{owner}',5000);")
    funding=sql(f"SELECT id FROM public.reserve_payment_funding('{owner}','{job}','{bid}','{contract}','funding-{job}',50000)")
    escrow=sql(f"SELECT id FROM public.attach_payment_funding('{funding}','pi_synthetic_{job}')")
    sql(f"UPDATE public.escrow_transactions SET status='held' WHERE id='{escrow}'")
    refund=sql(f"SELECT id FROM public.reserve_admin_escrow_refund('{administrator}','{job}','{escrow}','statement-refund-{job}',10000,'Synthetic refund')")
    sql(f"SELECT id FROM public.record_escrow_refund_outcome('{refund}','re_statement_{job}','succeeded')")
    op=sql(f"SELECT id FROM public.reserve_admin_escrow_release('{administrator}','{escrow}','Synthetic release',0.12)")
    sql(f"SELECT escrow_id FROM public.reserve_escrow_transfer('{escrow}',35200,'acct_release_race')")
    sql(f"UPDATE public.escrow_transfer_attempts SET transfer_id='tr_statement_{job}' WHERE escrow_id='{escrow}'")
    sql(f"SELECT id FROM public.finalize_admin_escrow_release('{op}','tr_statement_{job}')")
    query=urllib.parse.urlencode({'select':'amount,platform_fee,contractor_payout,stripe_processing_fee,refund_balance:escrow_refund_balances(gross_minor,remaining_minor,needs_review)','id':'eq.'+escrow})
    request=urllib.request.Request(base+'/rest/v1/escrow_transactions?'+query,headers={'apikey':service,'Authorization':'Bearer '+service})
    try:
        with urllib.request.urlopen(request,timeout=15) as response:
            rows=json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError('Isolated earnings relationship request failed: '+str(error.code)) from None
    assert len(rows)==1
    row=rows[0]
    assert row['amount']==500 and row['platform_fee']==48 and row['contractor_payout']==352
    balance=row['refund_balance']
    if isinstance(balance,list):
        assert len(balance)==1
        balance=balance[0]
    assert balance=={'gross_minor':50000,'remaining_minor':40000,'needs_review':False}
    assert row['stripe_processing_fee'] is None
    print('PASS: real PostgREST earnings relationship returns remaining principal and recorded payout after partial refund and release')

finally:
    sql(f"DELETE FROM public.notifications WHERE metadata->>'jobId'='{job}'; DELETE FROM public.audit_logs WHERE record_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_admin_release_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_transfer_attempts WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_operations WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.escrow_refund_balances WHERE escrow_id IN(SELECT id FROM public.escrow_transactions WHERE job_id='{job}'); DELETE FROM public.payment_funding_reservations WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.contracts WHERE id='{contract}'; DELETE FROM public.retained_contract_records WHERE contract_id='{contract}'; DELETE FROM public.bids WHERE id='{bid}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM public.job_audit_log WHERE changed_by IN ('{owner}','{contractor}','{administrator}'); DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{administrator}');")

