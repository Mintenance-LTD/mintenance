const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const statusFile = path.join(root, 'output/readiness-stack/status.json');
const status = JSON.parse(
  fs.readFileSync(statusFile, 'utf8').replace(/^\uFEFF/, '')
);
// Never inherit a hosted database URL or key from the app's development env.
if (status.API_URL !== 'http://127.0.0.1:57321') {
  throw new Error(
    'Only the isolated readiness API at http://127.0.0.1:57321 is allowed.'
  );
}
if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY)
  throw new Error('Local stack credentials are missing.');
const result = spawnSync(
  process.execPath,
  [
    path.join(root, 'apps/web/scripts/run-integration-tests.js'),
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_TEST_URL: status.API_URL,
      SUPABASE_TEST_ANON_KEY: status.ANON_KEY,
      SUPABASE_TEST_SERVICE_KEY: status.SERVICE_ROLE_KEY,
    },
  }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
