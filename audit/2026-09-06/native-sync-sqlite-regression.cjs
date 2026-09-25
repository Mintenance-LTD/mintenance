// Real in-memory SQLite regression against the production table definitions and reader.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const source = fs.readFileSync(
  'apps/mobile/src/services/local-db/SyncStore.ts',
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleExports = {};
new Function('exports', 'require', compiled)(moduleExports, () => ({
  logger: { info() {} },
}));
const schema = fs.readFileSync(
  'apps/mobile/src/services/local-db/LocalDatabaseService.ts',
  'utf8'
);
const db = new DatabaseSync(':memory:');
for (const match of schema.matchAll(/`(CREATE TABLE IF NOT EXISTS [^`]+)`/g))
  db.exec(match[1]);
db.exec(
  "INSERT INTO messages(id,sender_id,created_at,is_dirty) VALUES ('older','synthetic','2026-01-01',1),('newer','synthetic','2026-01-02',1),('synced','synthetic','2026-01-03',0)"
);
(async () => {
  try {
    const adapter = { getAllAsync: async (sql) => db.prepare(sql).all() };
    assert.deepEqual(
      (await moduleExports.getDirtyRecords(adapter, 'messages')).map(
        (row) => row.id
      ),
      ['newer', 'older']
    );
    for (const table of ['users', 'jobs', 'bids'])
      assert.deepEqual(await moduleExports.getDirtyRecords(adapter, table), []);
    await assert.rejects(
      moduleExports.getDirtyRecords(adapter, 'messages; DROP TABLE users'),
      /unknown table/
    );
    console.log(
      'PASS: actual SQLite schema, dirty messages ordered and filtered, other tables valid, identifier injection rejected.'
    );
  } finally {
    db.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
