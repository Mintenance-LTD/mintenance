const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  checkRelease,
  requiredMigrations,
  verifyApplied,
  digest,
} = require('./check-release-migrations.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mint-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'supabase/migrations'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'supabase/migrations/001_old.sql'),
    'SELECT 1;\n'
  );
  fs.writeFileSync(
    path.join(root, 'supabase/migrations/002_new.sql'),
    'SELECT 2;\n'
  );
  fs.writeFileSync(
    path.join(root, 'supabase/release-baseline.json'),
    JSON.stringify({
      files: { '001_old.sql': digest('SELECT 1;\n') },
      required: [],
    })
  );
  return root;
}
const production = {
  VERCEL_ENV: 'production',
  NEXT_PUBLIC_SUPABASE_URL: 'https://ukrjudtlvapiajkjbcrd.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};
test('new and backdated files require recorded migrations', (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, 'supabase/migrations/000_backdated.sql'),
    'SELECT 3;'
  );
  assert.deepEqual(
    requiredMigrations(root).map((x) => x.name),
    ['backdated', 'new']
  );
  assert.throws(() => verifyApplied(requiredMigrations(root), []), /missing/);
});
test('changed or removed historical files stop a release', (t) => {
  const root = fixture(t);
  fs.writeFileSync(
    path.join(root, 'supabase/migrations/001_old.sql'),
    'SELECT 99;'
  );
  assert.throws(() => requiredMigrations(root), /changed/);
  fs.unlinkSync(path.join(root, 'supabase/migrations/001_old.sql'));
  assert.throws(() => requiredMigrations(root), /removed/);
});
test('new migration absent from database prevents production build', async (t) => {
  await assert.rejects(
    checkRelease({
      root: fixture(t),
      env: production,
      request: async () => new Response('[]'),
    }),
    /missing/
  );
});
test('unavailable, malformed and rejected database checks fail closed', async (t) => {
  const root = fixture(t);
  for (const request of [
    async () => {
      throw Error('network unavailable');
    },
    async () => new Response('{}'),
    async () => new Response('denied', { status: 403 }),
  ])
    await assert.rejects(checkRelease({ root, env: production, request }));
});
test('production cannot skip with a false opt-in; missing secrets fail', async (t) => {
  await assert.rejects(
    checkRelease({
      root: fixture(t),
      env: {
        ...production,
        REQUIRE_SCHEMA_CHECK: 'false',
        SUPABASE_SERVICE_ROLE_KEY: '',
      },
    }),
    /credential/
  );
});
test('production refuses staging and credentials are never sent to a different host', async (t) => {
  for (const url of [
    'https://pzothyoipifjwnypzcuv.supabase.co',
    'https://evil.invalid',
    'https://ukrjudtlvapiajkjbcrd.supabase.co@evil.invalid',
  ]) {
    await assert.rejects(
      checkRelease({
        root: fixture(t),
        env: { ...production, NEXT_PUBLIC_SUPABASE_URL: url },
        request: () => assert.fail('must not fetch'),
      }),
      /target mismatch/
    );
  }
});
test('successful preflight uses a bounded nonredirecting service-only request', async (t) => {
  const root = fixture(t);
  const result = await checkRelease({
    root,
    env: production,
    request: async (url, options) => {
      assert.equal(url.origin, production.NEXT_PUBLIC_SUPABASE_URL);
      assert.equal(options.redirect, 'error');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.apikey, 'test-service-key');
      assert.ok(options.signal);
      return new Response(JSON.stringify([{ version: '002', name: 'new' }]));
    },
  });
  assert.equal(result.checked, 1);
});
test('MCP timestamp alias accepted only with an unambiguous exact name', () => {
  const required = [{ version: '002', name: 'new' }];
  assert.equal(verifyApplied(required, [{ version: '003', name: 'new' }]), 1);
  assert.throws(
    () => verifyApplied(required, [{ version: '002', name: 'other' }]),
    /missing/
  );
  assert.throws(
    () =>
      verifyApplied(required, [
        { version: '003', name: 'new' },
        { version: '004', name: 'new' },
      ]),
    /missing/
  );
});
test('local/ordinary preview builds do not receive production database credentials', async () => {
  assert.deepEqual(
    await checkRelease({ env: {}, request: () => assert.fail() }),
    { skipped: true }
  );
});
test('repository migration baseline and new files are valid', () => {
  const required = requiredMigrations(path.resolve(__dirname, '..'));
  assert.ok(required.some((x) => x.name === 'release_migration_gate'));
  assert.ok(required.some((x) => x.name === 'stripe_chargeback_journal'));
});
