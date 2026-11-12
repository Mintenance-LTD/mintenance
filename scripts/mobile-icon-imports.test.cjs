const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transformSync } = require('@babel/core');
const plugin = require('../apps/mobile/babel-icon-imports.cjs');
test('imports selected families directly and preserves aliases and other exports', () => {
  const { code } = transformSync(
    "import { Ionicons as Icon, MaterialIcons, createIconSet } from '@expo/vector-icons';",
    { configFile: false, babelrc: false, plugins: [plugin] }
  );
  assert.match(code, /import Icon from ["']@expo\/vector-icons\/Ionicons["']/);
  assert.match(
    code,
    /import MaterialIcons from ["']@expo\/vector-icons\/MaterialIcons["']/
  );
  assert.match(
    code,
    /import \{ createIconSet \} from ["']@expo\/vector-icons["']/
  );
});
test('does not rewrite namespace or default imports', () => {
  const { code } = transformSync(
    "import * as Icons from '@expo/vector-icons'; import other from 'other';",
    { configFile: false, babelrc: false, plugins: [plugin] }
  );
  assert.match(code, /import \* as Icons from ["']@expo\/vector-icons["']/);
  assert.match(code, /import other from ["']other["']/);
});
