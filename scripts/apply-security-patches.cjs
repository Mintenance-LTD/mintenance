// Security preparation now verifies upstream-fixed Zod; no temporary backport.
const fs = require('node:fs');
const path = require('node:path');
function applyPatches(root = path.resolve(__dirname, '..')) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const entries = Object.entries(lock.packages).filter(([location]) => location.endsWith('/zod'));
  if (!entries.length) throw new Error('Zod is missing from the lockfile');
  for (const [location, metadata] of entries) {
    if (metadata.version !== '4.6.7') throw new Error('Unreviewed Zod version: ' + metadata.version);
    const installed = JSON.parse(fs.readFileSync(path.join(root, location, 'package.json'), 'utf8'));
    if (installed.version !== metadata.version) throw new Error('Zod installation does not match the lockfile');
  }
}
module.exports = { applyPatches };
if (require.main === module) applyPatches();
