"""Synthetic local-only contact and delivery races; generated fixtures always cleaned up."""
import concurrent.futures, subprocess, uuid
owner, prop, first, second = [str(uuid.uuid4()) for _ in range(4)]
def sql(query):
 return subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,encoding='utf-8',capture_output=True,timeout=30)
def check(result):
 if result.returncode: raise RuntimeError(result.stderr)
 return result.stdout.strip()
try:
 check(sql(f"INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid'); INSERT INTO public.properties(id,owner_id,property_name,address,property_type) VALUES('{prop}','{owner}','Synthetic','Synthetic','residential');"))
 def contact(item):
  identifier,email=item
  return sql(f"INSERT INTO public.property_tenants(id,property_id,name,email,is_active) VALUES('{identifier}','{prop}','Synthetic','{email}',true);")
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  created=list(pool.map(contact,[(first,'CONTACT@example.invalid'),(second,' contact@example.invalid ')]))
 assert sum(result.returncode==0 for result in created)==1, 'Concurrent normalized duplicate contact accepted'
 tenant=check(sql(f"SELECT id FROM public.property_tenants WHERE property_id='{prop}';"))
 uuid.UUID(tenant)
 def claim(_): return check(sql(f"SELECT public.claim_property_invitation('{tenant}','{prop}');"))
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  claims=list(pool.map(claim,[1,2]))
 assert sum(bool(value) for value in claims)==1, 'Concurrent delivery claims both won'
 attempt=next(value for value in claims if value); uuid.UUID(attempt)
 assert check(sql(f"SELECT public.finish_property_invitation('{tenant}','{uuid.uuid4()}',true);"))=='f', 'Foreign attempt finalized'
 assert check(sql(f"SELECT public.finish_property_invitation('{tenant}','{attempt}',false);"))=='t', 'Unknown outcome not tracked'
 assert not claim(1), 'Immediate retry after uncertain provider outcome allowed'
 assert check(sql("SELECT has_function_privilege('authenticated','public.claim_property_invitation(uuid,uuid)','EXECUTE');"))=='f', 'Public reservation RPC exposed'
 # Move only this synthetic attempt past the documented retry boundary.
 check(sql(f"UPDATE public.property_invitation_attempts SET attempted_at=now()-interval '16 minutes' WHERE tenant_id='{tenant}';"))
 assert claim(1), 'Explicit retry did not recover after cooldown'
 print('PASS: concurrent case-normalized contact uniqueness, exactly one delivery claim, stale finalization denial, unknown outcome cooldown, later retry and denied client RPC.')
finally:
 check(sql(f"DELETE FROM public.properties WHERE id='{prop}'; DELETE FROM auth.users WHERE id='{owner}';"))
