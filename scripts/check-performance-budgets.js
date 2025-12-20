#!/usr/bin/env node
/**
 * Performance Budget Checker
 * Validates performance metrics against defined budgets
 */

const fs = require('fs');
const path = require('path');

const platform = process.argv[2] || 'mobile';
const budgetFile = path.join(__dirname, '..', 'apps', platform, 'performance-budgets.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkBudgets() {
  log(`\n${colors.bold}📊 Performance Budget Checker${colors.reset}\n`, 'blue');
  log(`Platform: ${platform}\n`);

  // Check if budget file exists
  if (!fs.existsSync(budgetFile)) {
    log(`❌ Budget file not found: ${budgetFile}`, 'red');
    process.exit(1);
  }

  // Load budget configuration
  const budgetConfig = JSON.parse(fs.readFileSync(budgetFile, 'utf8'));
  const budgets = budgetConfig.budgets[platform];

  if (!budgets) {
    log(`❌ No budgets defined for platform: ${platform}`, 'red');
    process.exit(1);
  }

  log('Configured Budgets:\n', 'bold');

  let hasErrors = false;
  let hasWarnings = false;

  // Display all budgets
  Object.entries(budgets).forEach(([metric, config]) => {
    const warningThreshold = config.warning;
    const errorThreshold = config.error;

    log(`  ${metric}:`, 'blue');
    log(`    Warning: ${formatValue(warningThreshold, metric)}`, 'yellow');
    log(`    Error:   ${formatValue(errorThreshold, metric)}`, 'red');
    log(`    Description: ${config.description}`);
    log('');
  });

  // Check bundle size if platform is mobile
  if (platform === 'mobile') {
    const distPath = path.join(__dirname, '..', 'apps', 'mobile', 'dist');

    if (fs.existsSync(distPath)) {
      const bundleSize = getDirectorySize(distPath);
      const budgetSize = budgets.bundle_size.warning;
      const errorSize = budgets.bundle_size.error;

      log('Bundle Size Analysis:\n', 'bold');
      log(`  Current Size: ${formatBytes(bundleSize)}`);
      log(`  Warning Threshold: ${formatBytes(budgetSize)}`, 'yellow');
      log(`  Error Threshold: ${formatBytes(errorSize)}`, 'red');

      if (bundleSize > errorSize) {
        log(`  ❌ FAIL: Bundle size exceeds error threshold!`, 'red');
        hasErrors = true;
      } else if (bundleSize > budgetSize) {
        log(`  ⚠️  WARNING: Bundle size exceeds warning threshold`, 'yellow');
        hasWarnings = true;
      } else {
        log(`  ✅ PASS: Bundle size within budget`, 'green');
      }
      log('');
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('Summary:', 'bold');

  if (hasErrors) {
    log('❌ Performance budget check FAILED', 'red');
    log('Please optimize your application before proceeding.', 'red');
    process.exit(1);
  } else if (hasWarnings) {
    log('⚠️  Performance budget check passed with WARNINGS', 'yellow');
    log('Consider optimizing to stay within warning thresholds.', 'yellow');

    if (budgetConfig.enforcement.fail_on_warning) {
      process.exit(1);
    }
  } else {
    log('✅ All performance budgets are healthy!', 'green');
  }

  log('='.repeat(60) + '\n', 'blue');
}

function formatValue(value, metric) {
  if (metric.includes('size') || metric.includes('memory')) {
    return formatBytes(value);
  }
  if (metric.includes('time')) {
    return `${value}ms`;
  }
  if (metric.includes('fps')) {
    return `${value} FPS`;
  }
  return value.toString();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
  let totalSize = 0;

  function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        walkDir(filePath);
      } else {
        totalSize += stats.size;
      }
    });
  }

  if (fs.existsSync(dirPath)) {
    walkDir(dirPath);
  }

  return totalSize;
}

// Run the checker
try {
  checkBudgets();
} catch (error) {
  log(`\n❌ Error checking performance budgets: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
