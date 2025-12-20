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

  logger.info('\n📊 File Size Audit Results\n');
  logger.info('Files over 300 lines:\n');

  const warnings = results.filter((r) => r.lines >= LIMITS.WARNING && r.lines < LIMITS.ERROR);
  const errors = results.filter((r) => r.lines >= LIMITS.ERROR);

  if (errors.length > 0) {
    logger.info('❌ ERROR: Files exceeding 500 lines (MUST REFACTOR):');
    errors.forEach(({ file, lines }) => {
      logger.info(`   ${file}: ${lines} lines`);
    });
    logger.info('');
  }

  if (warnings.length > 0) {
    logger.info('⚠️  WARNING: Files approaching 400 lines (should refactor soon):');
    warnings.forEach(({ file, lines }) => {
      logger.info(`   ${file}: ${lines} lines`);
    });
    logger.info('');
  }

  if (results.length === 0) {
    logger.info('✅ All files are under 300 lines!');
  } else {
    const other = results.filter((r) => r.lines < LIMITS.WARNING);
    if (other.length > 0) {
      logger.info('ℹ️  Files over 300 lines (monitor):');
      other.forEach(({ file, lines }) => {
        logger.info(`   ${file}: ${lines} lines`);
      });
    }
  }

  logger.info(`\nTotal files checked: ${files.length}`);
  logger.info(`Files over 300 lines: ${results.length}`);
  logger.info(`Files over 400 lines: ${warnings.length + errors.length}`);
  logger.info(`Files over 500 lines: ${errors.length}\n`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();

