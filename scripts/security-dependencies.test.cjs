const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { applyPatches } = require('./apply-security-patches.cjs');

applyPatches();
for (const consumer of ['@google-cloud/storage', 'gaxios', 'teeny-request']) {
  test(`${consumer} resolves patched UUID with its existing CommonJS v4 API`, () => {
    const localRequire = createRequire(require.resolve(consumer));
    assert.equal(localRequire('uuid/package.json').version, '11.1.1');
    const uuid = localRequire('uuid');
    assert.equal(uuid.validate(uuid.v4()), true);
    assert.equal(uuid.version(uuid.v4()), 4);
    assert.doesNotThrow(() => require(consumer));
  });
}

test('Metro patch release reads image assets without the vulnerable image-size package', () => {
  assert.equal(require('metro/package.json').version, '0.83.8');
  const { getAssetSize } = require('metro/private/Assets');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0l8AAAAASUVORK5CYII=',
    'base64'
  );
  assert.deepEqual(getAssetSize('png', png, 'security-fixture.png'), {
    width: 1,
    height: 1,
  });
  const lock = require('../package-lock.json');
  assert.equal(
    Object.keys(lock.packages).some((p) => p.endsWith('/image-size')),
    false
  );
});
