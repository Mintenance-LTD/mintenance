// Isolated Docker database only. Never reads deployment configuration.
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const container = 'supabase_db_mintenance-audit-20260906';
function sql(query, onOutput) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1']);
    let output = '', error = '';
    child.stdout.on('data', (data) => { output += data; onOutput?.(output); });
    child.stderr.on('data', (data) => { error += data; });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, output, error }));
    child.stdin.end(query);
  });
}
(async () => {
  const id = randomUUID();
  const insert = `INSERT INTO public.property_tenants(id,name) VALUES('${id}','Synthetic concurrent contact');`;
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const first = sql(`BEGIN; ${insert} SELECT 'reserved'; SELECT pg_sleep(3); COMMIT;`, (out) => {
    if (out.includes('reserved')) started();
  });
  // A failed first session must also unblock the test rather than wait forever.
  first.then(started);
  await ready;
  const second = sql(insert);
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.code, 0, a.error);
  assert.notEqual(b.code, 0);
  assert.match(b.error, /duplicate key/);
  const count = await sql(`SELECT count(*) FROM public.property_tenants WHERE id='${id}';`);
  assert.equal(count.output.trim(), '1');
  assert.equal((await sql(`DELETE FROM public.property_tenants WHERE id='${id}';`)).code, 0);
  assert.notEqual((await sql(insert)).code, 0);
  // Remove this test's opaque marker only from the isolated test database.
  assert.equal((await sql(`DELETE FROM public.property_contact_save_ids WHERE id='${id}';`)).code, 0);
  process.stdout.write('PASS: concurrent submissions create one contact; post-deletion replay is rejected.\n');
})().catch(() => { process.stderr.write('FAIL: isolated contact concurrency verification\n'); process.exitCode = 1; });
