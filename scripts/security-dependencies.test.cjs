const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { applyPatches, patchSource } = require('./apply-security-patches.cjs');

applyPatches();
const forge = require('node-forge');
const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 65537 });
const message = 'Synthetic local security regression fixture';
const makeDigest = () => forge.md.sha256.create().update(message);

test('valid RSA SHA-256 signatures still verify', () => {
  const signature = keys.privateKey.sign(makeDigest());
  assert.equal(
    keys.publicKey.verify(makeDigest().digest().getBytes(), signature),
    true
  );
});

for (const includeNull of [false, true]) {
  test(`rejects unconsumed nested signature elements (NULL present: ${includeNull})`, () => {
    const a = forge.asn1;
    const algorithm = [
      a.create(
        a.Class.UNIVERSAL,
        a.Type.OID,
        false,
        a.oidToDer(forge.oids.sha256).getBytes()
      ),
    ];
    if (includeNull)
      algorithm.push(a.create(a.Class.UNIVERSAL, a.Type.NULL, false, ''));
    algorithm.push(
      a.create(
        a.Class.UNIVERSAL,
        a.Type.OCTETSTRING,
        false,
        'unexpected element'
      )
    );
    const digestInfo = a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
      a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, algorithm),
      a.create(
        a.Class.UNIVERSAL,
        a.Type.OCTETSTRING,
        false,
        makeDigest().digest().getBytes()
      ),
    ]);
    // Sign a deliberately malformed DigestInfo with this test's own key.
    const signature = keys.privateKey.sign(
      a.toDer(digestInfo).getBytes(),
      'NONE'
    );
    assert.throws(
      () => keys.publicKey.verify(makeDigest().digest().getBytes(), signature),
      /DigestInfo/
    );
  });
}

test('dependency patch is idempotent and refuses unknown source', () => {
  const source = fs.readFileSync(require.resolve('node-forge/lib/rsa'), 'utf8');
  assert.equal(patchSource(source), source);
  assert.throws(
    () => patchSource(source + '\n// unexpected edit'),
    /Unrecognized/
  );
});

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
