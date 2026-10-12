// Isolated audit stack only. Creates and removes uniquely scoped synthetic archives.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const ts = require('typescript');
const assert = require('node:assert/strict');
const helper = path.resolve('apps/web/lib/privacy/read-export-rows.ts');
const loaded = new Module(helper, module);
loaded._compile(ts.transpileModule(fs.readFileSync(helper, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, helper);
const { readExportRows } = loaded.exports;
const keys = fs.readFileSync('apps/web/test/integration/supabase-test-client.ts', 'utf8').match(/eyJ[^'\s]+/g);
const db = createClient('http://127.0.0.1:55321', keys[1], { auth: { persistSession: false } });
const subject = randomUUID(), job = randomUUID(), other = randomUUID();
function sql(statement) {
  execFileSync('docker', ['exec', '-i', 'supabase_db_mintenance-audit-20260906', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: statement, stdio: ['pipe', 'pipe', 'pipe'] });
}
(async () => {
  try {
    sql(`INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence)
      SELECT gen_random_uuid(),'${job}',ARRAY['${subject}'::uuid],'{"version":1,"contract":{}}' FROM generate_series(1,503);
      INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence)
      VALUES(gen_random_uuid(),'${job}',ARRAY['${other}'::uuid],'{"version":1,"contract":{}}');
      INSERT INTO public.retained_dispute_records(dispute_id,job_id,participant_ids,evidence)
      VALUES(gen_random_uuid(),'${job}',ARRAY['${subject}'::uuid],'{}');`);
    const query = () => db.from('retained_contract_records').select('id:contract_id,archived_at').contains('participant_ids', [subject]);
    const contracts = await readExportRows(query, 2000, 'contract_id');
    assert.equal(contracts.error, null); assert.equal(contracts.data.length, 503);
    assert.equal(new Set(contracts.data.map(row => row.id)).size, 503);
    const disputes = await readExportRows(() => db.from('retained_dispute_records').select('id:dispute_id,archived_at').contains('participant_ids', [subject]), 2000, 'dispute_id');
    assert.equal(disputes.error, null); assert.equal(disputes.data.length, 1);
    const bounded = await readExportRows(query, 3, 'contract_id');
    assert.equal(bounded.data, null); assert.ok(bounded.error);
    process.stdout.write('PASS: 503 scoped contracts across pages, unrelated record excluded, dispute primary key, explicit export bound\n');
  } finally {
    // job is freshly generated above; only these diagnostic records can match it.
    sql(`DELETE FROM public.retained_contract_records WHERE job_id='${job}'; DELETE FROM public.retained_dispute_records WHERE job_id='${job}';`);
    process.stdout.write('Synthetic archive fixtures removed\n');
  }
})().catch(() => { process.stderr.write('Account retained pagination diagnostic failed\n'); process.exitCode = 1; });
