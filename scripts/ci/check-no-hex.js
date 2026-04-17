#!/usr/bin/env node
/*
 * Warn on hard-coded hex color literals in inline style blocks.
 *
 * Sprint 7 (5.2): rewritten to check ONLY lines the current commit is ADDING,
 * via `git diff --cached`. Previously this script globbed every file under
 * `src/**` and blocked commits on pre-existing offenders. That approach made
 * it impossible to onboard to the rule without first migrating thousands of
 * existing inline styles. The new version:
 *
 *   - Runs against staged .ts / .tsx / .js / .jsx files only.
 *   - Only flags lines that are being ADDED (diff `+` lines).
 *   - Covers both apps/mobile and apps/web (previously only mobile).
 *   - Ignores theme / token files, tests, snapshots, and rgba() overlays.
 *
 * Effect: pre-existing 2,797 inline hex colors in apps/web are not touched
 * (incremental cleanup), but any NEW hex color added to a new or edited file
 * fails pre-commit with a pointer to the tokens path.
 */

const { execFileSync } = require('child_process');

function git(...args) {
  try {
    // execFileSync avoids shell parsing so file paths with spaces are safe;
    // we also never interpolate user-controlled strings into a shell cmd.
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return '';
  }
}

function stagedFiles() {
  const raw = git('diff', '--cached', '--name-only', '--diff-filter=ACM');
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shouldCheck(file) {
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) return false;

  // Only apps/mobile + apps/web source — skip packages, services, scripts
  const isTargetArea =
    file.startsWith('apps/mobile/src/') ||
    file.startsWith('apps/web/app/') ||
    file.startsWith('apps/web/components/') ||
    file.startsWith('apps/web/hooks/');
  if (!isTargetArea) return false;

  // Exclusions
  if (file.includes('/theme/')) return false;
  if (file.includes('/design-tokens/')) return false;
  if (file.includes('/design-system/tokens')) return false;
  if (file.includes('/__tests__/')) return false;
  if (file.includes('/__snapshots__/')) return false;
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return false;
  if (file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) return false;

  return true;
}

function addedLines(file) {
  // Parse unified diff: lines starting with '+' (but not '+++' header) are
  // additions. We surface them with the "new file" line number from the
  // @@ hunk header for actionable error messages.
  const diff = git('diff', '--cached', '--unified=0', '--', file);
  if (!diff) return [];

  const out = [];
  const hunkRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
  let lineNumber = null;

  for (const rawLine of diff.split(/\r?\n/)) {
    const hunk = rawLine.match(hunkRe);
    if (hunk) {
      lineNumber = parseInt(hunk[1], 10);
      continue;
    }
    if (lineNumber === null) continue;
    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      out.push({ lineNumber, text: rawLine.slice(1) });
      lineNumber++;
    } else if (!rawLine.startsWith('-') && !rawLine.startsWith('\\')) {
      // Context line — advance the running new-file line counter.
      lineNumber++;
    }
    // Deletion ('-') and '\ No newline' markers don't advance the new-file line.
  }
  return out;
}

function flagOffenders(file, added) {
  const hexRe = /#[0-9A-Fa-f]{3,6}\b/g;
  const styleContextRe =
    /backgroundColor|color|borderColor|shadowColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor/i;
  const offenders = [];

  for (const { lineNumber, text } of added) {
    if (/rgba\s*\(/i.test(text)) continue; // allow rgba overlays
    const matches = text.match(hexRe);
    if (!matches) continue;
    if (!styleContextRe.test(text)) continue;
    offenders.push({ file, line: lineNumber, text: text.trim(), matches });
  }
  return offenders;
}

(() => {
  const files = stagedFiles().filter(shouldCheck);
  if (files.length === 0) {
    console.log('No hard-coded hex color styles found.');
    return;
  }

  const allOffenders = [];
  for (const file of files) {
    const added = addedLines(file);
    allOffenders.push(...flagOffenders(file, added));
  }

  if (allOffenders.length) {
    console.error(
      '\nNew hard-coded hex colors in staged changes (use theme tokens instead):'
    );
    for (const o of allOffenders) {
      console.error(`  - ${o.file}:${o.line} -> ${o.text}`);
    }
    console.error('\nTokens live at:');
    console.error('  - packages/design-tokens/src/colors.ts (shared)');
    console.error('  - apps/mobile/src/theme/index.ts (mobile theme)');
    console.error(
      '  - apps/web/styles/professional-design-system.css (web CSS vars)'
    );
    process.exit(1);
  }

  console.log('No new hard-coded hex color styles in staged changes.');
})();
