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
owner, contractor, payer, job, escrow = [str(uuid.uuid4()) for _ in range(5)]
def sql(query):
    result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout.strip()
def read(table, query):
    request=urllib.request.Request(base+'/rest/v1/'+table+'?'+urllib.parse.urlencode(query),headers={'apikey':service,'Authorization':'Bearer '+service})
    try:
        with urllib.request.urlopen(request,timeout=15) as response: return json.load(response)
    except urllib.error.HTTPError as error: raise RuntimeError('Isolated review query failed: '+str(error.code)) from None
try:
    sql(f"INSERT INTO auth.users(id,email) VALUES ('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid'),('{payer}','{payer}@example.invalid'); INSERT INTO public.jobs(id,homeowner_id,contractor_id,payer_user_id,title,description,location,status,completed_at) VALUES ('{job}','{owner}','{contractor}','{payer}','Synthetic review data','Synthetic metadata pagination fixture','Synthetic','completed','2026-09-16T11:00:00Z'); INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status) VALUES ('{escrow}','{job}','{payer}','{contractor}',500,'held'); INSERT INTO public.job_rework_requests(job_id,actor_id,request_key,comments,created_at) VALUES ('{job}','{payer}','synthetic-{job}','Synthetic review request','2026-09-16T10:00:00.123456Z'); INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified,created_at) VALUES ('{job}','https://example.invalid/before','before',true,'2026-09-15T10:00:00Z'),('{job}','https://example.invalid/old-after','after',true,'2026-09-16T10:00:00.123456Z'); INSERT INTO public.job_photos_metadata(job_id,photo_url,photo_type,verified,created_at) SELECT '{job}','https://example.invalid/after-'||i,'after',true,'2026-09-16T10:00:00.123457Z' FROM generate_series(1,205) i;")
    joined=read('escrow_transactions',{'select':'id,amount,status,admin_hold_status,homeowner_approval,homeowner_inspection_completed,auto_approval_date,jobs!inner(id,title,homeowner_id,payer_user_id,status,completed_at)','id':'eq.'+escrow})
    assert len(joined)==1 and joined[0]['jobs']['payer_user_id']==payer
    rework=read('job_rework_requests',{'select':'created_at','job_id':'eq.'+job,'order':'created_at.desc','limit':'1'})[0]['created_at']
    rows=[]; cursor=None
    while True:
        query={'select':'id,photo_url,storage_path,photo_type,angle_type,quality_score,created_at','job_id':'eq.'+job,'photo_type':'in.(before,after)','order':'id.asc','limit':'200','or':'(photo_type.eq.before,created_at.gt.'+rework+')'}
        if cursor: query['id']='gt.'+cursor
        page=read('job_photos_metadata',query)
        if not page: break
        rows.extend(page); cursor=page[-1]['id']
    assert len(rows)==206 and len({p['id'] for p in rows})==206
    assert sum(p['photo_type']=='before' for p in rows)==1
    assert all(p['photo_url']!='https://example.invalid/old-after' for p in rows)
    print('PASS: real REST job join, both photo types, all 205 fresh after-photos across pages; microsecond-old evidence excluded without dropping new evidence')
finally:
    sql(f"DELETE FROM public.job_rework_requests WHERE job_id='{job}'; DELETE FROM public.job_photos_metadata WHERE job_id='{job}'; DELETE FROM public.escrow_transactions WHERE job_id='{job}'; DELETE FROM public.jobs WHERE id='{job}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{payer}');")
