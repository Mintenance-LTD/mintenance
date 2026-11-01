const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ignore = require('ignore');

test('EAS archive retains the full security preparation chain and excludes secrets', () => {
  const root = path.resolve(__dirname, '..');
  const rules = ignore().add(
    fs.readFileSync(path.join(root, '.easignore'), 'utf8')
  );
  for (const file of [
    'scripts/rebuild-native.mjs',
    'scripts/apply-security-patches.cjs',
    'scripts/patch-zod-v3.cjs',
  ]) {
    assert.equal(rules.ignores(file), false, file);
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
  for (const file of [
    '.env.local',
    'apps/mobile/.env.production',
    'credentials/keystore.jks',
    'apps/mobile/google-services.json',
    'scripts/unreviewed-tool.cjs',
  ]) {
    assert.equal(rules.ignores(file), true, file);
  }
});
