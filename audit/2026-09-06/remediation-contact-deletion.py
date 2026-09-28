"""Synthetic, rolled-back checks for contact/account deletion relationships."""
import subprocess
import uuid

owner, invitee, property_id, contact = [str(uuid.uuid4()) for _ in range(4)]
sql = f"""BEGIN;
INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid'),('{invitee}','{invitee}@example.invalid');
INSERT INTO public.properties(id,owner_id,property_name,address,property_type)
VALUES('{property_id}','{owner}','Synthetic deletion check','Synthetic','residential');
INSERT INTO public.property_tenants(id,property_id,name,user_id,invitation_accepted_at)
VALUES('{contact}','{property_id}','Synthetic contact','{invitee}',now());
SAVEPOINT direct_auth;
DELETE FROM auth.users WHERE id='{invitee}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='{invitee}') THEN RAISE EXCEPTION 'Account retained'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.property_tenants WHERE id='{contact}' AND user_id IS NULL AND invitation_accepted_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Owner contact lost or used invitation reopened'; END IF;
END $$;
ROLLBACK TO SAVEPOINT direct_auth;
SELECT public.delete_account_with_recovery('{invitee}');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id='{invitee}') OR EXISTS(SELECT 1 FROM public.property_tenants WHERE id='{contact}') THEN
  RAISE EXCEPTION 'Normal account erasure did not remove personal contact'; END IF;
END $$;
INSERT INTO public.property_tenants(id,property_id,name) VALUES('{contact}','{property_id}','Synthetic owner contact');
DELETE FROM public.properties WHERE id='{property_id}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.property_tenants WHERE id='{contact}') THEN RAISE EXCEPTION 'Detached personal contact retained'; END IF;
END $$;
ROLLBACK;
"""
result = subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-v','ON_ERROR_STOP=1'], input=sql,text=True,encoding='utf-8',capture_output=True,timeout=45)
if result.returncode:
 print(result.stderr)
 raise SystemExit(result.returncode)
print('PASS: direct Auth deletion unlinks contact without reopening invitation; normal erasure removes personal contact; property deletion removes contacts; rolled back.')
