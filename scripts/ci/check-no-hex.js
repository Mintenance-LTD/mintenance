#!/usr/bin/env node
/*
 Warn on hard-coded hex color literals in RN styles.
 Allows:
  - Files under src/theme/** (where tokens are defined)
  - Coverage, node_modules, snapshots
  - Does not flag rgba() usage (e.g., rgba(0,0,0,0.5))
*/
const globby = require('globby');
const fs = require('fs');

(async () => {
  const patterns = ['src/**/*.{ts,tsx,js,jsx}'];
  const ignore = [
    'src/theme/**',
    '**/__tests__/**',
    '**/__snapshots__/**',
    '**/coverage/**',
    '**/node_modules/**',
  ];
  const files = await globby(patterns, { ignore });
  const hexRe = /#[0-9A-Fa-f]{3,6}\b/g;
  const offenders = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/rgba\s*\(/i.test(line)) return; // allow rgba overlays
      const matches = line.match(hexRe);
      if (matches) {
        if (/backgroundColor|color|borderColor|shadowColor/i.test(line)) {
          offenders.push({ file, line: i + 1, lineText: line.trim(), matches });
        }
      }
    });
  }

  if (offenders.length) {
    console.error('\nHard-coded hex colors detected in styles (use theme tokens):');
    offenders.forEach(o => {
      console.error(`- ${o.file}:${o.line} -> ${o.lineText}`);
    });
    process.exit(1);
  } else {
    console.log('No hard-coded hex color styles found.');
  }
})();

