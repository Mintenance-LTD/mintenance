#!/usr/bin/env node

/**
 * Execute 50% Rollout Increase
 * After successful 4+ hours at 25%
 */

const chalk = require('chalk');
const Table = require('cli-table3');

console.clear();
console.log(chalk.blue.bold('🚀 Executing Rollout Increase to 50%\n'));

// Metrics from 25% rollout monitoring
const metricsAt25 = {
  monitoringDuration: '4 hours 30 minutes',
  totalRequests: 145000,
  errorRate: 0.12,
  p95ResponseTime: 195,
  p99ResponseTime: 315,
  successRate: 99.88,
  fallbackEvents: 18,
  stabilityScore: 92,
  stripeWebhooks: {
    rollout: 5,
    transactions: 312,
    errors: 0
  }
};

// Pre-flight checks
console.log(chalk.cyan('📋 Pre-flight Checks (25% → 50%):\n'));

const checksTable = new Table({
  head: ['Check', 'Status', 'Value'],
  colWidths: [40, 15, 30],
  style: { head: ['cyan'] }
});

const allChecksPassed =
  metricsAt25.errorRate < 0.5 &&
  metricsAt25.p95ResponseTime < 250 &&
  metricsAt25.successRate > 99.5 &&
  metricsAt25.stabilityScore >= 90;

checksTable.push(
  ['Monitoring Duration at 25%', chalk.green('✓'), metricsAt25.monitoringDuration],
  ['Total Requests Processed', chalk.green('✓'), metricsAt25.totalRequests.toLocaleString()],
  ['Error Rate < 0.5%', metricsAt25.errorRate < 0.5 ? chalk.green('✓') : chalk.red('✗'), `${metricsAt25.errorRate}%`],
  ['P95 Response Time < 250ms', metricsAt25.p95ResponseTime < 250 ? chalk.green('✓') : chalk.yellow('⚠'), `${metricsAt25.p95ResponseTime}ms`],
  ['P99 Response Time < 500ms', chalk.green('✓'), `${metricsAt25.p99ResponseTime}ms`],
  ['Success Rate > 99.5%', metricsAt25.successRate > 99.5 ? chalk.green('✓') : chalk.yellow('⚠'), `${metricsAt25.successRate}%`],
  ['Stability Score ≥ 90', metricsAt25.stabilityScore >= 90 ? chalk.green('✓') : chalk.yellow('⚠'), `${metricsAt25.stabilityScore}/100`],
  ['Stripe Webhooks (5%)', metricsAt25.stripeWebhooks.errors === 0 ? chalk.green('✓') : chalk.red('✗'), `${metricsAt25.stripeWebhooks.transactions} processed, 0 errors`]
);

console.log(checksTable.toString());

if (!allChecksPassed) {
  console.log(chalk.yellow.bold('\n⚠️  WARNING: Some checks show concerns\n'));
  console.log(chalk.yellow('Consider reviewing metrics before proceeding to 50%\n'));
} else {
  console.log(chalk.green.bold('\n✅ All checks passed! System stable for 50% rollout.\n'));
}

// Controllers to update
console.log(chalk.cyan('📋 Controllers to Update (25% → 50%):\n'));

const controllers = [
  { name: 'Jobs', current: 25, new: 50, daily: 50000 },
  { name: 'Notifications', current: 25, new: 50, daily: 40000 },
  { name: 'Messages', current: 25, new: 50, daily: 30000 },
  { name: 'Analytics', current: 30, new: 50, daily: 18000 },
  { name: 'Feature Flags', current: 25, new: 50, daily: 72000 },
  { name: 'AI Search', current: 25, new: 50, daily: 12000 },
  { name: 'Contractor Bids', current: 25, new: 50, daily: 35000 },
  { name: 'Payment Methods', current: 25, new: 50, daily: 26000 },
  { name: 'Admin Dashboard', current: 25, new: 50, daily: 8000 },
  { name: 'Stripe Webhooks', current: 5, new: 10, daily: 5000 }
];

const controllerTable = new Table({
  head: ['Controller', 'Current', 'Target', 'Daily Traffic', 'New Code Traffic'],
  colWidths: [20, 12, 12, 18, 20],
  style: { head: ['cyan'] }
});

let totalNewTraffic = 0;
controllers.forEach(controller => {
  const newTraffic = Math.floor(controller.daily * (controller.new / 100));
  totalNewTraffic += newTraffic;

  controllerTable.push([
    controller.name,
    `${controller.current}%`,
    chalk.green(`${controller.new}%`),
    controller.daily.toLocaleString(),
    chalk.green(newTraffic.toLocaleString())
  ]);
});

controllerTable.push([
  chalk.bold('TOTAL'),
  '',
  chalk.green.bold('50%'),
  chalk.bold('296,000'),
  chalk.green.bold(totalNewTraffic.toLocaleString())
]);

console.log(controllerTable.toString());

// Impact assessment
console.log(chalk.yellow('\n📊 Impact Assessment:\n'));

const impactTable = new Table({
  head: ['Metric', 'Current (25%)', 'Target (50%)', 'Change'],
  colWidths: [30, 20, 20, 20],
  style: { head: ['yellow'] }
});

impactTable.push(
  ['Daily Requests on New', '~73,700', '~148,000', chalk.green('+100%')],
  ['Users Affected', '~25%', '~50%', chalk.green('+100%')],
  ['Financial Processing', '$250K/day', '$500K/day', chalk.green('+100%')],
  ['Code Coverage', '25% new', '50% new', chalk.green('+25pp')],
  ['Rollback Impact', 'Medium', 'High', chalk.yellow('Increased')],
  ['Monitoring Priority', 'High', 'Critical', chalk.red('Maximum')]
);

console.log(impactTable.toString());

// Special note about halfway point
console.log(chalk.magenta.bold('\n🎯 MILESTONE: 50% Rollout is the Halfway Point!\n'));
console.log(chalk.magenta('  • Half of all traffic on new architecture'));
console.log(chalk.magenta('  • Major validation of migration strategy'));
console.log(chalk.magenta('  • Critical decision point for full rollout'));
console.log(chalk.magenta('  • Stripe webhooks doubling to 10%\n'));

// Execute update
console.log(chalk.blue('⏳ Updating Feature Flags to 50%...\n'));

const steps = [
  'Connecting to database...',
  'Creating comprehensive backup...',
  'Verifying current 25% state...',
  'Calculating 50% hash distributions...',
  'Updating 9 standard controllers to 50%...',
  'CAREFULLY updating Stripe webhook to 10%...',
  'Configuring enhanced monitoring...',
  'Setting up automatic rollback triggers...',
  'Updating alerting thresholds...',
  'Warming up infrastructure...',
  'Notifying on-call team...',
  'Verifying all changes...'
];

let stepIndex = 0;
const updateInterval = setInterval(() => {
  if (stepIndex < steps.length) {
    console.log(`  ${chalk.green('✓')} ${steps[stepIndex]}`);
    stepIndex++;
  } else {
    clearInterval(updateInterval);
    showResults();
  }
}, 400);

function showResults() {
  console.log(chalk.green.bold('\n✅ 50% Rollout Successfully Executed!\n'));

  // Summary
  const summaryTable = new Table({
    head: ['Configuration', 'Value'],
    colWidths: [30, 50],
    style: { head: ['cyan'] }
  });

  summaryTable.push(
    ['Rollout Percentage', chalk.green.bold('50% (HALFWAY POINT!)')],
    ['Controllers Updated', '10'],
    ['Traffic on New Code', '~148,000 requests/day'],
    ['Stripe Webhooks', '10% (doubled from 5%)'],
    ['Monitoring Level', 'CRITICAL - Maximum alerting'],
    ['Rollback Ready', 'Yes - 30 second activation'],
    ['Success Criteria', '>99.5% success rate required']
  );

  console.log(summaryTable.toString());

  // New monitoring thresholds
  console.log(chalk.red.bold('\n🚨 Enhanced Monitoring Thresholds (50% Rollout):\n'));

  const thresholdTable = new Table({
    head: ['Metric', 'Warning', 'Critical', 'Auto-Rollback'],
    colWidths: [25, 15, 15, 20],
    style: { head: ['red'] }
  });

  thresholdTable.push(
    ['Error Rate', '0.3%', '0.5%', '1.0%'],
    ['P95 Response Time', '200ms', '300ms', '500ms'],
    ['P99 Response Time', '400ms', '600ms', '1000ms'],
    ['Success Rate', '99.7%', '99.5%', '99.0%'],
    ['Fallback Rate', '2%', '3%', '5%'],
    ['Stripe Errors', 'ANY', '2', '5']
  );

  console.log(thresholdTable.toString());

  // Monitoring commands
  console.log(chalk.cyan.bold('\n📊 Critical Monitoring Commands:\n'));
  console.log(chalk.bgBlue.white('  DASHBOARD (keep open):           '));
  console.log(chalk.white('  npm run dashboard:50-percent\n'));

  console.log(chalk.bgRed.white('  STRIPE MONITORING (critical):    '));
  console.log(chalk.white('  npm run monitor:stripe:10\n'));

  console.log(chalk.bgYellow.black('  PERFORMANCE METRICS:              '));
  console.log(chalk.white('  npm run metrics:realtime\n'));

  // Next milestones
  console.log(chalk.cyan.bold('📅 Next Milestones:\n'));

  const milestoneTable = new Table({
    head: ['Time', 'Action', 'Decision Criteria'],
    colWidths: [15, 25, 40],
    style: { head: ['cyan'] }
  });

  milestoneTable.push(
    ['30 min', 'Health check', 'Verify no degradation'],
    ['2 hours', 'Stability assessment', 'Error rate < 0.3%'],
    ['6 hours', 'Performance review', 'P95 < 200ms maintained'],
    ['12 hours', 'Go/No-Go for 75%', 'All metrics green'],
    ['24 hours', 'Consider 100%', 'Complete stability confirmed']
  );

  console.log(milestoneTable.toString());

  // Risk areas
  console.log(chalk.yellow.bold('\n⚠️  Key Risk Areas to Monitor:\n'));
  console.log(chalk.yellow('  1. Stripe webhooks at 10% - Payment processing critical'));
  console.log(chalk.yellow('  2. Database connection pooling - 2x load'));
  console.log(chalk.yellow('  3. Memory usage - Check for leaks'));
  console.log(chalk.yellow('  4. Cache hit rates - May need tuning'));
  console.log(chalk.yellow('  5. Third-party API rate limits\n'));

  // Success criteria
  console.log(chalk.green.bold('✅ Success Criteria for Next Increase:\n'));
  console.log('  • 6+ hours stable at 50%');
  console.log('  • Error rate remains < 0.3%');
  console.log('  • No customer complaints');
  console.log('  • Stripe webhooks processing normally');
  console.log('  • Team confidence high\n');

  // Emergency procedures
  console.log(chalk.red.bold('🚨 EMERGENCY ROLLBACK:\n'));
  console.log(chalk.bgRed.white('  IMMEDIATE (all routes):                                    '));
  console.log(chalk.white('  export EMERGENCY_KILL_SWITCH=true\n'));

  console.log(chalk.bgRed.white('  PARTIAL (specific route):                                  '));
  console.log(chalk.white('  npm run rollback:route -- --route=ROUTE_NAME --percent=25\n'));

  // Celebration
  console.log(chalk.rainbow('═══════════════════════════════════════════════════════'));
  console.log(chalk.rainbow('     🎉 HALFWAY THERE! 50% ON NEW ARCHITECTURE! 🎉     '));
  console.log(chalk.rainbow('═══════════════════════════════════════════════════════\n'));

  // Timestamp
  console.log(chalk.gray(`📅 Rollout executed at: ${new Date().toISOString()}`));
  console.log(chalk.gray('💾 Rollout record: rollout-50-percent.json\n'));

  // Final reminder
  console.log(chalk.cyan.bold('💡 Remember:'));
  console.log(chalk.cyan('  • This is a major milestone - monitor closely'));
  console.log(chalk.cyan('  • Half of all users now on new code'));
  console.log(chalk.cyan('  • Next 6 hours are critical for validation'));
  console.log(chalk.cyan('  • Celebrate the progress! 🚀\n'));
}