#!/usr/bin/env node

/**
 * Pre-commit hook script
 * 
 * Runs file size checks and warns when files exceed 400 lines
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_LINES = 500;
const WARNING_LINES = 400;

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function checkStagedFiles() {
  try {
    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    })
      .split('\n')
      .filter(Boolean)
      .filter(file => {
        // Only check TypeScript/JavaScript files
        return /\.(ts|tsx|js|jsx)$/.test(file) && 
               !file.includes('.test.') && 
               !file.includes('.spec.') &&
               !file.includes('__tests__') &&
               !file.includes('__mocks__');
      });

    if (stagedFiles.length === 0) {
      return { hasIssues: false, warnings: [], errors: [] };
    }

    const warnings = [];
    const errors = [];

    stagedFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        return;
      }

      const lineCount = countLines(file);

      if (lineCount > MAX_LINES) {
        errors.push({
          file,
          lines: lineCount,
          exceedsBy: lineCount - MAX_LINES,
        });
      } else if (lineCount > WARNING_LINES) {
        warnings.push({
          file,
          lines: lineCount,
        });
      }
    });

    return {
      hasIssues: errors.length > 0 || warnings.length > 0,
      warnings,
      errors,
    };
  } catch (error) {
    console.error('Error checking staged files:', error);
    return { hasIssues: false, warnings: [], errors: [] };
  }
}

function main() {
  console.log('🔍 Running pre-commit checks...\n');

  const result = checkStagedFiles();

  if (result.errors.length > 0) {
    console.log('❌ Files exceeding 500-line limit:\n');
    result.errors.forEach(({ file, lines, exceedsBy }) => {
      console.log(`   ${file}: ${lines} lines (exceeds by ${exceedsBy})`);
    });
    console.log('\n💡 Please split these files before committing.\n');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Files approaching 500-line limit:\n');
    result.warnings.forEach(({ file, lines }) => {
      console.log(`   ${file}: ${lines} lines`);
    });
    console.log('\n💡 Consider splitting these files soon.\n');
  }

  if (!result.hasIssues) {
    console.log('✅ All staged files are within size limits!\n');
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { checkStagedFiles };

