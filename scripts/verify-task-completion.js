#!/usr/bin/env node

/**
 * Task Completion Verification Script
 *
 * Enforces evidence-based reporting by requiring proof for common claims.
 * Run this before marking any task as complete.
 *
 * Usage:
 *   node scripts/verify-task-completion.js [task-description]
 *   npm run verify-task "Fix authentication bug"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`${message}`, 'bold');
  log(`${'='.repeat(80)}`, 'cyan');
}

function section(message) {
  log(`\n${message}`, 'blue');
  log(`${'-'.repeat(message.length)}`, 'blue');
}

function runCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

function askQuestion(question, required = true) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(`${colors.yellow}${question}${colors.reset} `, (answer) => {
      readline.close();
      if (required && !answer.trim()) {
        log('❌ This question requires an answer.', 'red');
        resolve(askQuestion(question, required));
      } else {
        resolve(answer.trim());
      }
    });
  });
}

async function verifyTaskCompletion() {
  header('TASK COMPLETION VERIFICATION');

  const taskDescription = process.argv[2] || await askQuestion('What task are you completing?');
  log(`\nTask: ${taskDescription}`, 'cyan');

  const verificationResults = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // 1. FILE CHANGES VERIFICATION
  section('1. FILE CHANGES VERIFICATION');
  log('Checking for uncommitted changes...\n');

  const gitStatus = runCommand('git status --short', true);
  if (gitStatus.output && gitStatus.output.trim()) {
    log('✓ Found file changes:', 'green');
    console.log(gitStatus.output);
    verificationResults.passed.push('File changes detected');

    const showDiff = await askQuestion('Show git diff? (y/n)', false);
    if (showDiff.toLowerCase() === 'y') {
      runCommand('git diff');
    }
  } else {
    log('⚠ No file changes detected. Are you sure the task is complete?', 'yellow');
    verificationResults.warnings.push('No file changes detected');
  }

  // 2. TESTING VERIFICATION
  section('2. TESTING VERIFICATION');

  const ranTests = await askQuestion('Did you run tests? (y/n)');
  if (ranTests.toLowerCase() === 'y') {
    const testCommand = await askQuestion('What test command did you run?');
    log(`\nRunning: ${testCommand}\n`, 'cyan');

    const testResult = runCommand(testCommand);
    if (testResult.success) {
      log('✓ Tests passed', 'green');
      verificationResults.passed.push('Tests executed and passed');
    } else {
      log('✗ Tests failed', 'red');
      verificationResults.failed.push('Test execution failed');
    }
  } else {
    log('⚠ No tests were run', 'yellow');
    verificationResults.warnings.push('No tests executed');

    const whyNoTests = await askQuestion('Why were no tests run?');
    log(`Reason: ${whyNoTests}`, 'yellow');
  }

  // 3. BUILD VERIFICATION
  section('3. BUILD VERIFICATION');

  const ranBuild = await askQuestion('Did you verify the build still works? (y/n)');
  if (ranBuild.toLowerCase() === 'y') {
    const buildCommand = await askQuestion('What build command did you run? (or press Enter to skip)');
    if (buildCommand) {
      log(`\nRunning: ${buildCommand}\n`, 'cyan');
      const buildResult = runCommand(buildCommand);
      if (buildResult.success) {
        log('✓ Build succeeded', 'green');
        verificationResults.passed.push('Build verification passed');
      } else {
        log('✗ Build failed', 'red');
        verificationResults.failed.push('Build verification failed');
      }
    }
  } else {
    log('⚠ Build was not verified', 'yellow');
    verificationResults.warnings.push('Build not verified');
  }

  // 4. EDGE CASES VERIFICATION
  section('4. EDGE CASES VERIFICATION');

  const testedEdgeCases = await askQuestion('Did you test edge cases? (y/n)');
  if (testedEdgeCases.toLowerCase() === 'y') {
    const edgeCases = await askQuestion('List edge cases tested (comma-separated):');
    log(`✓ Edge cases tested: ${edgeCases}`, 'green');
    verificationResults.passed.push(`Edge cases: ${edgeCases}`);
  } else {
    log('⚠ No edge cases were tested', 'yellow');
    verificationResults.warnings.push('No edge case testing');
  }

  // 5. UNTESTED SCENARIOS
  section('5. UNTESTED SCENARIOS');

  const untestedScenarios = await askQuestion('List scenarios that were NOT tested (or "none"):');
  if (untestedScenarios.toLowerCase() !== 'none') {
    log(`⚠ Untested scenarios: ${untestedScenarios}`, 'yellow');
    verificationResults.warnings.push(`Untested: ${untestedScenarios}`);
  } else {
    log('✓ All scenarios were tested', 'green');
    verificationResults.passed.push('Complete test coverage claimed');
  }

  // 6. REMAINING RISKS
  section('6. REMAINING RISKS');

  const remainingRisks = await askQuestion('List any remaining risks (or "none"):');
  if (remainingRisks.toLowerCase() !== 'none') {
    log(`⚠ Remaining risks: ${remainingRisks}`, 'yellow');
    verificationResults.warnings.push(`Risks: ${remainingRisks}`);
  } else {
    log('✓ No known remaining risks', 'green');
    verificationResults.passed.push('No remaining risks identified');
  }

  // 7. VERIFICATION METHOD
  section('7. VERIFICATION METHOD');

  const verificationMethod = await askQuestion('How did you verify the task works?');
  log(`Verification method: ${verificationMethod}`, 'cyan');
  verificationResults.passed.push(`Verification: ${verificationMethod}`);

  // FINAL REPORT
  header('VERIFICATION REPORT');

  log(`\nTask: ${taskDescription}`, 'bold');

  section('✓ PASSED CHECKS');
  if (verificationResults.passed.length > 0) {
    verificationResults.passed.forEach(item => log(`  • ${item}`, 'green'));
  } else {
    log('  None', 'yellow');
  }

  section('✗ FAILED CHECKS');
  if (verificationResults.failed.length > 0) {
    verificationResults.failed.forEach(item => log(`  • ${item}`, 'red'));
  } else {
    log('  None', 'green');
  }

  section('⚠ WARNINGS');
  if (verificationResults.warnings.length > 0) {
    verificationResults.warnings.forEach(item => log(`  • ${item}`, 'yellow'));
  } else {
    log('  None', 'green');
  }

  // FINAL DECISION
  log('\n');
  if (verificationResults.failed.length > 0) {
    log('❌ TASK COMPLETION REJECTED', 'red');
    log('Fix the failed checks before marking this task as complete.', 'red');
    process.exit(1);
  } else if (verificationResults.warnings.length > 3) {
    log('⚠ TASK COMPLETION QUESTIONABLE', 'yellow');
    log('Multiple warnings detected. Consider addressing them.', 'yellow');
    const proceed = await askQuestion('Mark as complete anyway? (y/n)');
    if (proceed.toLowerCase() !== 'y') {
      log('Task completion cancelled.', 'yellow');
      process.exit(1);
    }
  } else {
    log('✅ TASK COMPLETION APPROVED', 'green');
    log('Sufficient evidence provided for task completion.', 'green');
  }

  // GENERATE COMPLETION REPORT
  section('COMPLETION REPORT');
  const report = `
## Task Completion Report

**Task**: ${taskDescription}

**Date**: ${new Date().toISOString()}

### Evidence Provided:
${verificationResults.passed.map(item => `- ✓ ${item}`).join('\n')}

### Warnings:
${verificationResults.warnings.length > 0
  ? verificationResults.warnings.map(item => `- ⚠ ${item}`).join('\n')
  : '- None'}

### Failed Checks:
${verificationResults.failed.length > 0
  ? verificationResults.failed.map(item => `- ✗ ${item}`).join('\n')
  : '- None'}

---
Generated by verify-task-completion.js
`;

  log('\nCompletion report:\n', 'cyan');
  console.log(report);

  const saveReport = await askQuestion('Save this report? (y/n)', false);
  if (saveReport.toLowerCase() === 'y') {
    const reportPath = path.join(process.cwd(), 'docs', 'task-completion-reports',
      `${new Date().toISOString().split('T')[0]}_${taskDescription.replace(/\s+/g, '-').toLowerCase()}.md`);

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);
    log(`✓ Report saved to: ${reportPath}`, 'green');
  }

  log('\n' + '='.repeat(80) + '\n', 'cyan');
}

// Run the verification
verifyTaskCompletion().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
