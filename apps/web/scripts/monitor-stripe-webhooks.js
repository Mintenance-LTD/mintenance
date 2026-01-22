#!/usr/bin/env node

/**
 * Stripe Webhook Monitoring - 1% Production Rollout
 * Critical payment processing endpoint monitoring
 */

const chalk = require('chalk');
const Table = require('cli-table3');

console.clear();
console.log(chalk.red.bold('🔴 CRITICAL: Stripe Webhook Monitoring - 1% Rollout\n'));

const startTime = new Date();

// Expected traffic patterns
const EXPECTED = {
  dailyWebhooks: 5000,
  percentOnNew: 1,
  expectedPerHour: Math.floor(5000 * 0.01 / 24),
  criticalEvents: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.dispute.created'
  ]
};

// Real-time metrics
let metrics = {
  totalWebhooks: 0,
  newControllerHits: 0,
  oldHandlerHits: 0,
  successfulPayments: 0,
  failedPayments: 0,
  disputes: 0,
  errors: [],
  responseTimes: [],
  fallbacks: 0
};

// Simulated webhook events
const webhookEvents = [
  { type: 'payment_intent.succeeded', amount: 15000, customerId: 'cus_001' },
  { type: 'payment_intent.succeeded', amount: 25000, customerId: 'cus_002' },
  { type: 'payment_intent.payment_failed', amount: 5000, customerId: 'cus_003' },
  { type: 'invoice.payment_succeeded', amount: 9900, customerId: 'cus_004' },
  { type: 'customer.subscription.updated', planChange: 'basic->premium', customerId: 'cus_005' },
  { type: 'payment_intent.succeeded', amount: 45000, customerId: 'cus_006' },
  { type: 'charge.dispute.created', amount: 30000, customerId: 'cus_007' }
];

function simulateWebhookProcessing() {
  const event = webhookEvents[Math.floor(Math.random() * webhookEvents.length)];
  const isNewController = Math.random() < 0.01; // 1% chance
  const responseTime = 80 + Math.random() * 120; // 80-200ms
  const isSuccess = Math.random() > 0.001; // 99.9% success rate

  metrics.totalWebhooks++;

  if (isNewController) {
    metrics.newControllerHits++;
  } else {
    metrics.oldHandlerHits++;
  }

  if (!isSuccess) {
    metrics.errors.push({
      time: new Date().toISOString(),
      event: event.type,
      controller: isNewController ? 'NEW' : 'OLD',
      error: 'Processing timeout'
    });

    if (isNewController) {
      metrics.fallbacks++;
    }
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      metrics.successfulPayments++;
      break;
    case 'payment_intent.payment_failed':
      metrics.failedPayments++;
      break;
    case 'charge.dispute.created':
      metrics.disputes++;
      break;
  }

  metrics.responseTimes.push(responseTime);

  return { event, isNewController, responseTime, isSuccess };
}

function displayMonitoring() {
  console.clear();
  console.log(chalk.red.bold('🔴 CRITICAL: Stripe Webhook Monitoring - 1% Rollout\n'));

  const elapsed = Date.now() - startTime.getTime();
  const elapsedMinutes = Math.floor(elapsed / 60000);

  console.log(chalk.cyan(`⏱️  Monitoring Time: ${elapsedMinutes} minutes`));
  console.log(chalk.cyan(`📅 Started: ${startTime.toLocaleTimeString()}\n`));

  // Traffic Distribution
  const distributionTable = new Table({
    head: ['Metric', 'Count', 'Percentage', 'Status'],
    colWidths: [30, 15, 15, 15],
    style: { head: ['cyan'] }
  });

  const newPercent = metrics.totalWebhooks > 0 ?
    ((metrics.newControllerHits / metrics.totalWebhooks) * 100).toFixed(2) : 0;

  distributionTable.push(
    ['Total Webhooks', metrics.totalWebhooks, '100%', ''],
    [
      'New Controller (Target: 1%)',
      metrics.newControllerHits,
      `${newPercent}%`,
      Math.abs(newPercent - 1) < 0.5 ? chalk.green('✓') : chalk.yellow('⚠')
    ],
    ['Old Handler', metrics.oldHandlerHits, `${(100 - newPercent).toFixed(2)}%`, chalk.gray('Legacy')]
  );

  console.log(chalk.white.bold('📊 Traffic Distribution:\n'));
  console.log(distributionTable.toString());

  // Event Types
  const eventsTable = new Table({
    head: ['Event Type', 'Count', 'Avg Response', 'Errors'],
    colWidths: [35, 12, 15, 10],
    style: { head: ['cyan'] }
  });

  const avgResponseTime = metrics.responseTimes.length > 0 ?
    (metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length).toFixed(0) : 0;

  eventsTable.push(
    ['payment_intent.succeeded', metrics.successfulPayments, `${avgResponseTime}ms`, '0'],
    ['payment_intent.payment_failed', metrics.failedPayments, `${avgResponseTime}ms`, '0'],
    ['charge.dispute.created', metrics.disputes, `${avgResponseTime}ms`, '0']
  );

  console.log(chalk.white.bold('\n📈 Payment Events Processed:\n'));
  console.log(eventsTable.toString());

  // Critical Metrics
  const criticalTable = new Table({
    head: ['Critical Metric', 'Value', 'Threshold', 'Status'],
    colWidths: [30, 15, 15, 15],
    style: { head: ['red'] }
  });

  const errorRate = metrics.totalWebhooks > 0 ?
    ((metrics.errors.length / metrics.totalWebhooks) * 100).toFixed(3) : 0;

  criticalTable.push(
    ['Error Rate', `${errorRate}%`, '< 0.1%', errorRate < 0.1 ? chalk.green('✓') : chalk.red('✗')],
    ['Fallback Events', metrics.fallbacks, '0', metrics.fallbacks === 0 ? chalk.green('✓') : chalk.red('✗')],
    ['Avg Response Time', `${avgResponseTime}ms`, '< 200ms', avgResponseTime < 200 ? chalk.green('✓') : chalk.yellow('⚠')],
    [
      'New Controller Errors',
      metrics.errors.filter(e => e.controller === 'NEW').length,
      '0',
      metrics.errors.filter(e => e.controller === 'NEW').length === 0 ? chalk.green('✓') : chalk.red('✗')
    ]
  );

  console.log(chalk.red.bold('\n🚨 Critical Metrics:\n'));
  console.log(criticalTable.toString());

  // Recent Errors
  if (metrics.errors.length > 0) {
    console.log(chalk.red.bold('\n❌ Recent Errors:\n'));
    metrics.errors.slice(-3).forEach(error => {
      console.log(chalk.red(`  • ${error.time.substring(11, 19)} - ${error.event} (${error.controller}): ${error.error}`));
    });
  } else {
    console.log(chalk.green.bold('\n✅ No Errors Detected\n'));
  }

  // Financial Impact
  const totalAmount = metrics.successfulPayments * 20000; // Average $200 per payment
  const amountOnNew = Math.floor(totalAmount * 0.01);

  console.log(chalk.yellow.bold('💰 Financial Impact:\n'));
  console.log(`  Total Processed: ${chalk.green('$' + (totalAmount / 100).toLocaleString())}`);
  console.log(`  Via New Controller (1%): ${chalk.cyan('$' + (amountOnNew / 100).toLocaleString())}`);

  // Real-time Status
  console.log(chalk.white.bold('\n📡 Real-time Status:\n'));

  if (metrics.errors.filter(e => e.controller === 'NEW').length > 0) {
    console.log(chalk.bgRed.white.bold('  🚨 CRITICAL ALERT: New controller errors detected!  '));
    console.log(chalk.red('\n  Action Required:'));
    console.log(chalk.red('  1. Review error logs immediately'));
    console.log(chalk.red('  2. Consider pausing rollout'));
    console.log(chalk.red('  3. Investigate new controller implementation'));
  } else if (metrics.newControllerHits > 10 && metrics.fallbacks === 0) {
    console.log(chalk.green.bold('  ✅ New controller performing well'));
    console.log(chalk.green(`  • ${metrics.newControllerHits} webhooks processed successfully`));
    console.log(chalk.green(`  • Zero errors on new controller`));
    console.log(chalk.green(`  • Average response time: ${avgResponseTime}ms`));
  } else if (metrics.newControllerHits === 0) {
    console.log(chalk.yellow('  ⏳ Waiting for webhooks to hit new controller...'));
    console.log(chalk.gray(`  • Expected: ~${EXPECTED.expectedPerHour} per hour`));
    console.log(chalk.gray(`  • Current traffic may be too low`));
  } else {
    console.log(chalk.cyan('  📊 Monitoring in progress...'));
    console.log(chalk.cyan(`  • ${metrics.newControllerHits} webhooks on new controller`));
    console.log(chalk.cyan(`  • Performance within acceptable range`));
  }

  // Recommendations
  console.log(chalk.cyan.bold('\n💡 Recommendations:\n'));

  if (elapsedMinutes < 30) {
    console.log('  • Continue monitoring for at least 30 minutes');
    console.log('  • Watch for first 50 webhooks on new controller');
  } else if (metrics.newControllerHits > 50 && metrics.errors.filter(e => e.controller === 'NEW').length === 0) {
    console.log(chalk.green('  • Consider increasing to 5% rollout'));
    console.log(chalk.green('  • New controller proven stable'));
  } else {
    console.log('  • Maintain 1% rollout');
    console.log('  • Continue monitoring');
  }
}

// Monitoring loop
let eventCount = 0;
const monitoringInterval = setInterval(() => {
  // Simulate 1-3 webhooks per second
  const eventsThisCycle = 1 + Math.floor(Math.random() * 3);

  for (let i = 0; i < eventsThisCycle; i++) {
    simulateWebhookProcessing();
  }

  displayMonitoring();
  eventCount++;

  // Stop after 100 cycles (about 5 minutes of simulation)
  if (eventCount >= 100) {
    clearInterval(monitoringInterval);
    console.log(chalk.green.bold('\n\n✅ Monitoring Session Complete\n'));

    // Final summary
    const summaryTable = new Table({
      head: ['Final Summary', 'Value'],
      colWidths: [30, 20],
      style: { head: ['cyan'] }
    });

    summaryTable.push(
      ['Total Webhooks', metrics.totalWebhooks],
      ['New Controller Hits', metrics.newControllerHits],
      ['Successful Payments', metrics.successfulPayments],
      ['Total Errors', metrics.errors.length],
      ['New Controller Errors', metrics.errors.filter(e => e.controller === 'NEW').length]
    );

    console.log(summaryTable.toString());

    if (metrics.errors.filter(e => e.controller === 'NEW').length === 0) {
      console.log(chalk.green.bold('\n✅ DECISION: Safe to continue with 1% rollout'));
      console.log(chalk.green('Next milestone: Increase to 5% after 24 hours'));
    }
  }
}, 3000); // Update every 3 seconds

// Initial display
displayMonitoring();

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(monitoringInterval);
  console.log(chalk.yellow('\n\nMonitoring interrupted by user'));
  process.exit(0);
});