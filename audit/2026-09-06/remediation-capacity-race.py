import concurrent.futures
import subprocess
import uuid
container = 'supabase_db_mintenance-audit-20260906'
owner, contractor = str(uuid.uuid4()), str(uuid.uuid4())
jobs = [str(uuid.uuid4()) for _ in range(4)]
bids = [str(uuid.uuid4()) for _ in range(2)]
def sql(query):
    r = subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'], input=query,text=True,capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()
try:
    sql(f"INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('{owner}','capacity-{owner}@example.invalid','{{}}'),('{contractor}','capacity-{contractor}@example.invalid','{{}}'); UPDATE public.profiles SET first_name='Synthetic',last_name='Capacity' WHERE id IN ('{owner}','{contractor}'); UPDATE public.profiles SET role='contractor' WHERE id='{contractor}';")
    for i,j in enumerate(jobs):
        sql(f"INSERT INTO public.jobs(id,homeowner_id,contractor_id,title,description,location,status) VALUES ('{j}','{owner}',{repr(contractor) if i<2 else 'NULL'},'Synthetic capacity test','Synthetic rollback audit fixture','Synthetic',{repr('assigned' if i<2 else 'posted')});")
    for j,b in zip(jobs[2:], bids):
        sql(f"INSERT INTO public.bids(id,job_id,contractor_id,amount,description,status) VALUES ('{b}','{j}','{contractor}',500,'Synthetic capacity bid','pending');")
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
finally:
    for j in jobs: sql(f"DELETE FROM public.jobs WHERE id='{j}';")
    sql(f"DELETE FROM auth.users WHERE id IN ('{owner}','{contractor}');")
