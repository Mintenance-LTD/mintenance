#!/usr/bin/env node

/**
 * Suggest hex-color → design-token migrations across the codebase.
 *
 * Audit P3 (2026-04-23): the pre-existing backlog of ~625-1,300
 * inline hex literals in apps/web (the count varies by glob — 117
 * files in shared components alone) is a genuinely deferred item.
 * `scripts/ci/check-no-hex.js` already prevents NEW hex from being
 * added; this script accelerates the BACKLOG cleanup by scanning
 * every staged + tracked file and suggesting the canonical token
 * replacement for each hit.
 *
 * Why a suggestion script and not a codemod:
 *   - Some hex literals are intentional (logos, brand assets, charts
 *     where colors are encoded in data). An auto-rewrite would corrupt
 *     them.
 *   - Some hex are off-by-one approximations of tokens (e.g. `#0f172b`
 *     vs the canonical `#0F172A`). The script flags both as candidates
 *     so a human can choose.
 *   - Token paths differ between web (`theme.colors.primary`) and
 *     mobile (`theme.colors.primary` via the mobile adapter); the
 *     migration target depends on context.
 *
 * Usage:
 *   node scripts/suggest-hex-token-migrations.js                # all source
 *   node scripts/suggest-hex-token-migrations.js --top 20       # 20 worst files
 *   node scripts/suggest-hex-token-migrations.js --file <path>  # single file
 *   node scripts/suggest-hex-token-migrations.js --json         # machine-readable
 */

const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------
// Token map. Mirrors `packages/design-tokens/src/colors.ts`. Keys are
// normalized hex (lower-case, with #). Values describe the canonical
// replacement for each context.
//
// Keep this list in lock-step with colors.ts. When a new token is
// added there, add the reverse mapping here.
// -----------------------------------------------------------------
const TOKEN_MAP = {
  '#0f172a': {
    name: 'primary',
    alt: 'gray800 / textPrimary / text / backgroundDark',
  },
  '#1e293b': { name: 'primaryLight', alt: 'gray700' },
  '#020617': { name: 'primaryDark', alt: 'gray900' },
  '#10b981': { name: 'secondary', alt: 'success / priorityLow' },
  '#34d399': { name: 'secondaryLight', alt: 'successLight' },
  '#059669': { name: 'secondaryDark', alt: 'successDark' },
  '#f59e0b': { name: 'accent', alt: 'warning / priorityMedium' },
  '#fcd34d': { name: 'accentLight' },
  '#d97706': { name: 'accentDark', alt: 'warningDark' },
  '#f8fafc': {
    name: 'gray25',
    alt: 'backgroundSecondary / backgroundSubtle / surfaceSecondary',
  },
  '#f1f5f9': {
    name: 'gray50',
    alt: 'backgroundTertiary / borderLight / surfaceTertiary',
  },
  '#e2e8f0': { name: 'gray100', alt: 'border' },
  '#cbd5e1': { name: 'gray200', alt: 'borderDark' },
  '#94a3b8': { name: 'gray300', alt: 'placeholder / textQuaternary' },
  '#64748b': { name: 'gray400', alt: 'textTertiary' },
  '#475569': { name: 'gray500', alt: 'textSecondary' },
  '#334155': { name: 'gray600' },
  '#ef4444': { name: 'error', alt: 'priorityHigh' },
  '#f87171': { name: 'errorLight' },
  '#dc2626': { name: 'errorDark', alt: 'priorityUrgent' },
  '#fbbf24': { name: 'warningLight' },
  '#3b82f6': { name: 'info', alt: 'statusPosted' },
  '#60a5fa': { name: 'infoLight' },
  '#2563eb': { name: 'infoDark' },
  '#ffffff': { name: 'white', alt: 'background / surface / textInverse' },
  '#000000': { name: 'black' },
  '#fff': { name: 'white', alt: 'use #ffffff or theme.colors.white' },
  '#000': { name: 'black', alt: 'use #000000 or theme.colors.black' },
};

// -----------------------------------------------------------------
// File traversal
// -----------------------------------------------------------------
const SOURCE_ROOTS = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/hooks',
  'apps/mobile/src',
];

const SKIP_DIRS = new Set([
  'node_modules',
  '__tests__',
  '__snapshots__',
  '__mocks__',
  'theme',
  'design-tokens',
]);

const FILE_REGEX = /\.(ts|tsx|js|jsx)$/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (FILE_REGEX.test(entry.name)) {
      // Skip test files
      if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
      out.push(full);
    }
  }
  return out;
}

// -----------------------------------------------------------------
// Hex detection. Same context regex as scripts/ci/check-no-hex.js so
// the two stay in sync.
// -----------------------------------------------------------------
const HEX_REGEX = /#[0-9A-Fa-f]{3,6}\b/g;
const STYLE_CONTEXT_REGEX =
  /backgroundColor|color|borderColor|shadowColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|fill=|stroke=/i;

function suggest(filePath) {
  let contents;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  const lines = contents.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!STYLE_CONTEXT_REGEX.test(line)) continue;
    if (/rgba\s*\(/i.test(line)) continue;
    const matches = line.match(HEX_REGEX);
    if (!matches) continue;
    for (const match of matches) {
      const normalized = match.toLowerCase();
      const token = TOKEN_MAP[normalized];
      out.push({
        file: filePath,
        line: i + 1,
        hex: match,
        suggestion: token
          ? `theme.colors.${token.name}` +
            (token.alt ? ` (or: ${token.alt})` : '')
          : '(no exact token match — design review needed)',
        text: line.trim(),
      });
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const topIdx = args.indexOf('--top');
  const top = topIdx !== -1 ? parseInt(args[topIdx + 1], 10) : 0;
  const fileIdx = args.indexOf('--file');
  const singleFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  const root = process.cwd();
  let files;
  if (singleFile) {
    files = [path.resolve(root, singleFile)];
  } else {
    files = SOURCE_ROOTS.flatMap((r) => walk(path.resolve(root, r)));
  }

  const all = [];
  for (const f of files) {
    all.push(...suggest(f));
  }

  if (json) {
    process.stdout.write(JSON.stringify(all, null, 2));
    return;
  }

  if (all.length === 0) {
    console.log('No hex literals in style contexts found.');
    return;
  }

  // Group by file, sort by count desc
  const byFile = new Map();
  for (const o of all) {
    if (!byFile.has(o.file)) byFile.set(o.file, []);
    byFile.get(o.file).push(o);
  }
  const sorted = Array.from(byFile.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  const display = top > 0 ? sorted.slice(0, top) : sorted;

  console.log(
    `\nFound ${all.length} hex literal(s) in ${sorted.length} file(s).\n`
  );
  if (top > 0 && sorted.length > top) {
    console.log(`(Showing top ${top} files by count.)\n`);
  }

  for (const [file, hits] of display) {
    const rel = path.relative(root, file);
    console.log(`\n=== ${rel}  (${hits.length} hits) ===`);
    for (const h of hits) {
      console.log(`  ${h.line}:  ${h.hex.padEnd(8)}  →  ${h.suggestion}`);
    }
  }

  console.log('\nMigration workflow:');
  console.log('  1. Pick one file from the list above.');
  console.log('  2. Replace each hex literal with the suggested token.');
  console.log('  3. For "no exact token match" hits, ask design which');
  console.log('     existing token is closest (or whether a new token');
  console.log('     belongs in packages/design-tokens/src/colors.ts).');
  console.log('  4. Verify with `npx tsc --noEmit` + visual regression.');
  console.log('  5. Commit. Repeat per file until the backlog is empty.');
}

if (require.main === module) {
  main();
}

module.exports = { suggest, TOKEN_MAP };
