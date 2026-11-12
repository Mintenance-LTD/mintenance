const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { applyPatches } = require('./apply-security-patches.cjs');

const installed = path.dirname(require.resolve('zod/package.json'));
test('all locked Zod installations use the upstream security fix', () => applyPatches());

for (const format of ['cjs', 'js']) {
  test(`${format}: bounded collections reject before invoking element parsers`, async () => {
    const { z } =
      format === 'cjs'
        ? require('zod')
        : await import(pathToFileURL(path.join(installed, 'index.js')).href);
    let visited = 0;
    let refined = 0;
    const element = z.preprocess((value) => {
      visited++;
      return value;
    }, z.string());
    for (const schema of [
      z.array(element).max(2),
      z.array(element).length(2),
    ]) {
      const result = schema
        .refine(() => {
          refined++;
          return true;
        })
        .safeParse(Array(10000).fill(0));
      assert.equal(result.success, false);
      assert.equal(result.error.issues.length, 1);
      assert.equal(result.error.issues[0].code, 'too_big');
    }
    const setResult = z
      .set(element)
      .max(2)
      .safeParse(new Set([1, 2, 3]));
    assert.equal(setResult.success, false);
    assert.equal(setResult.error.issues.length, 1);
    const asyncResult = await z.array(element).max(2).safeParseAsync([1, 2, 3]);
    assert.equal(asyncResult.success, false);
    assert.equal(visited, 0);
    assert.equal(refined, 0);

    const nested = z
      .object({ values: z.array(element).max(1, 'too many') })
      .safeParse({ values: [1, 2] });
    assert.deepEqual(nested.error.issues[0].path, ['values']);
    assert.equal(nested.error.issues[0].message, 'too many');
    assert.equal(visited, 0);

    assert.deepEqual(z.array(element).max(2).parse(['valid']), ['valid']);
    assert.deepEqual(
      [
        ...z
          .set(element)
          .max(2)
          .parse(new Set(['valid'])),
      ],
      ['valid']
    );
    assert.equal(visited, 2);
    assert.equal(
      z.array(z.string()).length(2).safeParse(['short']).success,
      false
    );
    assert.equal(
      z.array(z.string()).max(2).safeParse([0]).error.issues[0].code,
      'invalid_type'
    );
  });
}
