#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function runCommand(cmd, cwd) {
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
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

function extractTestResults(output) {
  const passMatch = output.match(/(\d+)\s+passed/);
  const failMatch = output.match(/(\d+)\s+failed/);
  const skipMatch = output.match(/(\d+)\s+skipped/);
  const totalMatch = output.match(/Tests:\s+.*?(\d+)\s+total/);

  return {
    passed: passMatch ? parseInt(passMatch[1]) : 0,
    failed: failMatch ? parseInt(failMatch[1]) : 0,
    skipped: skipMatch ? parseInt(skipMatch[1]) : 0,
    total: totalMatch ? parseInt(totalMatch[1]) : 0
  };
}

async function runTargetedTests() {
  console.log(`${colors.cyan}=== Running Targeted Tests for Web and Mobile ===${colors.reset}\n`);

  const results = {
    web: {},
    mobile: {}
  };

  // Web App Tests
  console.log(`${colors.blue}📱 Web Application Tests${colors.reset}`);
  console.log('━'.repeat(50));

  const webTestSuites = [
    { name: 'Sanitizer Tests', path: 'lib/__tests__/sanitizer.test.ts' },
    { name: 'API Tests', path: 'app/api/__tests__' },
    { name: 'Component Tests', path: 'components/__tests__' },
    { name: 'Hook Tests', path: 'hooks/__tests__' },
    { name: 'Utils Tests', path: 'lib/utils/__tests__' }
  ];

  for (const suite of webTestSuites) {
    process.stdout.write(`  Running ${suite.name}... `);
    const result = runCommand(
      `npm run test -- --run --reporter=json ${suite.path} 2>&1`,
      path.join(__dirname, 'apps', 'web')
    );

    if (result.success) {
      try {
        const jsonOutput = JSON.parse(result.output);
        const testResults = {
          passed: jsonOutput.numPassedTests || 0,
          failed: jsonOutput.numFailedTests || 0,
          total: jsonOutput.numTotalTests || 0
        };
        results.web[suite.name] = testResults;

        if (testResults.failed > 0) {
          console.log(`${colors.red}✗${colors.reset} ${testResults.passed}/${testResults.total} passed`);
        } else if (testResults.total > 0) {
          console.log(`${colors.green}✓${colors.reset} ${testResults.passed}/${testResults.total} passed`);
        } else {
          console.log(`${colors.yellow}⚠${colors.reset} No tests found`);
        }
      } catch {
        const testResults = extractTestResults(result.output);
        results.web[suite.name] = testResults;
        if (testResults.total > 0) {
          console.log(`${colors.green}✓${colors.reset} ${testResults.passed}/${testResults.total} passed`);
        } else {
          console.log(`${colors.yellow}⚠${colors.reset} Could not parse results`);
        }
      }
    } else {
      console.log(`${colors.red}✗${colors.reset} Failed to run`);
      results.web[suite.name] = { passed: 0, failed: 0, total: 0, error: true };
    }
  }

  // Mobile App Tests
  console.log(`\n${colors.blue}📱 Mobile Application Tests${colors.reset}`);
  console.log('━'.repeat(50));

  const mobileTestSuites = [
    { name: 'Component Tests', path: 'src/__tests__/components' },
    { name: 'Service Tests', path: 'src/__tests__/services' },
    { name: 'Hook Tests', path: 'src/__tests__/hooks' },
    { name: 'Screen Tests', path: 'src/__tests__/screens' },
    { name: 'Utils Tests', path: 'src/__tests__/utils' },
    { name: 'Navigation Tests', path: 'src/__tests__/navigation' }
  ];

  for (const suite of mobileTestSuites) {
    process.stdout.write(`  Running ${suite.name}... `);
    const result = runCommand(
      `npm run test -- --json --outputFile=test-results.json ${suite.path} 2>&1`,
      path.join(__dirname, 'apps', 'mobile')
    );

    if (result.success) {
      try {
        // Try to read the output file
        const outputFile = path.join(__dirname, 'apps', 'mobile', 'test-results.json');
        if (fs.existsSync(outputFile)) {
          const jsonOutput = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
          const testResults = {
            passed: jsonOutput.numPassedTests || 0,
            failed: jsonOutput.numFailedTests || 0,
            total: jsonOutput.numTotalTests || 0
          };
          results.mobile[suite.name] = testResults;

          if (testResults.failed > 0) {
            console.log(`${colors.red}✗${colors.reset} ${testResults.passed}/${testResults.total} passed`);
          } else if (testResults.total > 0) {
            console.log(`${colors.green}✓${colors.reset} ${testResults.passed}/${testResults.total} passed`);
          } else {
            console.log(`${colors.yellow}⚠${colors.reset} No tests found`);
          }

          // Clean up
          fs.unlinkSync(outputFile);
        } else {
          const testResults = extractTestResults(result.output);
          results.mobile[suite.name] = testResults;
          if (testResults.total > 0) {
            console.log(`${colors.green}✓${colors.reset} ${testResults.passed}/${testResults.total} passed`);
          } else {
            console.log(`${colors.yellow}⚠${colors.reset} Could not parse results`);
          }
        }
      } catch {
        const testResults = extractTestResults(result.output);
        results.mobile[suite.name] = testResults;
        if (testResults.total > 0) {
          console.log(`${colors.green}✓${colors.reset} ${testResults.passed}/${testResults.total} passed`);
        } else {
          console.log(`${colors.yellow}⚠${colors.reset} Could not parse results`);
        }
      }
    } else {
      console.log(`${colors.red}✗${colors.reset} Failed to run`);
      results.mobile[suite.name] = { passed: 0, failed: 0, total: 0, error: true };
    }
  }

  // Summary
  console.log(`\n${colors.cyan}=== Test Summary ===${colors.reset}`);
  console.log('━'.repeat(50));

  // Web Summary
  console.log(`\n${colors.blue}Web Application:${colors.reset}`);
  let webTotal = { passed: 0, failed: 0, total: 0 };
  for (const [suite, result] of Object.entries(results.web)) {
    if (!result.error) {
      webTotal.passed += result.passed;
      webTotal.failed += result.failed;
      webTotal.total += result.total;
      const status = result.failed > 0 ? colors.red : colors.green;
      console.log(`  ${suite}: ${status}${result.passed}/${result.total}${colors.reset} passed`);
    }
  }
  console.log(`  ${colors.yellow}Total: ${webTotal.passed}/${webTotal.total} passed (${webTotal.failed} failed)${colors.reset}`);

  // Mobile Summary
  console.log(`\n${colors.blue}Mobile Application:${colors.reset}`);
  let mobileTotal = { passed: 0, failed: 0, total: 0 };
  for (const [suite, result] of Object.entries(results.mobile)) {
    if (!result.error) {
      mobileTotal.passed += result.passed;
      mobileTotal.failed += result.failed;
      mobileTotal.total += result.total;
      const status = result.failed > 0 ? colors.red : colors.green;
      console.log(`  ${suite}: ${status}${result.passed}/${result.total}${colors.reset} passed`);
    }
  }
  console.log(`  ${colors.yellow}Total: ${mobileTotal.passed}/${mobileTotal.total} passed (${mobileTotal.failed} failed)${colors.reset}`);

  // Overall Summary
  const overallPassed = webTotal.passed + mobileTotal.passed;
  const overallTotal = webTotal.total + mobileTotal.total;
  const overallFailed = webTotal.failed + mobileTotal.failed;
  const percentage = overallTotal > 0 ? ((overallPassed / overallTotal) * 100).toFixed(1) : 0;

  console.log(`\n${colors.cyan}=== Overall Results ===${colors.reset}`);
  console.log('━'.repeat(50));
  console.log(`  Total Tests: ${overallTotal}`);
  console.log(`  ${colors.green}Passed: ${overallPassed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${overallFailed}${colors.reset}`);
  console.log(`  ${colors.yellow}Success Rate: ${percentage}%${colors.reset}`);

  // Coverage estimate
  console.log(`\n${colors.cyan}=== Coverage Estimate ===${colors.reset}`);
  console.log('━'.repeat(50));
  console.log(`  ${colors.yellow}⚠ Note: This is a rough estimate based on test execution${colors.reset}`);
  console.log(`  Web Coverage: ~${(webTotal.passed / Math.max(webTotal.total, 1) * 100).toFixed(1)}%`);
  console.log(`  Mobile Coverage: ~${(mobileTotal.passed / Math.max(mobileTotal.total, 1) * 100).toFixed(1)}%`);
  console.log(`  Overall Coverage: ~${percentage}%`);

  // Recommendations
  console.log(`\n${colors.cyan}=== Recommendations ===${colors.reset}`);
  console.log('━'.repeat(50));
  if (overallFailed > 0) {
    console.log(`  ${colors.red}⚠ Fix ${overallFailed} failing tests${colors.reset}`);
  }
  if (percentage < 80) {
    console.log(`  ${colors.yellow}⚠ Increase test coverage to at least 80%${colors.reset}`);
  }
  console.log(`  ${colors.blue}ℹ Run 'npm run test:coverage' for detailed coverage report${colors.reset}`);
}

// Run the tests
runTargetedTests().catch(console.error);