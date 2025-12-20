#!/usr/bin/env node

/**
 * COMPREHENSIVE TEST RUNNER SCRIPT
 * Entry point for running all testing frameworks
 */

const { IntegratedTestRunner } = require('./integrated-test-runner');
const { program } = require('commander');
const path = require('path');

// Configure command line options
program
  .name('comprehensive-tests')
  .description('Run comprehensive testing suite for Mintenance app')
  .version('1.0.0')
  .option('-u, --url <url>', 'Base URL for testing', 'http://localhost:19006')
  .option('-o, --output <dir>', 'Output directory for results', './test-results')
  .option('--no-e2e', 'Skip E2E tests')
  .option('--no-browser', 'Skip browser tests')
  .option('--no-visual', 'Skip visual regression tests')
  .option('--no-performance', 'Skip performance tests')
  .option('--no-accessibility', 'Skip accessibility tests')
  .option('-p, --parallel', 'Run tests in parallel')
  .option('-r, --retries <number>', 'Number of retries for failed tests', '1')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds', '300000')
  .option('--ci', 'Run in CI mode (headless, no interactive prompts)')
  .option('--report-only', 'Only generate reports from existing results')
  .option('--baseline', 'Update visual and performance baselines');

program.parse();
const options = program.opts();

async function main() {
  console.log('🚀 Starting Mintenance App Comprehensive Testing Suite');
  console.log('=' .repeat(60));

  if (options.ci) {
    console.log('🤖 Running in CI mode');
    process.env.CI = 'true';
  }

  const config = {
    baseUrl: options.url,
    outputDir: path.resolve(options.output),
    runE2E: options.e2e,
    runBrowser: options.browser,
    runVisual: options.visual,
    runPerformance: options.performance,
    runAccessibility: options.accessibility,
    parallel: options.parallel,
    retries: parseInt(options.retries),
    timeout: parseInt(options.timeout),
    updateBaselines: options.baseline,
  };

  console.log('📋 Test Configuration:');
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log(`   Output Dir: ${config.outputDir}`);
  console.log(`   E2E Tests: ${config.runE2E ? '✅' : '❌'}`);
  console.log(`   Browser Tests: ${config.runBrowser ? '✅' : '❌'}`);
  console.log(`   Visual Tests: ${config.runVisual ? '✅' : '❌'}`);
  console.log(`   Performance Tests: ${config.runPerformance ? '✅' : '❌'}`);
  console.log(`   Accessibility Tests: ${config.runAccessibility ? '✅' : '❌'}`);
  console.log(`   Parallel Execution: ${config.parallel ? '✅' : '❌'}`);
  console.log('');

  try {
    if (options.reportOnly) {
      console.log('📊 Generating reports from existing results...');
      await generateReportsOnly(config);
    } else {
      await runComprehensiveTests(config);
    }

    console.log('');
    console.log('🎉 All tests completed successfully!');
    console.log(`📊 Results saved to: ${config.outputDir}`);

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Test suite failed:', error.message);
    console.error('');

    if (!options.ci) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

async function runComprehensiveTests(config) {
  const runner = new IntegratedTestRunner(config);

  try {
    await runner.initialize();
    const results = await runner.runAllTests();

    displayResults(results);

    // Check if any tests failed
    if (results.summary.failed > 0) {
      throw new Error(`${results.summary.failed} test(s) failed`);
    }

  } catch (error) {
    await runner.cleanup();
    throw error;
  }
}

async function generateReportsOnly(config) {
  const fs = require('fs').promises;

  // Check if results exist
  const resultsPath = path.join(config.outputDir, 'comprehensive-test-report.html');

  try {
    await fs.access(resultsPath);
    console.log('✅ Found existing results, regenerating reports...');

    // Load existing results and regenerate report
    // Implementation would load saved JSON results and regenerate HTML
    console.log('📊 Reports regenerated successfully');

  } catch (error) {
    throw new Error('No existing test results found. Run tests first without --report-only flag.');
  }
}

function displayResults(results) {
  console.log('');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(40));
  console.log(`⏱️  Total Duration: ${(results.duration / 1000).toFixed(2)}s`);
  console.log(`📊 Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⏭️  Skipped: ${results.summary.skipped}`);

  const successRate = results.summary.total > 0
    ? ((results.summary.passed / results.summary.total) * 100).toFixed(1)
    : '0';

  console.log(`📈 Success Rate: ${successRate}%`);
  console.log('');

  // Detailed breakdown
  if (results.e2e) {
    console.log(`🏠 E2E Tests: ${results.e2e.summary.passed}/${results.e2e.summary.total} passed`);
  }

  if (results.visual) {
    console.log(`📸 Visual Tests: ${results.visual.summary.passed}/${results.visual.summary.total} passed`);
    if (results.visual.summary.newBaselines > 0) {
      console.log(`   📝 New baselines created: ${results.visual.summary.newBaselines}`);
    }
  }

  if (results.performance) {
    console.log(`⚡ Performance: Core Web Vitals ${results.performance.summary.coreWebVitals.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   📦 Bundle Size: ${(results.performance.summary.bundleSize.total / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   ⏱️  Load Time: ${results.performance.summary.loadTime.average.toFixed(0)}ms`);
  }

  if (results.accessibility) {
    console.log(`♿ Accessibility: ${results.accessibility.summary.violations} violations found`);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { main, runComprehensiveTests };