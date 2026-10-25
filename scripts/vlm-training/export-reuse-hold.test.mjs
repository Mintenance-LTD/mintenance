import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

test('bootstrap export refuses dry-run and writes before connecting, even with credentials and flags', () => {
  for (const args of [[], ['--dry-run']]) {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./export_bootstrap_dataset.mjs', import.meta.url)), ...args], {
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, TRAINING_REUSE_ENABLED: 'true', SUPABASE_URL: 'not-a-url', SUPABASE_SERVICE_ROLE_KEY: 'unused-synthetic-key' },
    });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Training export is unavailable during beta/);
    assert.doesNotMatch(result.stderr, /unused-synthetic-key|not-a-url/);
    assert.equal(result.stdout, '');
  }
});
