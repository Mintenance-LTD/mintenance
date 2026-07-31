#!/usr/bin/env node
/*
 Enforce: any skipped test (.skip, xit, xdescribe, xtest, it.todo) must have
 a tracking comment on the line above in the format:
   // SKIP: Tracked in #NNN — reason
 or
   // TODO: Tracked in #NNN — reason

 Prevents silent test-suite erosion. Fails CI if a violation is found.

 Two enforcement passes:

 1. Unit/integration tests (vitest/jest) — the broad patterns below. Any
    .skip / xit / xdescribe / it.todo needs a tracking comment.

 2. Playwright e2e specs (apps/web/e2e) — these were previously exempt, which
    let 45 skips accumulate silently. e2e is enforced with a NARROWER rule:
    only PERMANENT declaration skips are flagged, i.e. a skip that carries a
    string test/suite title — `test.skip('name', ...)`, `it.skip('name', ...)`,
    `test.describe.skip('name', ...)`. Playwright's runtime conditional bail —
    `test.skip()` / `test.skip(condition, 'reason')` inside a test body — is
    idiomatic (it activates the test the moment its precondition is met) and is
    intentionally NOT flagged. Only a title-bearing skip is a permanently
    disabled test and must reference a tracking issue.

 Usage:
   node scripts/ci/check-no-skip.js           # check all test files
   node scripts/ci/check-no-skip.js --diff    # check only files changed vs origin/main
*/
const { globby } = require('globby');
const fs = require('fs');
const { execFileSync } = require('child_process');

// Broad patterns — any skipped test in a unit/integration suite.
const SKIP_PATTERNS = [
  /\b(?:it|test|describe)\.skip\s*\(/,
  /\b(?:xit|xdescribe|xtest)\s*\(/,
  /\b(?:it|test)\.todo\s*\(/,
];

// e2e — only a skip that carries a string title (a permanent declaration
// skip). Matches test.skip('...'), it.skip('...'), test.describe.skip('...'),
// describe.skip('...'). Does NOT match runtime `test.skip()` / `test.skip(cond,
// 'reason')` bails, which have no string as the FIRST argument.
const E2E_DECLARATION_SKIP =
  /\b(?:it|test|describe)(?:\.\w+)?\.skip\s*\(\s*['"`]/;
const E2E_XPATTERNS = [
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

// Playwright e2e specs — enforced separately with the declaration-only rule.
const E2E_GLOBS = ['apps/web/e2e/**/*.{test,spec}.{ts,tsx,js,jsx}'];

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

const E2E_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.claude/worktrees/**',
];

function getChangedFiles() {
  try {
    const base = process.env.GITHUB_BASE_REF || 'main';
    const output = execFileSync(
      'git',
      ['diff', '--name-only', `origin/${base}...HEAD`],
      { encoding: 'utf8' }
    );
    return output.split('\n').filter(Boolean);
  } catch {
    console.warn('Could not determine changed files, checking all test files.');
    return null;
  }
}

function filterToChanged(files, changed) {
  if (!changed) return files;
  const normalized = new Set(changed.map((f) => f.replace(/\\/g, '/')));
  return files.filter((f) => normalized.has(f.replace(/\\/g, '/')));
}

/**
 * Scan a list of files for skip violations.
 * @param patterns array of RegExp that identify a skip requiring a tracking comment
 */
function scan(files, patterns) {
  const offenders = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      const hit = patterns.some((re) => re.test(line));
      if (!hit) return;
      const prev = (lines[i - 1] || '').trim();
      if (TRACKING_RE.test(prev)) return;
      offenders.push({ file, line: i + 1, text: line.trim() });
    });
  }
  return offenders;
}

(async () => {
  const diffOnly = process.argv.includes('--diff');
  const changed = diffOnly ? getChangedFiles() : null;

  let unitFiles = await globby(TEST_GLOBS, { ignore: IGNORE });
  let e2eFiles = await globby(E2E_GLOBS, { ignore: E2E_IGNORE });

  if (diffOnly) {
    unitFiles = filterToChanged(unitFiles, changed);
    e2eFiles = filterToChanged(e2eFiles, changed);
  }

  const offenders = [
    ...scan(unitFiles, SKIP_PATTERNS),
    ...scan(e2eFiles, [E2E_DECLARATION_SKIP, ...E2E_XPATTERNS]),
  ];

  if (offenders.length === 0) {
    console.log('✓ No untracked skipped tests found.');
    process.exit(0);
  }

  console.error('\n✗ Untracked skipped tests detected.\n');
  console.error(
    'Every .skip / xit / xdescribe / it.todo must have a tracking comment on the line directly above:'
  );
  console.error('  // SKIP: Tracked in #123 — short reason\n');
  console.error(
    'For Playwright e2e: only permanent declaration skips — a skip with a string\n' +
      "title like test.skip('name', ...) — are flagged. Runtime bails such as\n" +
      'test.skip() / test.skip(condition, "reason") inside a test body are allowed.\n'
  );
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}`);
    console.error(`    ${o.text}`);
  }
  console.error(`\nTotal violations: ${offenders.length}`);
  console.error('See docs/CI_QUALITY_GATES.md#adding-new-skipped-tests');
  process.exit(1);
})();
