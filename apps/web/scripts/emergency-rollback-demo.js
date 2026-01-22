#!/usr/bin/env node

/**
 * Emergency Rollback Demo
 * Demonstrates the emergency kill switch functionality
 */

const chalk = require('chalk');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
console.log(chalk.red.bold('🚨 EMERGENCY ROLLBACK SYSTEM\n'));

function showNormalStatus() {
  console.log(chalk.blue.bold('Current Status: NORMAL\n'));
  console.log(chalk.green('✓ All new controllers active'));
  console.log(chalk.green('✓ Feature flags enabled'));
  console.log(chalk.green('✓ Rollout percentages: 5-10%'));
  console.log(chalk.green('✓ Error rate: 0.15%'));
  console.log(chalk.green('✓ Response times: Normal\n'));
}

function showEmergencyStatus() {
  console.log(chalk.red.bold('🚨 EMERGENCY KILL SWITCH ACTIVATED!\n'));
  console.log(chalk.red('✗ All new controllers DISABLED'));
  console.log(chalk.red('✗ Feature flags BYPASSED'));
  console.log(chalk.red('✗ 100% traffic on OLD controllers'));
  console.log(chalk.yellow('⚠ Rollback complete in < 1ms'));
  console.log(chalk.yellow('⚠ Zero downtime during switch\n'));
}

function demonstrateRollback() {
  showNormalStatus();

  console.log(chalk.yellow('Simulating production incident...\n'));

  setTimeout(() => {
    console.log(chalk.red('⚠️  ALERT: High error rate detected!'));
    console.log(chalk.red('   Error rate: 5.2% (threshold: 1%)'));
    console.log(chalk.red('   P99 latency: 2500ms (threshold: 1000ms)\n'));

    setTimeout(() => {
      console.log(chalk.yellow('🔄 Initiating emergency rollback...\n'));

      setTimeout(() => {
        console.clear();
        showEmergencyStatus();

        console.log(chalk.green.bold('Recovery Status:\n'));
        console.log(chalk.green('✓ All traffic now on stable old controllers'));
        console.log(chalk.green('✓ Error rate dropping: 5.2% → 0.1%'));
        console.log(chalk.green('✓ Response times normalized'));
        console.log(chalk.green('✓ No user sessions interrupted\n'));

        console.log(chalk.blue.bold('Impact Summary:\n'));
        console.log('• Rollback time: < 1 second');
        console.log('• Users affected: 0 (seamless fallback)');
        console.log('• Data loss: None');
        console.log('• Downtime: Zero\n');

        console.log(chalk.yellow.bold('Next Steps:\n'));
        console.log('1. Investigate root cause of failures');
        console.log('2. Fix issues in new controllers');
        console.log('3. Test fixes in staging');
        console.log('4. Gradually re-enable at 1% rollout\n');

        demonstrateRecovery();
      }, 1000);
    }, 2000);
  }, 2000);
}

function demonstrateRecovery() {
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.blue.bold('\n🔄 Recovery Mode\n'));

  const steps = [
    { time: '10:45 PM', action: 'Emergency kill switch activated', status: '✓' },
    { time: '10:46 PM', action: 'All traffic on old controllers', status: '✓' },
    { time: '10:47 PM', action: 'Error rate normalized', status: '✓' },
    { time: '10:50 PM', action: 'Root cause identified', status: '⏳' },
    { time: '11:00 PM', action: 'Fix deployed to staging', status: '⏳' },
    { time: '11:15 PM', action: 'Tests passing in staging', status: '⏳' },
    { time: '11:30 PM', action: 'Re-enable at 1% rollout', status: '⏳' }
  ];

  console.log('Recovery Timeline:\n');
  steps.forEach(step => {
    const statusIcon = step.status === '✓' ? chalk.green('✓') : chalk.yellow('⏳');
    const timeColor = step.status === '✓' ? chalk.gray : chalk.blue;
    console.log(`${timeColor(step.time)} ${statusIcon} ${step.action}`);
  });

  console.log('\n' + chalk.gray('─'.repeat(50)));
  console.log(chalk.green.bold('\n✅ Emergency Rollback Successful!\n'));

  // Show command examples
  console.log(chalk.cyan('Emergency Commands Used:\n'));
  console.log(chalk.gray('# Instant rollback (environment variable):'));
  console.log('export EMERGENCY_KILL_SWITCH=true\n');

  console.log(chalk.gray('# Via npm script:'));
  console.log('npm run rollout:emergency\n');

  console.log(chalk.gray('# Direct database update:'));
  console.log('UPDATE feature_flags SET rollout_percentage = 0;\n');

  console.log(chalk.gray('# To re-enable after fix:'));
  console.log('unset EMERGENCY_KILL_SWITCH');
  console.log('npm run rollout:adjust\n');

  rl.close();
}

// Start demo
console.log(chalk.cyan('This demo will simulate an emergency rollback scenario.\n'));

rl.question('Press Enter to start the demonstration...', () => {
  console.clear();
  demonstrateRollback();
});