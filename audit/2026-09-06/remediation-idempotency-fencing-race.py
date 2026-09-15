"""Real overlapping connections; only disposable stack, synthetic fixture, exact cleanup."""
import concurrent.futures
import subprocess
import uuid

actor = str(uuid.uuid4())
key = 'audit-fence-' + actor
command = ['docker', 'exec', '-i', 'supabase_db_mintenance-audit-20260906', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1']
def sql(query):
    result = subprocess.run(command, input=query, text=True, capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout.strip()

owner = None
try:
    sql(f"INSERT INTO auth.users(id,email) VALUES('{actor}','audit-fence-{actor}@example.invalid')")
    claim = f"SET ROLE service_role; SELECT claim_token FROM public.claim_fenced_idempotency('{key}','audit','{actor}',repeat('a',64),60,86400)"
    old = sql(claim)
    sql(f"UPDATE public.idempotency_keys SET claimed_at=now()-interval '2 minutes',claim_expires_at=now()-interval '1 minute' WHERE idempotency_key='{key}' AND operation='audit'")
    current = sql(claim)
    assert current and current != old
    owner = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    owner.stdin.write(f"BEGIN; SET LOCAL ROLE service_role; SELECT public.complete_fenced_idempotency('{key}','audit','{actor}','{current}','{{\"writer\":\"current\"}}',NULL); SELECT 'LOCKED';\n")
    owner.stdin.flush()
    while True:
        line = owner.stdout.readline()
        if line.strip() == 'LOCKED': break
        if not line: raise RuntimeError(owner.stderr.read())
    # The current owner's completion remains uncommitted while two old-request
    # connections attempt cleanup/completion. Token mismatch rejects both.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        calls = [
            f"SET ROLE service_role; SELECT public.complete_fenced_idempotency('{key}','audit','{actor}','{old}','{{}}',NULL)",
            f"SET ROLE service_role; SELECT public.release_fenced_idempotency('{key}','audit','{actor}','{old}')",
        ]
        futures = [pool.submit(sql, query) for query in calls]
        assert [future.result(timeout=15) for future in futures] == ['f', 'f']
    owner.stdin.write('COMMIT;\n')
    owner.stdin.close()
    assert owner.wait(timeout=15) == 0, owner.stderr.read()
    assert sql(f"SELECT result->>'writer' FROM public.idempotency_keys WHERE idempotency_key='{key}' AND status='completed'") == 'current'
    print('PASS: stale completion and release rejected while replacement completion was uncommitted; correct result retained')
finally:
    if owner is not None and owner.poll() is None:
        owner.kill()
        owner.wait(timeout=15)
    sql(f"DELETE FROM public.idempotency_keys WHERE idempotency_key='{key}' AND operation='audit'; DELETE FROM auth.users WHERE id='{actor}'")
