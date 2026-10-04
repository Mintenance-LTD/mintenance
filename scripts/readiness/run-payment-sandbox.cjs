// Explicit opt-in: real Stripe test objects, isolated local database only.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '../..');
const [envFile, statusFile] = process.argv.slice(2);
if (!envFile || !statusFile)
  throw new Error(
    'Provide sandbox env file and local Supabase status file paths.'
  );
const keys = dotenv.parse(fs.readFileSync(path.resolve(envFile)));
const status = JSON.parse(
  fs.readFileSync(path.resolve(statusFile), 'utf8').replace(/^\uFEFF/, '')
);
if (
  !keys.STRIPE_SECRET_KEY?.startsWith('sk_test_') ||
  !keys.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')
)
  throw new Error('Only a Stripe test key pair is permitted.');
if (
  status.API_URL !== 'http://127.0.0.1:57321' ||
  !status.SERVICE_ROLE_KEY ||
  !status.ANON_KEY
)
  throw new Error('Only the isolated readiness database is permitted.');
const env = {};
for (const name of [
  'PATH',
  'SystemRoot',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
])
  if (process.env[name]) env[name] = process.env[name];
Object.assign(env, {
  NODE_ENV: 'test',
  PAYMENT_SANDBOX_TESTS: '1',
  INTEGRATION_TESTS: '1',
  STRIPE_SECRET_KEY: keys.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: keys.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: `whsec_${randomBytes(32).toString('hex')}`,
  JWT_SECRET: `Sandbox1!${randomBytes(64).toString('base64')}`,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SUPABASE_TEST_URL: status.API_URL,
  SUPABASE_TEST_ANON_KEY: status.ANON_KEY,
  SUPABASE_TEST_SERVICE_KEY: status.SERVICE_ROLE_KEY,
});
const result = spawnSync(
  process.execPath,
  [
    path.join(root, 'apps/web/scripts/run-integration-tests.js'),
    '__tests__/integration-real/payment-sandbox.integration.test.ts',
    ...process.argv.slice(4),
  ],
  { cwd: root, env, stdio: 'inherit' }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
