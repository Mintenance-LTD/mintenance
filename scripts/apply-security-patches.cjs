/* Temporary node-forge 1.4.0 mitigation for CVE-2026-85393.
 * Upstream discussion: https://github.com/digitalbazaar/forge/pull/1152
 * Remove after adopting and testing a fixed upstream release.
 * npm audit still reports 1.4.0: this does not relabel or suppress the package.
 */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const originalHash =
  'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50';
const before = '            obj.value.length !== 2) {';
const after = `            obj.value.length !== 2 ||
            obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)) {`;
const hash = (source) => createHash('sha256').update(source).digest('hex');

function patchSource(source) {
  if (hash(source) === originalHash) return source.replace(before, after);
  // Idempotence is accepted only if reversing our exact change restores the
  // verified registry source. Unknown package edits fail instead of being patched.
  if (
    source.includes(after) &&
    hash(source.replace(after, before)) === originalHash
  )
    return source;
  throw new Error(
    'Unrecognized node-forge RSA source; review the security patch before building.'
  );
}

function applyPatches(root = path.resolve(__dirname, '..')) {
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')
  );
  for (const [location, metadata] of Object.entries(lock.packages)) {
    if (!location.endsWith('/node-forge')) continue;
    const directory = path.resolve(root, location);
    if (!directory.startsWith(root + path.sep))
      throw new Error('Invalid dependency path');
    if (!fs.existsSync(directory)) continue; // e.g. a workspace-only web install
    if (
      metadata.version !== '1.4.0' ||
      JSON.parse(fs.readFileSync(path.join(directory, 'package.json')))
        .version !== '1.4.0'
    ) {
      throw new Error(
        'Review the node-forge mitigation for the newly installed version.'
      );
    }
    const file = path.join(directory, 'lib', 'rsa.js');
    const source = fs.readFileSync(file, 'utf8');
    const patched = patchSource(source);
    if (patched !== source) fs.writeFileSync(file, patched);
  }
}

module.exports = { applyPatches, patchSource };
if (require.main === module) applyPatches();
