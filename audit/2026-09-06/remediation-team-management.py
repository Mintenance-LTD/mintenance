"""Synthetic role and overlapping-transaction checks; isolated Docker database only."""
import concurrent.futures
import subprocess
import time
import uuid
owner,admin,manager,prop=[str(uuid.uuid4()) for _ in range(4)]
def sql(query):
    return subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=query,text=True,encoding='utf-8',capture_output=True,timeout=25)
def invite(actor,email):
    return f"SELECT public.manage_property_team('{prop}','{actor}','invite','{email}','viewer');"
try:
    setup=sql(f"""INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid'),('{admin}','{admin}@example.invalid'),('{manager}','{manager}@example.invalid');
    INSERT INTO public.properties(id,owner_id,property_name,address,property_type) VALUES('{prop}','{owner}','Synthetic','Synthetic','residential');
    INSERT INTO public.property_team_members(property_id,invited_by,email,role,status,user_id) VALUES
      ('{prop}','{owner}','admin@example.invalid','admin','accepted','{admin}'),
      ('{prop}','{owner}','manager@example.invalid','manager','accepted','{manager}');
    INSERT INTO public.property_team_members(property_id,invited_by,email,role) SELECT '{prop}','{owner}','member'||n||'@example.invalid','viewer' FROM generate_series(1,6)n;""")
    assert setup.returncode==0, setup.stderr
    assert sql(invite(manager,'denied@example.invalid')).returncode!=0, 'Manager gained team administration'
    assert sql(invite(admin,' Mixed@Example.Invalid ')).returncode==0, 'Accepted team administrator denied'
    assert sql(invite(owner,'mixed@example.invalid')).returncode!=0, 'Case-insensitive duplicate accepted'
    assert sql("SELECT has_function_privilege('authenticated','public.manage_property_team(uuid,uuid,text,text,text,uuid)','EXECUTE') OR has_function_privilege('anon','public.manage_property_team(uuid,uuid,text,text,text,uuid)','EXECUTE');").stdout.strip()=='f', 'Public RPC access granted'
    app='audit_team_'+uuid.uuid4().hex
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        first=pool.submit(sql,f"SET application_name='{app}'; BEGIN; {invite(admin,'last@example.invalid')} SELECT pg_sleep(3); COMMIT;")
        for _ in range(30):
            if sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='PgSleep';").stdout.strip()=='1': break
            time.sleep(.1)
        else: raise AssertionError('First transaction lock was not observed')
        second=pool.submit(sql,f"INSERT INTO public.property_team_members(property_id,invited_by,email,role) VALUES('{prop}','{owner}','overflow@example.invalid','viewer');")
        one,two=first.result(),second.result()
        assert one.returncode==0, one.stderr
        assert two.returncode!=0 and 'Team member limit reached' in two.stderr, 'Overlapping legacy insert exceeded capacity'
    assert sql(f"SELECT count(*) FROM public.property_team_members WHERE property_id='{prop}';").stdout.strip()=='10'
    revoked=sql(f"SELECT public.manage_property_team('{prop}','{owner}','remove',NULL,NULL,(SELECT id FROM public.property_team_members WHERE property_id='{prop}' AND user_id='{admin}')); ")
    assert revoked.returncode==0, revoked.stderr
    assert sql(invite(admin,'revoked@example.invalid')).returncode!=0, 'Revoked administrator retained access'
    assert sql(invite(owner,'replacement@example.invalid')).returncode==0, 'Removed slot not reusable'
    print('PASS: administrator authorization, revocation, normalized duplicates, restricted grants, and overlapping RPC/legacy inserts capped at ten')
finally:
    result=sql(f"DELETE FROM public.properties WHERE id='{prop}'; DELETE FROM auth.users WHERE id IN ('{owner}','{admin}','{manager}');")
    if result.returncode: raise RuntimeError('Synthetic fixture cleanup failed')
