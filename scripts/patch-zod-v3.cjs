// Backport bounded collection early rejection to the maintained application API.
// https://github.com/colinhacks/zod/issues/6653
// https://github.com/colinhacks/zod/pull/6652
// Remove after the application and its SDK consumers migrate to patched Zod 4.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hashes = {
  cjs: '06487cc05ed45c5dd29789bf0aa75734d1ce06592a7f2665ba4ca90a68e8a3e1',
  js: '9763a2938f0e7f983363ef4bf6530e7583e3f2d54f8a4a6684efad58febc6e8e',
};
const hash = (source) => createHash('sha256').update(source).digest('hex');

function edits(format) {
  const invalid = format === 'cjs' ? 'parseUtil_js_1.INVALID' : 'INVALID';
  return [
    ['exactLength', `                if (tooBig) return ${invalid};\n`],
    ['maxLength', `                return ${invalid};\n`],
    ['maxSize', `                return ${invalid};\n`],
  ].map(([field, addition]) => {
    const before = `                    message: def.${field}.message,\n                });\n                status.dirty();`;
    const after = before.replace(
      '                status.dirty();',
      addition + '                status.dirty();'
    );
    return { before, after };
  });
}

function patchZodSource(source, format) {
  const changes = edits(format);
  let original = source;
  for (const { before, after } of changes)
    original = original.replace(after, before);
  if (!hashes[format] || hash(original) !== hashes[format]) {
    throw new Error(
      'Unrecognized Zod v3 source; review the collection-bound patch.'
    );
  }
  let patched = original;
  for (const { before, after } of changes) {
    if (patched.split(before).length !== 2)
      throw new Error('Ambiguous Zod patch target.');
    patched = patched.replace(before, after);
  }
  return patched;
}

function applyZodPatches(root) {
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')
  );
  for (const [location, metadata] of Object.entries(lock.packages)) {
    if (!location.endsWith('/zod') || !metadata.version?.startsWith('3.'))
      continue;
    const directory = path.resolve(root, location);
    if (!directory.startsWith(root + path.sep))
      throw new Error('Invalid dependency path');
    if (!fs.existsSync(directory)) continue;
    if (
      metadata.version !== '3.25.76' ||
      JSON.parse(fs.readFileSync(path.join(directory, 'package.json')))
        .version !== '3.25.76'
    ) {
      throw new Error('Review the Zod mitigation for the installed version.');
    }
    for (const format of ['cjs', 'js']) {
      const file = path.join(directory, 'v3', `types.${format}`);
      const source = fs.readFileSync(file, 'utf8');
      const patched = patchZodSource(source, format);
      if (source !== patched) fs.writeFileSync(file, patched);
    }
  }
}

module.exports = { applyZodPatches, patchZodSource };
