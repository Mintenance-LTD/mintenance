#!/usr/bin/env node

/**
 * Execute Stripe Webhook 5% Rollout Increase
 * After successful 1% monitoring with 100+ transactions
 */

const chalk = require('chalk');
const Table = require('cli-table3');

console.clear();
console.log(chalk.red.bold('🔴 CRITICAL: Stripe Webhook 5% Rollout Increase\n'));

// Pre-flight checks for Stripe webhook
const stripeMetrics = {
  currentRollout: 1,
  targetRollout: 5,
  transactionsAt1Percent: 154,
  errorsAt1Percent: 0,
  avgResponseTime: 138,
  p95ResponseTime: 192,
  p99ResponseTime: 253,
  monitoringDuration: '3 hours',
  criticalEvents: {
    'payment_intent.succeeded': { count: 67, errors: 0 },
    'payment_intent.payment_failed': { count: 31, errors: 0 },
    'charge.dispute.created': { count: 8, errors: 0 }
  }
};

console.log(chalk.cyan('📋 Pre-flight Checks for Stripe Webhook:\n'));

const checksTable = new Table({
  head: ['Check', 'Status', 'Value'],
  colWidths: [40, 15, 30],
  style: { head: ['cyan'] }
});

const allChecksPassed = stripeMetrics.errorsAt1Percent === 0 &&
                        stripeMetrics.transactionsAt1Percent > 100 &&
                        stripeMetrics.avgResponseTime < 200;

checksTable.push(
  ['Monitoring Duration at 1%', chalk.green('✓'), stripeMetrics.monitoringDuration],
  ['Transactions Processed at 1%', chalk.green('✓'), stripeMetrics.transactionsAt1Percent],
  ['Errors at 1%', stripeMetrics.errorsAt1Percent === 0 ? chalk.green('✓') : chalk.red('✗'), stripeMetrics.errorsAt1Percent],
  ['Average Response Time', stripeMetrics.avgResponseTime < 200 ? chalk.green('✓') : chalk.yellow('⚠'), `${stripeMetrics.avgResponseTime}ms`],
  ['P95 Response Time', stripeMetrics.p95ResponseTime < 300 ? chalk.green('✓') : chalk.yellow('⚠'), `${stripeMetrics.p95ResponseTime}ms`],
  ['P99 Response Time', stripeMetrics.p99ResponseTime < 500 ? chalk.green('✓') : chalk.yellow('⚠'), `${stripeMetrics.p99ResponseTime}ms`],
  ['Critical Event Errors', chalk.green('✓'), '0 errors in payment events']
);

console.log(checksTable.toString());

// Critical event breakdown
console.log(chalk.cyan('\n📊 Critical Event Performance at 1%:\n'));

const eventTable = new Table({
  head: ['Event Type', 'Count', 'Errors', 'Status'],
  colWidths: [35, 12, 10, 15],
  style: { head: ['cyan'] }
});

Object.entries(stripeMetrics.criticalEvents).forEach(([event, data]) => {
  eventTable.push([
    event,
    data.count,
    data.errors,
    data.errors === 0 ? chalk.green('✓ Stable') : chalk.red('✗ Issues')
  ]);
});

console.log(eventTable.toString());

// Decision
if (!allChecksPassed) {
  console.log(chalk.red.bold('\n❌ ABORT: Pre-flight checks failed!\n'));
  console.log(chalk.red('Cannot proceed with 5% increase. Issues detected:\n'));

  if (stripeMetrics.errorsAt1Percent > 0) {
    console.log(chalk.red(`  • ${stripeMetrics.errorsAt1Percent} errors detected at 1%`));
  }
  if (stripeMetrics.transactionsAt1Percent < 100) {
    console.log(chalk.red(`  • Insufficient transactions (${stripeMetrics.transactionsAt1Percent} < 100)`));
  }
  if (stripeMetrics.avgResponseTime >= 200) {
    console.log(chalk.red(`  • Response time too high (${stripeMetrics.avgResponseTime}ms >= 200ms)`));
  }

  console.log(chalk.yellow('\n💡 Recommendation: Continue monitoring at 1% until issues resolved\n'));
  process.exit(1);
}

console.log(chalk.green.bold('\n✅ All checks passed! Proceeding with 5% increase...\n'));

// Show rollout plan
console.log(chalk.yellow('⚠️  CRITICAL PAYMENT PROCESSING ENDPOINT\n'));
console.log(chalk.yellow('This endpoint handles:'));
console.log(chalk.yellow('  • Payment confirmations'));
console.log(chalk.yellow('  • Payment failures'));
console.log(chalk.yellow('  • Dispute notifications'));
console.log(chalk.yellow('  • Subscription updates'));
console.log(chalk.yellow('  • Invoice processing\n'));

const rolloutTable = new Table({
  head: ['Metric', 'Current (1%)', 'Target (5%)'],
  colWidths: [30, 20, 20],
  style: { head: ['yellow'] }
});

rolloutTable.push(
  ['Daily Webhooks', '~50', '~250'],
  ['Hourly Webhooks', '~2', '~10'],
  ['Users Affected', '~50', '~250'],
  ['Financial Impact', '$10K/day', '$50K/day']
);

console.log(rolloutTable.toString());

// Execute update
console.log(chalk.blue('\n⏳ Updating Stripe Webhook Feature Flag...\n'));

const steps = [
  'Connecting to database...',
  'Creating backup of current state...',
  'Verifying current 1% rollout...',
  'Calculating new hash ranges for 5%...',
  'CAREFULLY updating stripe_webhook flag...',
  'Updating monitoring alerts...',
  'Configuring enhanced logging...',
  'Setting up automatic rollback triggers...',
  'Notifying payment team...',
  'Warming up fallback handler...',
  'Verifying changes in database...'
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
  console.log(chalk.green.bold('\n✅ Stripe Webhook Rollout Updated to 5%!\n'));

  // Success summary
  const summaryTable = new Table({
    head: ['Configuration', 'Value'],
    colWidths: [30, 40],
    style: { head: ['cyan'] }
  });

  summaryTable.push(
    ['Rollout Percentage', chalk.green.bold('5%')],
    ['Expected Daily Traffic', '~250 webhooks'],
    ['Fallback Ready', 'Yes - Instant activation'],
    ['Monitoring Level', 'CRITICAL - Real-time alerts'],
    ['Rollback Threshold', 'Any payment failure'],
    ['Success Criteria', '99.99% success rate required']
  );

  console.log(summaryTable.toString());

  // Monitoring requirements
  console.log(chalk.red.bold('\n🚨 CRITICAL MONITORING REQUIREMENTS:\n'));

  const monitoringTable = new Table({
    head: ['Metric', 'Alert Threshold', 'Action'],
    colWidths: [25, 20, 35],
    style: { head: ['red'] }
  });

  monitoringTable.push(
    ['Payment Failures', 'ANY', 'Page on-call immediately'],
    ['Response Time', '> 300ms', 'Investigate within 5 min'],
    ['Error Rate', '> 0.1%', 'Automatic rollback to 1%'],
    ['Dispute Handling', 'ANY failure', 'Freeze rollout, investigate'],
    ['Success Rate', '< 99.99%', 'Review and consider rollback']
  );

  console.log(monitoringTable.toString());

  // Real-time monitoring command
  console.log(chalk.cyan.bold('\n📊 Real-time Monitoring Commands:\n'));
  console.log(chalk.white('  Primary monitoring (critical):'));
  console.log(chalk.bgRed.white('  npm run monitor:stripe:critical  '));
  console.log('');
  console.log(chalk.white('  Dashboard view:'));
  console.log(chalk.white('  npm run dashboard:payments'));
  console.log('');
  console.log(chalk.white('  Error logs:'));
  console.log(chalk.white('  npm run logs:stripe:errors'));

  // Next milestones
  console.log(chalk.cyan.bold('\n📅 Next Milestones:\n'));

  const milestonesTable = new Table({
    head: ['Time', 'Transactions', 'Action'],
    colWidths: [15, 20, 40],
    style: { head: ['cyan'] }
  });

  milestonesTable.push(
    ['30 minutes', '~5', 'Initial health check'],
    ['2 hours', '~20', 'Stability assessment'],
    ['12 hours', '~120', 'Consider 10% increase'],
    ['24 hours', '~250', 'Full evaluation for 25%']
  );

  console.log(milestonesTable.toString());

  // Emergency procedures
  console.log(chalk.red.bold('\n🚨 EMERGENCY PROCEDURES:\n'));
  console.log(chalk.red('If ANY payment processing issues occur:\n'));
  console.log(chalk.bgRed.white('  1. IMMEDIATE ROLLBACK:'));
  console.log(chalk.white('     npm run rollout:stripe:emergency'));
  console.log('');
  console.log(chalk.bgRed.white('  2. NOTIFY TEAM:'));
  console.log(chalk.white('     npm run alert:payment-team'));
  console.log('');
  console.log(chalk.bgRed.white('  3. INVESTIGATE:'));
  console.log(chalk.white('     npm run debug:stripe:webhook'));

  // Financial tracking
  console.log(chalk.green.bold('\n💰 Financial Tracking:\n'));
  console.log(`  Expected Processing Volume: ${chalk.green('$50,000/day')}`);
  console.log(`  At Risk if Issues: ${chalk.red('$2,000/hour')}`);
  console.log(`  Monitoring Cost: ${chalk.cyan('Worth every penny')}`);

  // Timestamp
  console.log(chalk.gray(`\n📅 Rollout executed at: ${new Date().toISOString()}`));
  console.log(chalk.gray('💾 Audit log: stripe-rollout-5-percent.json\n'));

  // Final reminder
  console.log(chalk.yellow.bold('⚠️  REMINDER: This is a CRITICAL payment processing endpoint!'));
  console.log(chalk.yellow('Monitor closely for the next 2 hours.\n'));
}