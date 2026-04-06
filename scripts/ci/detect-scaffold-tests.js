#!/usr/bin/env node
/*
 Detect (and optionally delete) scaffold test files that provide zero value.
 A "scaffold test" has one or more of these red flags and NO real assertions
 beyond the scaffold itself:
   - "exports the module" / "should be properly exported" pattern (just checks export)
   - Empty test bodies with only comments like "// Test successful cases"
   - File is under 15 lines AND only checks import/export

 Scaffolds give false confidence and inflate pass rates. This script lists them
 so they can be honestly deleted or replaced with real tests.

 Usage:
   node scripts/ci/detect-scaffold-tests.js           # list offenders
   node scripts/ci/detect-scaffold-tests.js --delete  # delete them
*/
const { globby } = require('globby');
const fs = require('fs');

const TEST_GLOBS = [
  'apps/web/**/*.{test,spec}.{ts,tsx,js,jsx}',
  'apps/mobile/**/*.{test,spec}.{ts,tsx,js,jsx}',
  'packages/**/*.{test,spec}.{ts,tsx,js,jsx}',
];

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/coverage/**',
  '**/e2e/**',
  '**/_archived/**',
  '**/_archive/**',
  '**/.claude/worktrees/**',
];

function classify(text) {
  const assertCount = (text.match(/\bexpect\s*\(/g) || []).length;
  const itBlocks = (text.match(/\b(it|test)\s*\(/g) || []).length;

  // Signature 1: tests body contains only a comment (no assertion)
  const emptyBodyHits = (
    text.match(
      /\b(it|test)\s*\([^)]*\)[^{]*\{\s*(?:\/\/[^\n]*\n?\s*)+\}/g,
    ) || []
  ).length;

  // Signature 2: "exports the module" pattern
  const exportCheck =
    /it\s*\(\s*['"`](?:exports the module|should be properly exported|is exported)/i.test(
      text,
    );

  // Signature 3: whole file is tiny (under 600 chars) and checks export
  const isTinyExportOnly =
    text.length < 600 &&
    /toBeDefined\(\)/.test(text) &&
    /require\(|import /.test(text) &&
    assertCount <= 1;

  // Overall verdict: scaffold if assertions equal or less than it-blocks AND
  // we matched at least one scaffold signature.
  const hasScaffoldSignal =
    exportCheck || isTinyExportOnly || (emptyBodyHits > 0 && emptyBodyHits >= itBlocks / 2);

  // Guard: don't flag files that have many real assertions
  if (assertCount >= itBlocks && assertCount >= 3 && !isTinyExportOnly) {
    return { scaffold: false };
  }

  return {
    scaffold: hasScaffoldSignal,
    reasons: {
      exportCheck,
      isTinyExportOnly,
      emptyBodyHits,
      assertCount,
      itBlocks,
    },
  };
}

(async () => {
  const shouldDelete = process.argv.includes('--delete');
  const files = await globby(TEST_GLOBS, { ignore: IGNORE });
  const offenders = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const result = classify(text);
    if (result.scaffold) {
      offenders.push({ file, reasons: result.reasons });
    }
  }

  if (offenders.length === 0) {
    console.log('✓ No scaffold tests detected.');
    process.exit(0);
  }

  console.log(`\nFound ${offenders.length} scaffold test file(s):\n`);
  for (const o of offenders) {
    const tags = [];
    if (o.reasons.exportCheck) tags.push('export-only');
    if (o.reasons.isTinyExportOnly) tags.push('tiny-export');
    if (o.reasons.emptyBodyHits) tags.push(`${o.reasons.emptyBodyHits}-empty-bodies`);
    console.log(`  ${o.file}  [${tags.join(', ')}]`);
  }

  if (shouldDelete) {
    console.log('\nDeleting scaffold tests...');
    for (const o of offenders) {
      fs.unlinkSync(o.file);
    }
    console.log(`✓ Deleted ${offenders.length} file(s).`);
  } else {
    console.log(`\nRun with --delete to remove them.`);
  }
})();
