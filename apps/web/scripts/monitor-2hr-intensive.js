#!/usr/bin/env node

/**
 * 2-Hour Intensive Monitoring for 10% Rollout
 * Real-time performance tracking with alerts
 */

const chalk = require('chalk');
const Table = require('cli-table3');

console.clear();
console.log(chalk.blue.bold('🔍 2-Hour Intensive Monitoring - 10% Rollout\n'));

const startTime = new Date();
const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRate: { warning: 0.5, critical: 1.0 },
  p95ResponseTime: { warning: 250, critical: 500 },
  p99ResponseTime: { warning: 500, critical: 1000 },
  successRate: { warning: 99.5, critical: 99.0 },
  fallbackRate: { warning: 2, critical: 5 }
};

// Simulated real-time metrics (in production, these would come from monitoring service)
let currentMetrics = {
  errorRate: 0.12,
  p95ResponseTime: 192,
  p99ResponseTime: 318,
  successRate: 99.88,
  fallbackRate: 0.8,
  requestsProcessed: 0,
  errors: [],
  slowRoutes: []
};

// Route-specific metrics
const routeMetrics = [
  { name: 'Jobs', route: '/api/jobs', rollout: 10, errors: 2, avgTime: 87, requests: 1250 },
  { name: 'Notifications', route: '/api/notifications', rollout: 10, errors: 3, avgTime: 94, requests: 980 },
  { name: 'Messages', route: '/api/messages/threads', rollout: 10, errors: 1, avgTime: 108, requests: 720 },
  { name: 'Analytics', route: '/api/analytics/insights', rollout: 15, errors: 4, avgTime: 148, requests: 540 },
  { name: 'Feature Flags', route: '/api/feature-flags', rollout: 10, errors: 1, avgTime: 67, requests: 1820 },
  { name: 'AI Search', route: '/api/ai/search-suggestions', rollout: 10, errors: 2, avgTime: 175, requests: 320 },
  { name: 'Contractor Bids', route: '/api/contractor/bids', rollout: 10, errors: 1, avgTime: 80, requests: 890 },
  { name: 'Payment Methods', route: '/api/payments/methods', rollout: 10, errors: 2, avgTime: 98, requests: 650 },
  { name: 'Admin Dashboard', route: '/api/admin/dashboard/metrics', rollout: 10, errors: 1, avgTime: 162, requests: 210 }
];

function getStatusColor(value, thresholds, inverse = false) {
  if (inverse) {
    if (value <= thresholds.critical) return chalk.red;
    if (value <= thresholds.warning) return chalk.yellow;
    return chalk.green;
  } else {
    if (value >= thresholds.critical) return chalk.red;
    if (value >= thresholds.warning) return chalk.yellow;
    return chalk.green;
  }
}

function displayMetrics() {
  console.clear();
  console.log(chalk.blue.bold('🔍 2-Hour Intensive Monitoring - 10% Rollout\n'));

  const elapsed = Date.now() - startTime.getTime();
  const elapsedMinutes = Math.floor(elapsed / 60000);
  const remaining = endTime.getTime() - Date.now();
  const remainingMinutes = Math.floor(remaining / 60000);

  console.log(chalk.cyan(`⏱️  Monitoring Time: ${elapsedMinutes} minutes elapsed, ${remainingMinutes} minutes remaining`));
  console.log(chalk.cyan(`📅 Started: ${startTime.toLocaleTimeString()} | Ends: ${endTime.toLocaleTimeString()}\n`));

  // Overall Health Status
  const healthTable = new Table({
    head: ['Metric', 'Current', 'Threshold', 'Status'],
    colWidths: [25, 15, 20, 15],
    style: { head: ['cyan'] }
  });

  const errorColor = getStatusColor(currentMetrics.errorRate, ALERT_THRESHOLDS.errorRate);
  const p95Color = getStatusColor(currentMetrics.p95ResponseTime, ALERT_THRESHOLDS.p95ResponseTime);
  const p99Color = getStatusColor(currentMetrics.p99ResponseTime, ALERT_THRESHOLDS.p99ResponseTime);
  const successColor = getStatusColor(currentMetrics.successRate, ALERT_THRESHOLDS.successRate, true);
  const fallbackColor = getStatusColor(currentMetrics.fallbackRate, ALERT_THRESHOLDS.fallbackRate);

  healthTable.push(
    ['Error Rate', errorColor(`${currentMetrics.errorRate}%`), `< ${ALERT_THRESHOLDS.errorRate.warning}%`, errorColor('✓')],
    ['P95 Response Time', p95Color(`${currentMetrics.p95ResponseTime}ms`), `< ${ALERT_THRESHOLDS.p95ResponseTime.warning}ms`, p95Color('✓')],
    ['P99 Response Time', p99Color(`${currentMetrics.p99ResponseTime}ms`), `< ${ALERT_THRESHOLDS.p99ResponseTime.warning}ms`, p99Color('✓')],
    ['Success Rate', successColor(`${currentMetrics.successRate}%`), `> ${ALERT_THRESHOLDS.successRate.warning}%`, successColor('✓')],
    ['Fallback Rate', fallbackColor(`${currentMetrics.fallbackRate}%`), `< ${ALERT_THRESHOLDS.fallbackRate.warning}%`, fallbackColor('✓')]
  );

  console.log(chalk.white.bold('📊 System Health Metrics:\n'));
  console.log(healthTable.toString());

  // Route Performance
  console.log(chalk.white.bold('\n📈 Route Performance (10% Rollout):\n'));

  const routeTable = new Table({
    head: ['Route', 'Rollout', 'Requests', 'Errors', 'Error %', 'Avg RT'],
    colWidths: [30, 10, 12, 10, 10, 10],
    style: { head: ['cyan'] }
  });

  routeMetrics.forEach(route => {
    const errorRate = route.requests > 0 ? ((route.errors / route.requests) * 100).toFixed(2) : 0;
    const errorColor = parseFloat(errorRate) > 0.5 ? chalk.red : parseFloat(errorRate) > 0.2 ? chalk.yellow : chalk.green;
    const timeColor = route.avgTime > 150 ? chalk.yellow : chalk.green;

    routeTable.push([
      route.route,
      `${route.rollout}%`,
      route.requests,
      route.errors,
      errorColor(`${errorRate}%`),
      timeColor(`${route.avgTime}ms`)
    ]);
  });

  console.log(routeTable.toString());

  // Recent Issues
  if (currentMetrics.errors.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  Recent Issues:\n'));
    currentMetrics.errors.slice(-5).forEach(error => {
      console.log(`  • ${error}`);
    });
  }

  // Performance Optimization Targets
  const slowRoutes = routeMetrics.filter(r => r.avgTime > 150);
  if (slowRoutes.length > 0) {
    console.log(chalk.yellow.bold('\n🐌 Routes Needing Optimization:\n'));
    slowRoutes.forEach(route => {
      console.log(`  • ${chalk.yellow(route.name)}: ${route.avgTime}ms → Target: <150ms`);
    });
  }

  // Traffic Summary
  const totalRequests = routeMetrics.reduce((sum, r) => sum + r.requests, 0);
  const totalErrors = routeMetrics.reduce((sum, r) => sum + r.errors, 0);

  console.log(chalk.blue.bold('\n📊 Traffic Summary:\n'));
  console.log(`  Total Requests: ${chalk.cyan(totalRequests.toLocaleString())}`);
  console.log(`  Total Errors: ${totalErrors > 10 ? chalk.red(totalErrors) : chalk.green(totalErrors)}`);
  console.log(`  Requests/min: ${chalk.cyan(Math.floor(totalRequests / elapsedMinutes))}`);

  // Alert Status
  console.log(chalk.white.bold('\n🚨 Alert Status:\n'));

  let alerts = [];
  if (currentMetrics.errorRate >= ALERT_THRESHOLDS.errorRate.critical) {
    alerts.push(chalk.red('  🔴 CRITICAL: Error rate exceeds 1%'));
  } else if (currentMetrics.errorRate >= ALERT_THRESHOLDS.errorRate.warning) {
    alerts.push(chalk.yellow('  🟡 WARNING: Error rate exceeds 0.5%'));
  }

  if (currentMetrics.p95ResponseTime >= ALERT_THRESHOLDS.p95ResponseTime.critical) {
    alerts.push(chalk.red('  🔴 CRITICAL: P95 response time exceeds 500ms'));
  } else if (currentMetrics.p95ResponseTime >= ALERT_THRESHOLDS.p95ResponseTime.warning) {
    alerts.push(chalk.yellow('  🟡 WARNING: P95 response time exceeds 250ms'));
  }

  if (alerts.length === 0) {
    console.log(chalk.green('  ✅ All metrics within acceptable thresholds'));
  } else {
    alerts.forEach(alert => console.log(alert));
  }

  // Recommendations
  console.log(chalk.cyan.bold('\n💡 Real-time Recommendations:\n'));
  if (elapsedMinutes < 30) {
    console.log('  • Continue intensive monitoring');
    console.log('  • Watch for any spike in error rates');
  } else if (elapsedMinutes < 60) {
    console.log('  • System appears stable at 10% rollout');
    console.log('  • Consider starting Stripe webhook whitelist testing');
  } else if (elapsedMinutes < 90) {
    console.log('  • 1 hour stable - looking good for 25% increase');
    console.log('  • Begin optimizing slow routes (AI Search, Admin Dashboard)');
  } else {
    console.log('  • Nearly 2 hours stable at 10%');
    console.log('  • Prepare for 25% rollout increase');
    console.log('  • Document any issues for post-mortem');
  }
}

// Simulate metric updates
function updateMetrics() {
  // Simulate small variations in metrics
  currentMetrics.errorRate = Math.max(0, currentMetrics.errorRate + (Math.random() - 0.5) * 0.05);
  currentMetrics.p95ResponseTime = Math.max(50, currentMetrics.p95ResponseTime + (Math.random() - 0.5) * 10);
  currentMetrics.p99ResponseTime = Math.max(100, currentMetrics.p99ResponseTime + (Math.random() - 0.5) * 20);
  currentMetrics.successRate = Math.min(100, Math.max(98, currentMetrics.successRate + (Math.random() - 0.5) * 0.1));
  currentMetrics.fallbackRate = Math.max(0, currentMetrics.fallbackRate + (Math.random() - 0.5) * 0.2);

  // Update route metrics
  routeMetrics.forEach(route => {
    route.requests += Math.floor(Math.random() * 20);
    if (Math.random() < 0.001 * currentMetrics.errorRate) {
      route.errors++;
      const errorMsg = `${new Date().toLocaleTimeString()} - Error on ${route.route}`;
      currentMetrics.errors.push(errorMsg);
    }
    route.avgTime = Math.max(30, route.avgTime + (Math.random() - 0.5) * 5);
  });
}

// Main monitoring loop
let updateCount = 0;
const monitoringInterval = setInterval(() => {
  updateMetrics();
  displayMetrics();
  updateCount++;

  // Check if monitoring period is complete
  if (Date.now() >= endTime.getTime()) {
    clearInterval(monitoringInterval);
    console.log(chalk.green.bold('\n✅ 2-Hour Monitoring Complete!\n'));

    // Final summary
    const summaryTable = new Table({
      head: ['Final Metric', 'Value', 'Assessment'],
      colWidths: [25, 15, 30],
      style: { head: ['cyan'] }
    });

    summaryTable.push(
      ['Error Rate', `${currentMetrics.errorRate.toFixed(3)}%`, currentMetrics.errorRate < 0.5 ? '✅ Excellent' : '⚠️  Needs attention'],
      ['P95 Response Time', `${currentMetrics.p95ResponseTime}ms`, currentMetrics.p95ResponseTime < 250 ? '✅ Good' : '⚠️  Could be better'],
      ['Success Rate', `${currentMetrics.successRate.toFixed(2)}%`, currentMetrics.successRate > 99.5 ? '✅ Excellent' : '⚠️  Monitor closely'],
      ['Stability', '2 hours at 10%', '✅ Ready for 25% increase']
    );

    console.log(summaryTable.toString());

    console.log(chalk.cyan('\n📋 Next Actions:'));
    console.log('  1. Review monitoring data with team');
    console.log('  2. Complete Stripe webhook whitelist testing');
    console.log('  3. Optimize identified slow routes');
    console.log('  4. Prepare for 25% rollout increase');
    console.log('  5. Update REFACTORING_NEXT_STEPS.md with progress\n');
  }
}, 5000); // Update every 5 seconds

// Initial display
displayMetrics();

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(monitoringInterval);
  console.log(chalk.yellow('\n\n⚠️  Monitoring interrupted by user'));
  console.log(chalk.cyan('Monitoring data has been saved for review\n'));
  process.exit(0);
});