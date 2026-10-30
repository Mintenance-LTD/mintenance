const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const dependency = process.env.SECURITY_TEST_MODULE_ROOT
  ? createRequire(
      path.resolve(process.env.SECURITY_TEST_MODULE_ROOT, 'package.json')
    )
  : require;
const uri = dependency('fast-uri');
const qs = dependency('qs');
test('encoded schemes cannot become active javascript URLs', () => {
  for (const value of ['%6Aavascript:alert(1)', '%u006Aavascript:alert(1)']) {
    assert.notEqual(uri.parse(value).scheme, 'javascript');
    assert.ok(uri.parse(value).error);
    assert.ok(!uri.normalize(value).startsWith('javascript:'));
    assert.throws(
      () => uri.resolve('https://example.com/', value),
      /scheme is malformed/
    );
  }
  assert.equal(uri.normalize('https://example.com/a'), 'https://example.com/a');
});
test('comma serialization survives hostile own toString values', () => {
  for (const encodeValuesOnly of [true, false])
    assert.doesNotThrow(() =>
      qs.stringify(
        { a: [{ toString: 'x' }] },
        { arrayFormat: 'comma', encodeValuesOnly }
      )
    );
  assert.equal(
    qs.stringify({ a: ['x', 'y'] }, { arrayFormat: 'comma' }),
    'a=x%2Cy'
  );
});
