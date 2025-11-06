#!/usr/bin/env node

/**
 * File Size Audit Script
 * Checks for files approaching or exceeding the 400/500 line limits
 */

const fs = require('fs');
const path = require('path');

const LIMITS = {
  WARNING: 400,
  ERROR: 500,
};

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  '__tests__',
  '__mocks__',
  'coverage',
  '.test.',
  '.spec.',
  '.backup',
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern))) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern))) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function main() {
  const webDir = path.join(__dirname, '..');
  const files = getAllFiles(webDir);

  const results = files
    .map((file) => ({
      file: path.relative(webDir, file),
      lines: countLines(file),
    }))
    .filter(({ lines }) => lines > 300)
    .sort((a, b) => b.lines - a.lines);

  console.log('\n📊 File Size Audit Results\n');
  console.log('Files over 300 lines:\n');

  const warnings = results.filter((r) => r.lines >= LIMITS.WARNING && r.lines < LIMITS.ERROR);
  const errors = results.filter((r) => r.lines >= LIMITS.ERROR);

  if (errors.length > 0) {
    console.log('❌ ERROR: Files exceeding 500 lines (MUST REFACTOR):');
    errors.forEach(({ file, lines }) => {
      console.log(`   ${file}: ${lines} lines`);
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNING: Files approaching 400 lines (should refactor soon):');
    warnings.forEach(({ file, lines }) => {
      console.log(`   ${file}: ${lines} lines`);
    });
    console.log('');
  }

  if (results.length === 0) {
    console.log('✅ All files are under 300 lines!');
  } else {
    const other = results.filter((r) => r.lines < LIMITS.WARNING);
    if (other.length > 0) {
      console.log('ℹ️  Files over 300 lines (monitor):');
      other.forEach(({ file, lines }) => {
        console.log(`   ${file}: ${lines} lines`);
      });
    }
  }

  console.log(`\nTotal files checked: ${files.length}`);
  console.log(`Files over 300 lines: ${results.length}`);
  console.log(`Files over 400 lines: ${warnings.length + errors.length}`);
  console.log(`Files over 500 lines: ${errors.length}\n`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();

