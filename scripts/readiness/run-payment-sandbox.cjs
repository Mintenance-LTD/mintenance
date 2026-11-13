// Explicit opt-in: real Stripe test objects, isolated local database only.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
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
  'HOME',
  'PLAYWRIGHT_BROWSERS_PATH',
])
  if (process.env[name]) env[name] = process.env[name];
Object.assign(env, {
  NODE_ENV: 'test',
  PAYMENT_SANDBOX_TESTS: '1',
  INTEGRATION_TESTS: '1',
  ENCRYPTION_MASTER_KEY: randomBytes(32).toString('hex'),
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
async function run() {
  let server;
  let log;
  if (process.env.PAYMENT_BROWSER_TESTS === '1') {
    if (process.platform !== 'linux')
      throw new Error(
        'Run browser payment acceptance in the isolated Linux CI job.'
      );
    const web = path.join(root, 'apps/web');
    for (const name of [
      '.env',
      '.env.local',
      '.env.development',
      '.env.development.local',
    ]) {
      if (fs.existsSync(path.join(web, name)))
        throw new Error(
          'Refusing browser tests with an ambient application env file.'
        );
    }
    Object.assign(env, {
      PAYMENT_BROWSER_TESTS: '1',
      E2E_TESTING: 'true',
      E2E_AUTH_SECRET: randomBytes(32).toString('hex'),
      CSRF_SECRET: randomBytes(32).toString('hex'),
      NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
      REDIS_REQUIRED: 'false',
      NEXT_TELEMETRY_DISABLED: '1',
    });
    fs.mkdirSync(path.join(root, 'output'), { recursive: true });
    log = fs.openSync(
      path.join(root, 'output/payment-browser-server.log'),
      'w',
      0o600
    );
    server = spawn(
      process.execPath,
      [
        require.resolve('next/dist/bin/next'),
        'dev',
        '--hostname',
        '127.0.0.1',
        '--port',
        '3000',
      ],
      {
        cwd: web,
        env: { ...env, NODE_ENV: 'development' },
        detached: true,
        stdio: ['ignore', log, log],
      }
    );
  }
  try {
    if (server) {
      const deadline = Date.now() + 180000;
      let ready = false;
      while (Date.now() < deadline) {
        if (server.exitCode !== null)
          throw new Error('Payment browser server exited before readiness.');
        try {
          const response = await fetch(
            'http://127.0.0.1:3000/api/test-auth/login',
            { signal: AbortSignal.timeout(5000) }
          );
          if (response.status === 405) {
            ready = true;
            break;
          }
        } catch {
          /* Server is still starting. */
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!ready)
        throw new Error('Payment browser server did not become ready.');
    }
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
  } finally {
    if (server?.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    if (log !== undefined) fs.closeSync(log);
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
