"""Isolated deletion/archive role tests; no hosted data and all transactions roll back."""
import subprocess, uuid
owner,contractor,stranger,job,escrow,dispute=[str(uuid.uuid4()) for _ in range(6)]
setup=f"""BEGIN;
INSERT INTO auth.users(id,email) VALUES('{owner}','{owner}@example.invalid'),('{contractor}','{contractor}@example.invalid'),('{stranger}','{stranger}@example.invalid');
UPDATE public.profiles SET role='admin' WHERE id='{stranger}';
UPDATE public.profiles SET role='contractor' WHERE id='{contractor}';
INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES('{job}','{owner}','{contractor}','Synthetic maintenance','Synthetic maintenance description','Synthetic','posted');
INSERT INTO public.escrow_transactions(id,job_id,payer_id,payee_id,amount,status) VALUES('{escrow}','{job}','{owner}','{contractor}',100,'disputed');
INSERT INTO public.disputes(id,job_id,raised_by,against,reason,description,status) VALUES('{dispute}','{job}','{owner}','{contractor}','quality','Synthetic evidence','open');
INSERT INTO public.dispute_escrow_links(dispute_id,escrow_id) VALUES('{dispute}','{escrow}');
"""
def run(q):
 return subprocess.run(['docker','exec','-i','supabase_db_mintenance-audit-20260906','psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=q,text=True,encoding='utf-8',capture_output=True,timeout=40)
for removal in [f"DELETE FROM public.jobs WHERE id='{job}';",f"SELECT public.delete_user_data('{owner}');",f"SELECT public.delete_user_data('{contractor}');"]:
 survivor=owner if contractor in removal else contractor
 query=setup+removal+f"""
DO $$ BEGIN
 IF (SELECT count(*) FROM public.retained_dispute_records WHERE dispute_id='{dispute}')<>1 THEN RAISE EXCEPTION 'Archive missing'; END IF;
 IF public.read_retained_dispute('{escrow}','{survivor}')->>'description' IS DISTINCT FROM 'Synthetic evidence' THEN RAISE EXCEPTION 'Survivor lost evidence'; END IF;
 IF public.read_retained_dispute('{escrow}','{stranger}') IS NOT NULL THEN RAISE EXCEPTION 'Unrelated reader allowed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.retained_dispute_access_log WHERE dispute_id='{dispute}' AND actor_id='{survivor}') THEN RAISE EXCEPTION 'Read not audited'; END IF;
 IF has_function_privilege('authenticated','public.read_retained_dispute(uuid,uuid)','EXECUTE') OR has_table_privilege('authenticated','public.retained_dispute_records','SELECT') THEN RAISE EXCEPTION 'Direct archive access'; END IF;
END $$; ROLLBACK;"""
 result=run(query)
 assert result.returncode==0,result.stderr
print('PASS: job deletion and both actual account-deletion roles preserve one archive, surviving-party reads succeed, unrelated reads/direct client access denied, access audited; fixtures rolled back.')

result=run(setup+f"DELETE FROM public.dispute_escrow_links WHERE dispute_id='{dispute}'; DELETE FROM public.jobs WHERE id='{job}'; SELECT count(*) FROM public.retained_dispute_records WHERE dispute_id='{dispute}' AND escrow_id IS NULL; ROLLBACK;")
assert result.returncode==0 and result.stdout.strip().splitlines()[-1]=='1',result.stderr
print('PASS: legacy unbound dispute preserved without inventing an escrow association.')
