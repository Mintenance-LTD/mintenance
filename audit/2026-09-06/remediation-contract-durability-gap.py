# Synthetic F11 regression: concurrent capacity claims must commit their contracts atomically.
import concurrent.futures
import subprocess
import uuid
container = 'supabase_db_mintenance-audit-20260906'
owner, contractor = str(uuid.uuid4()), str(uuid.uuid4())
jobs = [str(uuid.uuid4()) for _ in range(4)]
bids = [str(uuid.uuid4()) for _ in range(2)]
payer, quote, former = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
def sql(query):
    r = subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'], input=query,text=True,capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()
try:
    sql(f"INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('{owner}','capacity-{owner}@example.invalid','{{}}'),('{contractor}','capacity-{contractor}@example.invalid','{{}}'); UPDATE public.profiles SET first_name='Synthetic',last_name='Capacity' WHERE id IN ('{owner}','{contractor}'); UPDATE public.profiles SET role='contractor' WHERE id='{contractor}';")
    sql(f"INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('{payer}','capacity-{payer}@example.invalid','{{}}');")
    sql(f"INSERT INTO public.contractor_quotes(id,contractor_id,client_name,client_email,title,total_amount) VALUES ('{quote}','{contractor}','Synthetic','synthetic@example.invalid','Synthetic quote',500)")
    sql(f"INSERT INTO public.contractor_insurance(contractor_id,type,provider,policy_number,start_date,expiry_date,status) VALUES ('{contractor}','public_liability','Synthetic Insurance','SYNTHETIC-POLICY','2026-01-01','2027-01-01','active')")
    sql(f"INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('{former}','capacity-{former}@example.invalid','{{}}'); UPDATE public.profiles SET role='contractor' WHERE id='{former}';")
    for i,j in enumerate(jobs):
        sql(f"INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{j}','{owner}',{repr(contractor) if i<2 else 'NULL'},'Synthetic capacity test','Synthetic rollback audit fixture','Synthetic',{repr('assigned' if i<2 else 'posted')});")
    for j,b in zip(jobs[2:], bids):
        sql(f"INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{b}','{j}','{contractor}',500,'Synthetic capacity bid','pending');")
    for actor in ["NULL", "'" + str(uuid.uuid4()) + "'"]:
        assert sql(f"SELECT success FROM public.accept_bid_with_capacity('{bids[0]}','{jobs[2]}','{contractor}',{actor},3)") == 'f'
    assert sql("SELECT has_function_privilege('authenticated','public.accept_bid_with_capacity(uuid,uuid,uuid,uuid,integer)','EXECUTE') OR has_function_privilege('anon','public.accept_bid_with_capacity(uuid,uuid,uuid,uuid,integer)','EXECUTE')") == 'f'
    print('PASS: null/unrelated actors and direct client execution are denied')
    sql(f"UPDATE public.profiles SET company_name='Synthetic Company',license_number='SYNTHETIC-123',license_type='trade' WHERE id='{contractor}'")
    for bid in bids:
        sql(f"UPDATE public.bids SET message='Synthetic detailed proposal',proposed_start_date='2026-10-01',estimated_duration_days=4,warranty_months=12,materials_included=true,quote_id='{quote}' WHERE id='{bid}'")
    sql(f"""BEGIN;
      UPDATE public.jobs SET payer_user_id='{payer}' WHERE id='{jobs[2]}';
      DO $$ BEGIN
       IF (SELECT success FROM public.accept_bid_with_capacity('{bids[0]}','{jobs[2]}','{contractor}','{owner}',3)) THEN
        RAISE EXCEPTION 'owner bypassed designated payer'; END IF;
       IF NOT (SELECT success FROM public.accept_bid_with_capacity('{bids[0]}','{jobs[2]}','{contractor}','{payer}',3)) THEN
        RAISE EXCEPTION 'designated payer could not accept'; END IF;
       IF NOT EXISTS(SELECT 1 FROM public.contracts WHERE job_id='{jobs[2]}' AND homeowner_id='{payer}') THEN
        RAISE EXCEPTION 'contract does not name the accepting payer'; END IF;
      END $$; ROLLBACK;""")
    print('PASS: designated payer can accept and becomes the contract party; owner cannot bypass that designation')
    sql(f"""BEGIN;
      DO $$ DECLARE old_id uuid; old_evidence jsonb; BEGIN
       INSERT INTO public.contracts(job_id,contractor_id,homeowner_id,title,amount,status)
        VALUES ('{jobs[2]}','{former}','{owner}','Signed former agreement',400,'pending_contractor') RETURNING id INTO old_id;
       PERFORM public.sign_contract_atomic(old_id,'{former}',NULL,NULL,'synthetic audit');
       PERFORM public.sign_contract_atomic(old_id,'{owner}',NULL,NULL,'synthetic audit');
       SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) INTO old_evidence FROM public.contract_acceptance_evidence e WHERE contract_id=old_id;
       UPDATE public.jobs SET status='assigned',contractor_id='{former}' WHERE id='{jobs[2]}';
       PERFORM public.reserve_job_exit('{former}','{jobs[2]}','withdraw','Synthetic withdrawal','audit-exit-{jobs[2]}');
       IF NOT EXISTS(SELECT 1 FROM public.jobs WHERE id='{jobs[2]}' AND status='posted' AND contractor_id IS NULL) THEN
        RAISE EXCEPTION 'job exit did not reopen the job'; END IF;
       IF NOT (SELECT success FROM public.accept_bid_with_capacity('{bids[0]}','{jobs[2]}','{contractor}','{owner}',3)) THEN
        RAISE EXCEPTION 'new contractor acceptance failed'; END IF;
       IF (SELECT count(*) FROM public.contracts WHERE job_id='{jobs[2]}')<>2
        OR old_evidence IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.contract_acceptance_evidence e WHERE contract_id=old_id)
        OR NOT EXISTS(SELECT 1 FROM public.contracts WHERE id=old_id AND status='cancelled' AND contractor_signed_at IS NOT NULL AND homeowner_signed_at IS NOT NULL) THEN
        RAISE EXCEPTION 'signed history or evidence was changed'; END IF;
      END $$; ROLLBACK;""")
    print('PASS: replacement contractor gets a new agreement while original signatures and snapshots remain unchanged')
    for job in jobs[2:]:
        sql(f"INSERT INTO public.contracts(job_id,contractor_id,homeowner_id,title,description,amount,status) VALUES ('{job}','{former}','{owner}','Previous synthetic agreement','Historical terms must survive',400,'cancelled')")
    sql(f"""DO $$ BEGIN
      BEGIN
       UPDATE public.contracts SET status='draft' WHERE job_id='{jobs[2]}';
       RAISE EXCEPTION 'cancelled contract was revived';
      EXCEPTION WHEN check_violation THEN NULL; END;
    END $$;""")
    print('PASS: cancelled agreements cannot be revived or rewritten')
    # Inject a contract-write failure in a rolled-back transaction. No persistent trigger.
    sql(f"""BEGIN;
    CREATE FUNCTION public.audit_fail_contract_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic contract write failure'; END $$;
    CREATE TRIGGER audit_fail_contract_insert BEFORE INSERT ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.audit_fail_contract_insert();
    DO $$ BEGIN
      BEGIN
        PERFORM public.accept_bid_with_capacity('{bids[0]}','{jobs[2]}','{contractor}','{owner}',3);
        RAISE EXCEPTION 'expected injected failure';
      EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'synthetic contract write failure' THEN RAISE; END IF;
      END;
      IF (SELECT status FROM public.jobs WHERE id='{jobs[2]}') <> 'posted'
        OR (SELECT status FROM public.bids WHERE id='{bids[0]}') <> 'pending'
        OR EXISTS(SELECT 1 FROM public.contracts WHERE job_id='{jobs[2]}' AND status<>'cancelled') THEN
        RAISE EXCEPTION 'contract failure did not roll back acceptance';
      END IF;
    END $$;
    ROLLBACK;""")
    print('PASS: injected contract-write failure rolls back the job and bid transition')
    # Reproduce a withdrawal committed after an API could have read pending.
    sql(f"UPDATE public.bids SET status='withdrawn' WHERE id='{bids[0]}';")
    assert sql(f"SELECT success FROM public.accept_bid_with_capacity('{bids[0]}','{jobs[2]}','{contractor}','{owner}',3);")=='f'
    assert sql(f"SELECT status FROM public.jobs WHERE id='{jobs[2]}';")=='posted'
    assert sql(f"SELECT status FROM public.bids WHERE id='{bids[0]}';")=='withdrawn'
    print('PASS: withdrawn bid is rejected by the locked database transition without assigning the job')
    sql(f"UPDATE public.bids SET status='pending' WHERE id='{bids[0]}';")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        fs=[pool.submit(sql, f"BEGIN; SELECT success FROM public.accept_bid_with_capacity('{b}','{j}','{contractor}','{owner}',3); SELECT pg_sleep(0.5); COMMIT;") for j,b in zip(jobs[2:], bids)]
        assert sorted(f.result().strip() for f in fs)==['f','t']
    assert sql(f"SELECT count(*) FROM public.jobs WHERE contractor_id='{contractor}' AND status IN ('assigned','in_progress');")=='3'
    print('PASS: two concurrent acceptances compete for one slot; exactly one succeeds, active count=3')
    winner = sql(f"SELECT id FROM public.jobs WHERE id IN ('{jobs[2]}','{jobs[3]}') AND status='assigned'")
    count = sql(f"SELECT count(*) FROM public.contracts WHERE job_id='{winner}' AND status<>'cancelled'")
    assert count == '1', 'Committed acceptance must include one contract'
    assert sql(f"SELECT description='Synthetic detailed proposal' AND start_date='2026-10-01 09:00:00+00' AND end_date='2026-10-05 09:00:00+00' AND terms->>'warranty_months'='12' AND terms->>'materials_included'='true' AND contractor_company_name='Synthetic Company' AND contractor_license_registration='SYNTHETIC-123' FROM public.contracts WHERE job_id='{winner}' AND status<>'cancelled'") == 't'
    print('PASS: proposal, schedule, warranty, materials and contractor identity are copied into the contract')
    assert sql(f"SELECT quote_id='{quote}' AND terms->>'insurance_provider'='Synthetic Insurance' AND terms->>'insurance_policy_number'='SYNTHETIC-POLICY' AND terms->>'insurance_expiry_date'='2027-01-01' FROM public.contracts WHERE job_id='{winner}' AND status<>'cancelled'") == 't'
    print('PASS: quote linkage and insurance snapshot survive atomic acceptance')
    assert sql(f"SELECT count(*) FROM public.contracts WHERE job_id='{winner}' AND status='cancelled' AND description='Historical terms must survive' AND amount=400 AND contractor_id='{former}'") == '1'
    print('PASS: a new agreement coexists with unchanged cancelled contract history')
    winner_bid = bids[jobs[2:].index(winner)]
    before = sql(f"SELECT id FROM public.contracts WHERE job_id='{winner}' AND status<>'cancelled'")
    sql(f"UPDATE public.contracts SET amount=550,description='Negotiated synthetic scope' WHERE id='{before}'")
    assert sql(f"SELECT success FROM public.accept_bid_with_capacity('{winner_bid}','{winner}','{contractor}','{owner}',3)") == 't'
    assert sql(f"SELECT id FROM public.contracts WHERE job_id='{winner}' AND status<>'cancelled'") == before
    assert sql(f"SELECT amount=550 AND description='Negotiated synthetic scope' FROM public.contracts WHERE id='{before}'") == 't'
    assert sql(f"SELECT count(*) FROM public.notifications WHERE metadata->>'contractId'='{before}'") == '2'
    print('PASS: winning assignment has one durable contract; retry at capacity preserves it without duplicate notifications')
finally:
    for j in jobs: sql(f"DELETE FROM public.contracts WHERE job_id='{j}'; DELETE FROM public.jobs WHERE id='{j}';")
    sql(f"DELETE FROM public.contractor_quotes WHERE id='{quote}'; DELETE FROM public.contractor_insurance WHERE contractor_id='{contractor}'; DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}','{payer}','{former}');")
