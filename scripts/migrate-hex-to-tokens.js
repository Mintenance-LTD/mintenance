#!/usr/bin/env node
/**
 * Mint Editorial migration helper — one-shot replacement of inline hex literals
 * with the corresponding `var(--token)` CSS variables.
 *
 * Targets ONLY the lines `scripts/ci/check-no-hex.js` flags (added lines in
 * staged files where a hex literal appears in a style-context keyword line).
 * Replaces every flagged hex on those lines with its mapped CSS variable.
 *
 * Web inline styles use `var(--xxx)` directly (no import needed — the vars are
 * defined in `apps/web/styles/professional-design-system.css`).
 *
 * Mobile (.ts/.tsx under apps/mobile/src/) is skipped — those need
 * `theme.colors.*` token refs and are too few to bother scripting.
 *
 * Usage:  node scripts/migrate-hex-to-tokens.js [--dry-run]
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

// Mint Editorial palette → CSS var mapping. Keys uppercased + dash-stripped.
// For mobile, keep the hex (skip; manual fix).
const MAP = {
  // Surface / extremes
  '#FFFFFF': 'var(--white)',
  '#FFF': 'var(--white)',
  // Mint
  '#3F8C7A': 'var(--mint-500)',
  '#2F6F5F': 'var(--mint-600)',
  '#265A4D': 'var(--mint-700)',
  '#1F4A40': 'var(--mint-800)',
  '#9DC4B6': 'var(--mint-300)',
  '#6BA593': 'var(--mint-400)',
  '#4F9685': 'var(--mint-500)',
  '#DCEAE5': 'var(--mint-100)',
  '#DDEBE0': 'var(--mint-100)',
  '#DCFCE7': 'var(--mint-100)',
  '#2A5C39': 'var(--mint-700)',
  '#166534': 'var(--mint-800)',
  '#1F4F44': 'var(--success-dark)',
  // Warm sage neutrals
  '#F3F7F4': 'var(--navy-50)',
  '#E9F1EB': 'var(--navy-100)',
  '#D8E2DA': 'var(--navy-200)',
  '#E6ECE7': 'var(--navy-200)',
  '#C2D0C6': 'var(--navy-300)',
  '#A6AEA8': 'var(--navy-400)',
  '#768079': 'var(--navy-500)',
  '#4A5751': 'var(--navy-600)',
  '#3A453F': 'var(--navy-700)',
  '#28332D': 'var(--navy-800)',
  '#1A2520': 'var(--navy-900)',
  // Gold / amber
  '#FBF5E9': 'var(--gold-50)',
  '#F5E9CC': 'var(--gold-100)',
  '#F5DECC': 'var(--gold-100)',
  '#FBE9CB': 'var(--warning-light)',
  '#DCBB6E': 'var(--gold-300)',
  '#C49A4D': 'var(--gold-500)',
  '#9A7637': 'var(--gold-600)',
  '#7A5A0F': 'var(--gold-700)',
  '#7A3F0F': 'var(--gold-700)',
  '#5E4821': 'var(--gold-800)',
  // Terracotta / error
  '#F5DDD2': 'var(--error-light)',
  '#F9E9E2': 'var(--error-light)',
  '#D08A75': 'var(--error-light)',
  '#B5482F': 'var(--error)',
  '#9A3A24': 'var(--error-dark)',
  '#8A2E1B': 'var(--error-dark)',
  // Info indigo
  '#E1E6F2': 'var(--info-light)',
  '#DCEEF5': 'var(--info-light)',
  '#3D5390': 'var(--info)',
  '#2D3A78': 'var(--info-dark)',
  '#232E60': 'var(--info-dark)',
  '#1F5D78': 'var(--info-dark)',
};

// Build a single case-insensitive regex matching any mapped hex literal.
// Order longest first so #FFFFFF doesn't get partially matched as #FFF.
const HEX_KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);
const HEX_RE = new RegExp(
  HEX_KEYS.map((h) => h.replace('#', '#')).join('|'),
  'gi'
);

const STYLE_CONTEXT =
  /backgroundColor|color|borderColor|shadowColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor/i;

const dryRun = process.argv.includes('--dry-run');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function stagedFiles() {
  return git('diff', '--cached', '--name-only', '--diff-filter=ACM')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shouldMigrate(file) {
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) return false;
  // Web only — mobile is hand-fixed.
  if (
    !file.startsWith('apps/web/app/') &&
    !file.startsWith('apps/web/components/') &&
    !file.startsWith('apps/web/hooks/')
  )
    return false;
  if (file.includes('/theme/')) return false;
  if (file.includes('/design-tokens/')) return false;
  if (file.includes('/__tests__/')) return false;
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return false;
  if (file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) return false;
  return true;
}

function addedLineNumbers(file) {
  // Re-uses check-no-hex.js logic: parse `git diff --cached -U0` and collect
  // new-file line numbers of added lines.
  const diff = git('diff', '--cached', '--unified=0', '--', file);
  const out = new Set();
  const hunkRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
  let n = null;
  for (const line of diff.split(/\r?\n/)) {
    const hunk = line.match(hunkRe);
    if (hunk) {
      n = parseInt(hunk[1], 10);
      continue;
    }
    if (n === null) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      out.add(n);
      n++;
    } else if (!line.startsWith('-') && !line.startsWith('\\')) {
      n++;
    }
  }
  return out;
}

let totalLinesTouched = 0;
let totalFilesTouched = 0;
const filesChanged = [];

for (const file of stagedFiles()) {
  if (!shouldMigrate(file)) continue;
  if (!fs.existsSync(file)) continue;
  const added = addedLineNumbers(file);
  if (added.size === 0) continue;

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let fileLinesTouched = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    if (!added.has(lineNo)) continue;
    const text = lines[i];
    if (!STYLE_CONTEXT.test(text)) continue;
    if (/rgba\s*\(/i.test(text)) {
      // skip lines that already have rgba — they're tolerated overlays
    }
    // Replace every mapped hex, preserving the surrounding quote/text.
    const replaced = text.replace(HEX_RE, (match) => {
      const key = match.toUpperCase();
      return MAP[key] ?? match;
    });
    if (replaced !== text) {
      lines[i] = replaced;
      fileLinesTouched++;
    }
  }
  if (fileLinesTouched > 0) {
    if (!dryRun) {
      fs.writeFileSync(file, lines.join('\n'));
    }
    totalLinesTouched += fileLinesTouched;
    totalFilesTouched++;
    filesChanged.push(`${file}  (${fileLinesTouched} lines)`);
  }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Files touched: ${totalFilesTouched}`);
console.log(`${dryRun ? '[DRY RUN] ' : ''}Lines touched: ${totalLinesTouched}`);
if (filesChanged.length && filesChanged.length <= 40) {
  console.log('\nChanged:');
  filesChanged.forEach((f) => console.log('  ' + f));
} else if (filesChanged.length) {
  console.log(`\n(${filesChanged.length} files — list omitted)`);
}
