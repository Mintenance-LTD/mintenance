"""Storage RLS diagnostics against the isolated local database only; fixtures rolled back."""
import subprocess, uuid
owner, stranger, job = [str(uuid.uuid4()) for _ in range(3)]
path=f"{job}/disputes/{owner}/evidence.jpg"
def run(query):
 return subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,encoding='utf-8',capture_output=True,timeout=30)
setup=f"""BEGIN;
-- Match the Storage API deletion transaction; RLS remains fully enabled.
SET LOCAL storage.allow_delete_query = 'true';
INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid'),('{stranger}','{stranger}@example.invalid');
INSERT INTO public.jobs(id,homeowner_id,title,description,location,status) VALUES('{job}','{owner}','Synthetic','Synthetic description','Synthetic','posted');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','{owner}',true);
"""
insert=f"INSERT INTO storage.objects(bucket_id,name,owner) VALUES('job-attachments','{path}','{owner}');"
r=run(setup+insert+f"UPDATE storage.objects SET metadata='{{}}' WHERE name='{path}'; DELETE FROM storage.objects WHERE name='{path}'; RESET ROLE; SELECT count(*) FROM storage.objects WHERE name='{path}'; ROLLBACK;")
assert r.returncode==0, r.stderr
assert r.stdout.strip().splitlines()[-1]=='1', 'Evidence was deleted'
# Explicit UPDATE RETURNING proves that replacement was denied, independently of deletion.
r=run(setup+insert+f"WITH changed AS (UPDATE storage.objects SET metadata='{{}}' WHERE name='{path}' RETURNING id) SELECT count(*) FROM changed; ROLLBACK;")
assert r.returncode==0 and r.stdout.strip().splitlines()[-1]=='0', r.stderr
for actor, destination in [(stranger,path.replace(owner,stranger)),(owner,path.replace(owner,stranger))]:
 r=run(setup+f"SELECT set_config('request.jwt.claim.sub','{actor}',true); INSERT INTO storage.objects(bucket_id,name,owner) VALUES('job-attachments','{destination}','{actor}'); ROLLBACK;")
 assert r.returncode!=0 and 'row-level security' in r.stderr, 'Unauthorized upload allowed: '+r.stderr
print('PASS: participant upload allowed; unrelated job/folder uploads denied; evidence updates and deletes denied. Transactions rolled back.')
