const { URL } = require('node:url');

function validateE2EEnvironment(env) {
  const required = ['E2E_SUPABASE_URL', 'E2E_SUPABASE_ANON_KEY', 'E2E_SUPABASE_SERVICE_ROLE_KEY'];
  if (required.some((key) => !env[key])) {
    throw new Error('Configure dedicated E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY secrets. Live database credentials must not be used for browser tests.');
  }
  const testHost = new URL(env.E2E_SUPABASE_URL).hostname;
  const liveHost = env.SUPABASE_URL ? new URL(env.SUPABASE_URL).hostname : null;
  if (testHost === liveHost || testHost === 'ukrjudtlvapiajkjbcrd.supabase.co') {
    throw new Error('Refusing E2E tests against the live Supabase project. Configure a separate synthetic test database.');
  }
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    throw new Error('E2E tests require a Stripe test-mode secret key.');
  }
}

module.exports = { validateE2EEnvironment };
if (require.main === module) {
  try {
    validateE2EEnvironment(process.env);
    console.log('E2E environment isolation check passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
