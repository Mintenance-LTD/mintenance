const { test } = require('node:test');
const assert = require('node:assert/strict');
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

test('application and EAS locks require the fixed upstream node-forge release', () => {
  assert.equal(require('node-forge/package.json').version, '1.4.2');
  for (const file of [
    '../package-lock.json',
    '../tools/eas-cli/package-lock.json',
  ]) {
    const entries = Object.entries(require(file).packages).filter(
      ([location]) => location.endsWith('/node-forge')
    );
    assert.ok(entries.length > 0);
    for (const [, metadata] of entries) assert.equal(metadata.version, '1.4.2');
  }
});

test('PEM decoding retains Buffer input compatibility for signing consumers', () => {
  const pem = forge.pki.publicKeyToPem(keys.publicKey);
  assert.deepEqual(forge.pem.decode(Buffer.from(pem)), forge.pem.decode(pem));
  const decoded = forge.pki.publicKeyFromPem(pem);
  assert.equal(
    decoded.verify(
      makeDigest().digest().getBytes(),
      keys.privateKey.sign(makeDigest())
    ),
    true
  );
});
