#!/usr/bin/env node

/**
 * Phase 2 Rollout Script - 5% Initial Rollout
 *
 * This script begins the Phase 2 migration for user-related routes
 * Starting with 5% of traffic to validate the new UserService infrastructure
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan.bold('\n' + '='.repeat(80)));
console.log(chalk.cyan.bold('                    PHASE 2 MIGRATION - 5% ROLLOUT'));
console.log(chalk.cyan.bold('='.repeat(80) + '\n'));

// Phase 2 Controllers
const phase2Controllers = [
  {
    name: 'USER_PROFILE',
    route: '/api/users/profile',
    methods: ['GET', 'PUT'],
    traffic: '45,000 req/day',
    current: 0,
    new: 5,
    risk: 'Low',
    description: 'User profile management'
  },
  {
    name: 'USER_SETTINGS',
    route: '/api/users/settings',
    methods: ['GET', 'PUT'],
    traffic: '40,000 req/day',
    current: 0,
    new: 5,
    risk: 'Low',
    description: 'User preferences and settings'
  },
  {
    name: 'USER_AVATAR',
    route: '/api/users/avatar',
    methods: ['GET', 'POST', 'DELETE'],
    traffic: '8,000 req/day',
    current: 0,
    new: 5,
    risk: 'Medium',
    description: 'Avatar upload and management'
  },
];

// Display rollout plan
console.log(chalk.yellow.bold('📋 ROLLOUT PLAN\n'));
console.log(chalk.white('Starting Phase 2 migration with user-related routes'));
console.log(chalk.white('UserService infrastructure: ✅ READY'));
console.log(chalk.white('Testing approach: Shadow mode with gradual rollout\n'));

// Display controller table
console.log(chalk.yellow.bold('🎯 CONTROLLERS TO UPDATE:\n'));
console.log(chalk.gray('┌─────────────────────┬────────────────────────┬─────────┬─────────┬──────────┬────────┐'));
console.log(chalk.gray('│ Controller          │ Route                  │ Current │ New     │ Traffic  │ Risk   │'));
console.log(chalk.gray('├─────────────────────┼────────────────────────┼─────────┼─────────┼──────────┼────────┤'));

phase2Controllers.forEach(controller => {
  const nameCol = controller.name.padEnd(19);
  const routeCol = controller.route.padEnd(22);
  const currentCol = `${controller.current}%`.padEnd(7);
  const newCol = chalk.green(`${controller.new}%`.padEnd(7));
  const trafficCol = controller.traffic.slice(0, 8).padEnd(8);
  const riskCol = controller.risk === 'Low' ?
    chalk.green(controller.risk.padEnd(6)) :
    chalk.yellow(controller.risk.padEnd(6));

  console.log(`│ ${nameCol} │ ${routeCol} │ ${currentCol} │ ${newCol} │ ${trafficCol} │ ${riskCol} │`);
});

console.log(chalk.gray('└─────────────────────┴────────────────────────┴─────────┴─────────┴──────────┴────────┘\n'));

// Impact analysis
console.log(chalk.yellow.bold('📊 IMPACT ANALYSIS:\n'));
const totalDailyRequests = 93000;
const fivePercentRequests = Math.round(totalDailyRequests * 0.05);
console.log(chalk.white(`Total daily requests: ${totalDailyRequests.toLocaleString()}`));
console.log(chalk.green(`Requests on new infrastructure (5%): ${fivePercentRequests.toLocaleString()}`));
console.log(chalk.gray(`Requests on old infrastructure (95%): ${(totalDailyRequests - fivePercentRequests).toLocaleString()}\n`));

// Update feature flags file
function updateFeatureFlags() {
  const featureFlagsPath = path.join(__dirname, '../src/lib/feature-flags.ts');

  try {
    let content = fs.readFileSync(featureFlagsPath, 'utf-8');

    // Update Phase 2 controller percentages
    phase2Controllers.forEach(controller => {
      const regex = new RegExp(
        `(\\[ControllerFlags\\.${controller.name}\\]:\\s*)\\d+`,
        'g'
      );
      content = content.replace(regex, `$1${controller.new}`);
    });

    fs.writeFileSync(featureFlagsPath, content);
    console.log(chalk.green('✅ Feature flags updated successfully\n'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Failed to update feature flags:'), error.message);
    return false;
  }
}

// Monitoring setup
console.log(chalk.yellow.bold('📡 MONITORING SETUP:\n'));
console.log(chalk.white('Key metrics to monitor:'));
console.log(chalk.gray('  • Response time comparison (new vs old)'));
console.log(chalk.gray('  • Error rates for each controller'));
console.log(chalk.gray('  • User profile load times'));
console.log(chalk.gray('  • Avatar upload success rate'));
console.log(chalk.gray('  • Settings update latency\n'));

// Success criteria
console.log(chalk.yellow.bold('✅ SUCCESS CRITERIA:\n'));
console.log(chalk.white('Before increasing to 25%:'));
console.log(chalk.gray('  • Error rate < 0.1%'));
console.log(chalk.gray('  • P95 response time < 200ms'));
console.log(chalk.gray('  • No increase in 5xx errors'));
console.log(chalk.gray('  • Avatar uploads working correctly'));
console.log(chalk.gray('  • Settings persistence verified\n'));

// Rollback plan
console.log(chalk.yellow.bold('🔄 ROLLBACK PLAN:\n'));
console.log(chalk.white('If issues detected:'));
console.log(chalk.gray('  1. Set EMERGENCY_KILL_SWITCH=true'));
console.log(chalk.gray('  2. Or run: npm run rollout:phase2:0'));
console.log(chalk.gray('  3. All traffic returns to old controllers'));
console.log(chalk.gray('  4. No user impact during rollback\n'));

// Execute rollout
console.log(chalk.cyan.bold('═'.repeat(80) + '\n'));
console.log(chalk.magenta.bold('🚀 EXECUTING PHASE 2 ROLLOUT (5%)\n'));

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(chalk.yellow('Proceed with Phase 2 rollout to 5%? (yes/no): '), (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log(chalk.cyan('\n⏳ Updating feature flags...'));

    if (updateFeatureFlags()) {
      // Log the rollout
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        phase: 2,
        rollout: 5,
        controllers: phase2Controllers.map(c => ({
          name: c.name,
          percentage: c.new,
        })),
        executedBy: process.env.USER || 'unknown',
      };

      const logPath = path.join(__dirname, `phase2-rollout-log-${Date.now()}.json`);
      fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));

      console.log(chalk.green.bold('\n✅ PHASE 2 ROLLOUT TO 5% COMPLETE!\n'));
      console.log(chalk.white('Next steps:'));
      console.log(chalk.gray('  1. Monitor metrics for 30 minutes'));
      console.log(chalk.gray('  2. Check error rates and response times'));
      console.log(chalk.gray('  3. Test user profile operations'));
      console.log(chalk.gray('  4. If stable, run: npm run rollout:phase2:25\n'));

      // Start monitoring reminder
      console.log(chalk.yellow.bold('⏰ MONITORING REMINDER:\n'));
      console.log(chalk.white('Run monitoring dashboard:'));
      console.log(chalk.cyan('  npm run monitor:phase2\n'));

      console.log(chalk.green('🎉 Phase 2 migration has begun!'));
      console.log(chalk.gray('UserService is now handling 5% of user traffic.\n'));
    } else {
      console.log(chalk.red.bold('\n❌ ROLLOUT ABORTED - Feature flag update failed\n'));
      console.log(chalk.yellow('Please check the error and try again.'));
    }
  } else {
    console.log(chalk.yellow.bold('\n⚠️  ROLLOUT CANCELLED\n'));
    console.log(chalk.gray('No changes were made.'));
  }

  rl.close();
  console.log(chalk.cyan.bold('\n' + '='.repeat(80) + '\n'));
});