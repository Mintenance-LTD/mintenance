const fs = require('node:fs');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { validateE2EEnvironment } = require('./check-e2e-environment.cjs');
async function main() {
  const status = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
  const url = new URL(status.API_URL);
  if (url.hostname !== '127.0.0.1' || url.port !== '56321') throw new Error('Only the disposable local E2E stack is allowed.');
  const env = {
    E2E_SUPABASE_URL: status.API_URL,
    E2E_SUPABASE_ANON_KEY: status.ANON_KEY,
    E2E_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    JWT_SECRET: crypto.randomBytes(48).toString('hex') + 'Aa1!',
    ENCRYPTION_MASTER_KEY: crypto.randomBytes(32).toString('hex'),
    CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
    E2E_AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    STRIPE_SECRET_KEY: 'sk_test_isolated_browser_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_isolated_browser_fixture',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_isolated_browser_fixture',
    NEXT_PUBLIC_APP_URL: 'https://localhost:3000',
    PLAYWRIGHT_TEST_BASE_URL: 'https://localhost:3000',
    E2E_TESTING: 'true',
    REDIS_REQUIRED: 'false',
  };
  validateE2EEnvironment(env);
  const db = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const userIds = {};
  for (const role of ['homeowner', 'contractor', 'admin']) {
    const email = 'test-' + role + '@example.com';
    const password = 'Test' + role[0].toUpperCase() + role.slice(1) + '123!';
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { role: role === 'admin' ? 'homeowner' : role, first_name: 'Test', last_name: role } });
    if (error) throw new Error('Synthetic account creation failed: ' + error.message);
    userIds[role] = data.user.id;
    const { error: profileError } = await db.from('profiles').update({ role, verified: true, phone_verified: true,
      onboarding_completed: true, first_name: 'Test', last_name: role }).eq('id', data.user.id);
    if (profileError) throw new Error('Synthetic profile setup failed: ' + profileError.message);
  }
  // Dedicated job for bid-form tests, independent of test order and other shards.
  env.E2E_BID_JOB_ID = crypto.randomUUID();
  const { error: jobError } = await db.from('jobs').insert({
    id: env.E2E_BID_JOB_ID, homeowner_id: userIds.homeowner,
    title: 'Synthetic bid form fixture', description: 'Fix a synthetic leaking tap for isolated browser tests.',
    status: 'posted', category: 'plumbing', urgency: 'medium',
    location: 'London', budget_min: 100, budget_max: 200,
  });
  if (jobError) throw new Error('Synthetic job setup failed: ' + jobError.message);
  const output = process.env.GITHUB_ENV || 'output/e2e-stack/runtime.json';
  if (process.env.GITHUB_ENV) {
    for (const [name, value] of Object.entries(env)) {
      console.log('::add-mask::' + value);
      fs.appendFileSync(output, name + '=' + value + '\n');
    }
  } else fs.writeFileSync(output, JSON.stringify(env), { mode: 0o600 });
  console.log('Synthetic E2E accounts and isolated runtime configuration ready.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
