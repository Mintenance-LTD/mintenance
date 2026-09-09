"""Local-only milestone race test. Uses no deployment credentials."""
import concurrent.futures
import subprocess
import uuid

container = 'supabase_db_mintenance-audit-20260906'
actor = str(uuid.uuid4())

def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], input=query, text=True, capture_output=True, check=True)
    return result.stdout.strip()

try:
    sql(f"INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('{actor}','race-{actor}@example.invalid','{{}}'); SELECT * FROM public.increment_contractor_contribution_stats('{actor}',10,50);")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(sql, f"BEGIN; SELECT bonus FROM public.claim_contractor_contribution_milestone('{actor}'); SELECT pg_sleep(0.5); COMMIT;") for _ in range(2)]
        results = [f.result().strip() for f in futures]
    assert sorted(float(r) for r in results) == [0, 10], results
    assert sql(f"SELECT credits_earned FROM public.contractor_contributions WHERE contractor_id='{actor}';") == '60.00'
    assert sql(f"SELECT count(*) FROM public.contractor_milestone_claims WHERE contractor_id='{actor}';") == '1'
    print('PASS: concurrent milestone claims award exactly once, balance=60, claims=1')
finally:
    sql(f"DELETE FROM public.contractor_milestone_claims WHERE contractor_id='{actor}'; DELETE FROM public.contractor_contributions WHERE contractor_id='{actor}'; DELETE FROM auth.users WHERE id='{actor}';")
