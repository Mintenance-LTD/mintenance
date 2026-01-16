#!/usr/bin/env node

/**
 * Generate comprehensive coverage reports for all apps
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function runCommand(cmd, cwd, silent = false) {
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message
    };
  }
}

function readCoverageSummary(coverageFile) {
  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    return coverage.total;
  } catch (error) {
    return null;
  }
}

function formatPercentage(value, threshold) {
  const pct = typeof value === 'number' ? value : value.pct || 0;
  const color = pct >= threshold ? colors.green : pct >= threshold * 0.8 ? colors.yellow : colors.red;
  return `${color}${pct.toFixed(2)}%${colors.reset}`;
}

function printCoverageTable(title, metrics, thresholds) {
  console.log(`\n${colors.cyan}${colors.bold}${title}${colors.reset}`);
  console.log('━'.repeat(60));

  const headers = ['Metric', 'Coverage', 'Threshold', 'Status'];
  const colWidths = [15, 12, 12, 10];

  // Print header
  console.log(headers.map((h, i) => h.padEnd(colWidths[i])).join('│'));
  console.log('─'.repeat(60));

  // Print rows
  ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
    const value = metrics[metric];
    const threshold = thresholds[metric];
    const pct = typeof value === 'object' ? value.pct : value;
    const status = pct >= threshold ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;

    console.log([
      metric.charAt(0).toUpperCase() + metric.slice(1),
      formatPercentage(value, threshold),
      `${threshold}%`,
      status
    ].map((v, i) => String(v).padEnd(colWidths[i])).join('│'));
  });
}

async function generateCoverageReports() {
  console.log(`${colors.cyan}${colors.bold}=== Generating Coverage Reports ===${colors.reset}\n`);

  const results = {
    web: { success: false, coverage: null },
    mobile: { success: false, coverage: null }
  };

  // Web Application Coverage
  console.log(`${colors.blue}${colors.bold}📱 Web Application${colors.reset}`);
  console.log('Running tests with coverage...');

  const webDir = path.join(__dirname, '..', 'apps', 'web');
  const webResult = runCommand('npm run test:coverage', webDir, true);

  if (webResult.success) {
    results.web.success = true;
    const coverageFile = path.join(webDir, 'coverage', 'coverage-summary.json');
    results.web.coverage = readCoverageSummary(coverageFile);

    if (results.web.coverage) {
      printCoverageTable('Web Coverage Results', results.web.coverage, {
        statements: 30,
        branches: 25,
        functions: 30,
        lines: 30
      });
    }

    console.log(`\n${colors.green}✓${colors.reset} Coverage report generated: apps/web/coverage/index.html`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Failed to generate web coverage`);
  }

  // Mobile Application Coverage
  console.log(`\n${colors.blue}${colors.bold}📱 Mobile Application${colors.reset}`);
  console.log('Running tests with coverage...');

  const mobileDir = path.join(__dirname, '..', 'apps', 'mobile');
  const mobileResult = runCommand('npm run test:coverage -- --maxWorkers=2', mobileDir, true);

  if (mobileResult.success) {
    results.mobile.success = true;
    const coverageFile = path.join(mobileDir, 'coverage', 'coverage-summary.json');
    results.mobile.coverage = readCoverageSummary(coverageFile);

    if (results.mobile.coverage) {
      printCoverageTable('Mobile Coverage Results', results.mobile.coverage, {
        statements: 30,
        branches: 20,
        functions: 25,
        lines: 30
      });
    }

    console.log(`\n${colors.green}✓${colors.reset} Coverage report generated: apps/mobile/coverage/index.html`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Failed to generate mobile coverage`);
  }

  // Overall Summary
  console.log(`\n${colors.cyan}${colors.bold}=== Overall Coverage Summary ===${colors.reset}`);
  console.log('━'.repeat(60));

  const hasWebCoverage = results.web.coverage !== null;
  const hasMobileCoverage = results.mobile.coverage !== null;

  if (hasWebCoverage || hasMobileCoverage) {
    const overallMetrics = {
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      lines: { total: 0, covered: 0 }
    };

    // Aggregate metrics
    [results.web.coverage, results.mobile.coverage].forEach(coverage => {
      if (coverage) {
        ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
          if (coverage[metric]) {
            overallMetrics[metric].total += coverage[metric].total || 0;
            overallMetrics[metric].covered += coverage[metric].covered || 0;
          }
        });
      }
    });

    // Calculate percentages
    const overallPercentages = {};
    ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
      const { total, covered } = overallMetrics[metric];
      overallPercentages[metric] = total > 0 ? (covered / total) * 100 : 0;
    });

    console.log(`\n${colors.bold}Combined Coverage:${colors.reset}`);
    ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
      const pct = overallPercentages[metric];
      const color = pct >= 80 ? colors.green : pct >= 60 ? colors.yellow : colors.red;
      console.log(`  ${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${color}${pct.toFixed(2)}%${colors.reset}`);
    });

    // Coverage gaps analysis
    console.log(`\n${colors.cyan}${colors.bold}=== Coverage Gap Analysis ===${colors.reset}`);
    console.log('━'.repeat(60));

    const targetCoverage = 80;
    ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
      const current = overallPercentages[metric];
      const gap = targetCoverage - current;
      if (gap > 0) {
        console.log(`  ${metric}: ${colors.yellow}${gap.toFixed(1)}%${colors.reset} below target`);
      }
    });

    // Recommendations
    console.log(`\n${colors.cyan}${colors.bold}=== Recommendations ===${colors.reset}`);
    console.log('━'.repeat(60));

    const avgCoverage = Object.values(overallPercentages).reduce((a, b) => a + b, 0) / 4;

    if (avgCoverage < 30) {
      console.log(`${colors.red}⚠ CRITICAL:${colors.reset} Coverage is severely below target (${avgCoverage.toFixed(1)}% vs 80%)`);
      console.log('\nPriority actions:');
      console.log('1. Focus on critical path testing (authentication, payments, core features)');
      console.log('2. Add unit tests for all utility functions and helpers');
      console.log('3. Implement integration tests for API endpoints');
      console.log('4. Add component tests for all UI components');
    } else if (avgCoverage < 60) {
      console.log(`${colors.yellow}⚠ WARNING:${colors.reset} Coverage needs improvement (${avgCoverage.toFixed(1)}% vs 80%)`);
      console.log('\nRecommended actions:');
      console.log('1. Increase unit test coverage for services');
      console.log('2. Add missing component tests');
      console.log('3. Improve edge case testing');
    } else if (avgCoverage < 80) {
      console.log(`${colors.blue}ℹ INFO:${colors.reset} Coverage is approaching target (${avgCoverage.toFixed(1)}% vs 80%)`);
      console.log('\nNext steps:');
      console.log('1. Fill remaining coverage gaps');
      console.log('2. Add E2E tests for critical user journeys');
    } else {
      console.log(`${colors.green}✓ EXCELLENT:${colors.reset} Coverage meets target (${avgCoverage.toFixed(1)}%)`);
      console.log('\nMaintenance tasks:');
      console.log('1. Maintain coverage with new features');
      console.log('2. Refactor and optimize test suite');
    }

    // File locations
    console.log(`\n${colors.cyan}${colors.bold}=== View Detailed Reports ===${colors.reset}`);
    console.log('━'.repeat(60));
    console.log('Web:    apps/web/coverage/index.html');
    console.log('Mobile: apps/mobile/coverage/index.html');
    console.log('\nOpen these files in a browser for detailed coverage information.');

  } else {
    console.log(`${colors.red}No coverage data available${colors.reset}`);
  }

  // Exit with appropriate code
  const exitCode = results.web.success && results.mobile.success ? 0 : 1;
  process.exit(exitCode);
}

// Run the script
generateCoverageReports().catch(error => {
  console.error(`${colors.red}Error generating coverage reports:${colors.reset}`, error);
  process.exit(1);
});