#!/usr/bin/env node
/*
 Enforce: any skipped test (.skip, xit, xdescribe, xtest, it.todo) must have
 a tracking comment on the line above in the format:
   // SKIP: Tracked in #NNN — reason
 or
   // TODO: Tracked in #NNN — reason

 Prevents silent test-suite erosion. Fails CI if a violation is found.

 Usage:
   node scripts/ci/check-no-skip.js           # check all test files
   node scripts/ci/check-no-skip.js --diff    # check only files changed vs origin/main
*/
const { globby } = require('globby');
const fs = require('fs');
const { execFileSync } = require('child_process');

const SKIP_PATTERNS = [
  /\b(?:it|test|describe)\.skip\s*\(/,
  /\b(?:xit|xdescribe|xtest)\s*\(/,
  /\b(?:it|test)\.todo\s*\(/,
];

const TRACKING_RE = /\/\/\s*(?:SKIP|TODO):\s*Tracked\s+in\s+#\d+/i;

const TEST_GLOBS = [
  'apps/web/**/*.{test,spec}.{ts,tsx,js,jsx}',
  'apps/web/**/__tests__/**/*.{ts,tsx,js,jsx}',
  'apps/mobile/**/*.{test,spec}.{ts,tsx,js,jsx}',
  'apps/mobile/**/__tests__/**/*.{ts,tsx,js,jsx}',
  'packages/**/*.{test,spec}.{ts,tsx,js,jsx}',
];

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/coverage/**',
  '**/e2e/**',
  '**/__tests__/setup/**',
  '**/__tests__/mocks/**',
  '**/__tests__/utils/**',
  '**/__mocks__/**',
  '**/.claude/worktrees/**',
];

function getChangedFiles() {
  try {
    const base = process.env.GITHUB_BASE_REF || 'main';
    const output = execFileSync(
      'git',
      ['diff', '--name-only', `origin/${base}...HEAD`],
      { encoding: 'utf8' },
    );
    return output.split('\n').filter(Boolean);
  } catch {
    console.warn('Could not determine changed files, checking all test files.');
    return null;
  }
}

(async () => {
  const diffOnly = process.argv.includes('--diff');
  let files = await globby(TEST_GLOBS, { ignore: IGNORE });

  if (diffOnly) {
    const changed = getChangedFiles();
    if (changed) {
      const normalized = new Set(changed.map((f) => f.replace(/\\/g, '/')));
      files = files.filter((f) => normalized.has(f.replace(/\\/g, '/')));
    }
  }

  const offenders = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      const hit = SKIP_PATTERNS.some((re) => re.test(line));
      if (!hit) return;
      const prev = (lines[i - 1] || '').trim();
      if (TRACKING_RE.test(prev)) return;
      offenders.push({ file, line: i + 1, text: line.trim() });
    });
  }

  if (offenders.length === 0) {
    console.log('✓ No untracked skipped tests found.');
    process.exit(0);
  }

  console.error('\n✗ Untracked skipped tests detected.\n');
  console.error(
    'Every .skip / xit / xdescribe / it.todo must have a tracking comment on the line directly above:',
  );
  console.error('  // SKIP: Tracked in #123 — short reason\n');
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}`);
    console.error(`    ${o.text}`);
  }
  console.error(`\nTotal violations: ${offenders.length}`);
  console.error('See docs/CI_QUALITY_GATES.md#adding-new-skipped-tests');
  process.exit(1);
})();
