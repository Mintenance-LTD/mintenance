const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isIP } = require('node:net');
const { isolatedClientHeaders } = require('./e2e-client-ip.cjs');
const env = {
  CI: 'true',
  E2E_TESTING: 'true',
  E2E_SUPABASE_URL: 'http://127.0.0.1:56321',
};
const origin = 'https://localhost:3000';

test('attempts retain one valid IP while unrelated tests and retries are isolated', () => {
  const headers = isolatedClientHeaders(env, origin, 'test-a', 0, {
    'x-existing': 'kept',
  });
  assert.equal(headers['x-existing'], 'kept');
  assert.equal(isIP(headers['x-vercel-forwarded-for']), 6);
  assert.deepEqual(
    headers,
    isolatedClientHeaders(env, origin, 'test-a', 0, { 'x-existing': 'kept' })
  );
  assert.notEqual(
    headers['x-vercel-forwarded-for'],
    isolatedClientHeaders(env, origin, 'test-b', 0)['x-vercel-forwarded-for']
  );
  assert.notEqual(
    headers['x-vercel-forwarded-for'],
    isolatedClientHeaders(env, origin, 'test-a', 1)['x-vercel-forwarded-for']
  );
});

test('never injects a client IP outside CI', () => {
  assert.deepEqual(
    isolatedClientHeaders({}, 'https://www.mintenance.co.uk', 'a', 0, {
      Accept: 'application/json',
    }),
    { Accept: 'application/json' }
  );
});

test('rejects hosted targets, non-disposable databases and missing E2E gate', () => {
  for (const baseURL of [
    'https://www.mintenance.co.uk',
    'https://preview.vercel.app',
    'http://localhost:3000',
    'https://localhost:3000.evil.test',
  ]) {
    assert.throws(
      () => isolatedClientHeaders(env, baseURL, 'a', 0),
      /loopback/
    );
  }
  assert.throws(
    () =>
      isolatedClientHeaders({ ...env, E2E_TESTING: 'false' }, origin, 'a', 0),
    /loopback/
  );
  assert.throws(
    () =>
      isolatedClientHeaders(
        { ...env, E2E_SUPABASE_URL: 'https://example.supabase.co' },
        origin,
        'a',
        0
      ),
    /loopback/
  );
});
