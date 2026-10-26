const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');

test('mobile i18next safely renders an unclosed nesting prefix in an interpolated value', () => {
  const mobileRequire = createRequire(path.resolve('apps/mobile/package.json'));
  const entry = mobileRequire.resolve('i18next');
  // Isolate the synchronous regex with a process deadline: a regression must not hang CI.
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
    const i18next = require(${JSON.stringify(entry)});
    (async () => {
      await i18next.init({ lng:'en', interpolation:{escapeValue:false},
        resources:{ en:{translation:{greet:'Hello {{name}}, welcome!'}} } });
      const name = '$t(' + 'a'.repeat(40);
      if (i18next.t('greet', {name}) !== 'Hello ' + name + ', welcome!') process.exit(1);
    })().catch(() => process.exit(1));
  `,
    ],
    { timeout: 5000, encoding: 'utf8' }
  );
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    'interpolation must finish and preserve literal input'
  );
});
