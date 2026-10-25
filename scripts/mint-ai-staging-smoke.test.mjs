import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMintStaging } from './mint-ai-staging-smoke.mjs';

test('rejects a hosting authentication wall as proof of application security', async () => {
  const result = await checkMintStaging('https://preview.example', { request: async () => new Response('Sign in', { status: 401, headers: { 'content-type': 'text/html' } }) });
  assert.equal(result.passed, false);
});
test('accepts application authorization failures without writing anything', async () => {
  const result = await checkMintStaging('https://preview.example', { request: async (_url, options) => {
    assert.equal(options.method, undefined);
    assert.equal(options.redirect, 'manual');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  } });
  assert.equal(result.passed, true);
  assert.equal(result.authenticatedChecksRun, false);
});
test('checks the authenticated evaluation response and never includes credentials in output', async () => {
  const result = await checkMintStaging('https://preview.example', { adminCookie: 'secret-cookie', request: async (_url, options) => options.headers.Cookie
    ? Response.json({ kind: 'historical_review_audit', groups: [], reviewCount: 0, datasetId: 'dataset' })
    : Response.json({ error: 'Unauthorized' }, { status: 401 }) });
  assert.equal(result.passed, true);
  assert.equal(JSON.stringify(result).includes('secret-cookie'), false);
});

test('requires the inspection schema for an authenticated assessment check', async () => {
  const run = (activity) => checkMintStaging('https://preview.example', {
    adminCookie: 'secret-cookie', assessmentId: 'fixture',
    request: async (url, options) => {
      if (!options.headers.Cookie) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (url.pathname.endsWith('/evaluation')) return Response.json({ kind: 'historical_review_audit', groups: [], reviewCount: 0, datasetId: 'dataset' });
      if (url.pathname.endsWith('/activity')) return Response.json(activity);
      return Response.json({ sourceFingerprint: 'a'.repeat(64), images: [], reviews: [] });
    },
  });
  assert.equal((await run({ sourceFingerprint: 'a'.repeat(64), images: [], events: [] })).passed, true);
  const missingSchema = await run({ error: 'Missing migration' });
  assert.equal(missingSchema.passed, false);
  assert.equal(missingSchema.results.find(row => row.name.startsWith('Inspection activity loads')).pass, false);
});
