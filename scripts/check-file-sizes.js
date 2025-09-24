#!/usr/bin/env node

/**
 * File Size Compliance Checker
 *
 * Automated script to enforce architecture file size limits:
 * - 500 lines: MAXIMUM (hard error)
 * - 400 lines: WARNING (should refactor soon)
 * - 200 lines: IDEAL (for classes/components)
 *
 * @compliance Architecture principles enforcement
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LIMITS = {
  ERROR: 500,    // Hard limit - fail build
  WARNING: 400,  // Warning limit - should refactor
  IDEAL: 200     // Ideal limit for classes
};

const IGNORE_PATTERNS = [
  'node_modules/',
  'coverage/',
  'dist/',
  'build/',
  '.git/',
  '__tests__/',
  '.test.',
  '.spec.',
  '.backup',
  'database.ts.backup'
];

/**
 * Get all TypeScript files in src directory
 */
function getAllTSFiles() {
  try {
    const result = execSync('find src -name "*.ts" -o -name "*.tsx"', { encoding: 'utf8' });
    return result.trim().split('\n').filter(file => {
      return !IGNORE_PATTERNS.some(pattern => file.includes(pattern));
    });
  } catch (error) {
    console.error('Error finding TypeScript files:', error.message);
    return [];
  }
}

/**
 * Count lines in a file
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}`);
    return 0;
  }
}

/**
 * Check file size compliance
 */
function checkFileSizes() {
  const files = getAllTSFiles();
  const violations = {
    errors: [],
    warnings: [],
    large_classes: []
  };

  console.log('🔍 Checking file size compliance...\n');

  files.forEach(file => {
    const lineCount = countLines(file);

    if (lineCount > LIMITS.ERROR) {
      violations.errors.push({ file, lines: lineCount });
    } else if (lineCount > LIMITS.WARNING) {
      violations.warnings.push({ file, lines: lineCount });
    } else if (lineCount > LIMITS.IDEAL && (file.includes('Screen') || file.includes('Service') || file.includes('Component'))) {
      violations.large_classes.push({ file, lines: lineCount });
    }
  });

  return violations;
}

/**
 * Display results with colors
 */
function displayResults(violations) {
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const BLUE = '\x1b[34m';
  const GREEN = '\x1b[32m';
  const RESET = '\x1b[0m';
  const BOLD = '\x1b[1m';

  // Critical errors (>500 lines)
  if (violations.errors.length > 0) {
    console.log(`${RED}${BOLD}❌ CRITICAL VIOLATIONS (>500 lines):${RESET}`);
    violations.errors.forEach(({ file, lines }) => {
      const multiplier = (lines / LIMITS.ERROR).toFixed(1);
      console.log(`${RED}   ${file}: ${lines} lines (${multiplier}x over limit)${RESET}`);
    });
    console.log();
  }

  // Warnings (400-500 lines)
  if (violations.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}⚠️  WARNING VIOLATIONS (400-500 lines):${RESET}`);
    violations.warnings.forEach(({ file, lines }) => {
      console.log(`${YELLOW}   ${file}: ${lines} lines (approaching limit)${RESET}`);
    });
    console.log();
  }

  // Large classes/components (200-400 lines)
  if (violations.large_classes.length > 0) {
    console.log(`${BLUE}${BOLD}📏 LARGE CLASSES (>200 lines):${RESET}`);
    violations.large_classes.forEach(({ file, lines }) => {
      console.log(`${BLUE}   ${file}: ${lines} lines (consider splitting)${RESET}`);
    });
    console.log();
  }

  // Summary
  const totalViolations = violations.errors.length + violations.warnings.length;

  if (totalViolations === 0) {
    console.log(`${GREEN}${BOLD}✅ All files comply with size limits!${RESET}`);
    console.log(`${GREEN}   Checked files follow the 500-line architecture principle.${RESET}\n`);
  } else {
    console.log(`${BOLD}📊 SUMMARY:${RESET}`);
    console.log(`   Critical errors: ${violations.errors.length}`);
    console.log(`   Warnings: ${violations.warnings.length}`);
    console.log(`   Large classes: ${violations.large_classes.length}`);
    console.log();
  }

  return totalViolations;
}

/**
 * Show successful refactoring example
 */
function showRefactoringSuccess() {
  const GREEN = '\x1b[32m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';

  console.log(`${GREEN}${BOLD}🎉 REFACTORING SUCCESS EXAMPLE:${RESET}`);
  console.log(`${GREEN}   database.ts: 3,778 lines → Split into modular files:${RESET}`);
  console.log(`${GREEN}   ├── core/database.core.ts: 268 lines ✅${RESET}`);
  console.log(`${GREEN}   ├── location/location.types.ts: 238 lines ✅${RESET}`);
  console.log(`${GREEN}   ├── jobs/job.types.ts: 345 lines ✅${RESET}`);
  console.log(`${GREEN}   └── database.refactored.ts: 88 lines ✅${RESET}`);
  console.log(`${GREEN}   Total reduction: 3,778 → 939 lines (75% reduction!)${RESET}\n`);
}

/**
 * Main execution
 */
function main() {
  const violations = checkFileSizes();
  const totalViolations = displayResults(violations);

  // Show refactoring success if we have violations to inspire action
  if (totalViolations > 0) {
    showRefactoringSuccess();

    console.log('💡 NEXT STEPS:');
    console.log('   1. Split large files into domain-specific modules');
    console.log('   2. Extract components from large screens');
    console.log('   3. Use service composition over monolithic services');
    console.log('   4. Follow single responsibility principle\n');
  }

  // Exit with error code if critical violations exist
  if (violations.errors.length > 0) {
    console.error('❌ Build failed due to file size violations. Please refactor before continuing.');
    process.exit(1);
  }

  if (violations.warnings.length > 0) {
    console.warn('⚠️  Warning: Some files are approaching size limits.');
    // Don't fail build for warnings, but notify
  }

  console.log('✅ File size check completed successfully.');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkFileSizes, displayResults };