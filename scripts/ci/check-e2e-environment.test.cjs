const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateE2EEnvironment } = require('./check-e2e-environment.cjs');
const fixture = {
  E2E_SUPABASE_URL: 'https://synthetic-test.supabase.co',
  E2E_SUPABASE_ANON_KEY: 'synthetic',
  E2E_SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
  SUPABASE_URL: 'https://live-project.supabase.co',
  STRIPE_SECRET_KEY: 'sk_test_synthetic',
};
test('accepts separate synthetic services', () => assert.doesNotThrow(() => validateE2EEnvironment(fixture)));
test('rejects missing dedicated secrets', () => assert.throws(() => validateE2EEnvironment({}), /dedicated/));
test('rejects the configured production host, including alternate paths', () => assert.throws(() => validateE2EEnvironment({ ...fixture, E2E_SUPABASE_URL: fixture.SUPABASE_URL + '/rest/v1' }), /live/));
test('rejects the known live project without the production secret', () => assert.throws(() => validateE2EEnvironment({ ...fixture, SUPABASE_URL: '', E2E_SUPABASE_URL: 'https://ukrjudtlvapiajkjbcrd.supabase.co' }), /live/));
test('rejects live payment keys', () => assert.throws(() => validateE2EEnvironment({ ...fixture, STRIPE_SECRET_KEY: 'sk_live_synthetic' }), /test-mode/));
