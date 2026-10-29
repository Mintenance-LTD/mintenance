// node-forge now uses the fixed upstream release; only the Zod 3 backport remains.
const path = require('node:path');

function applyPatches(root = path.resolve(__dirname, '..')) {
  require('./patch-zod-v3.cjs').applyZodPatches(root);
}

module.exports = { applyPatches };
if (require.main === module) applyPatches();
