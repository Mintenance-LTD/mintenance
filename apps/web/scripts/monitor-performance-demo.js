#!/usr/bin/env node

/**
 * Performance Monitor Demo
 * Simulates real-time monitoring dashboard
 */

const chalk = require('chalk');
const Table = require('cli-table3');

console.clear();
console.log(chalk.blue.bold('📊 Migration Performance Dashboard\n'));
console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

// Simulated metrics data
const metricsData = {
  JOBS: { total: 2450, newController: 123, oldController: 2327, errors: 2, avgRT: 85, p95RT: 145, p99RT: 210, fallbacks: 1, trend: 'stable' },
  NOTIFICATIONS: { total: 1890, newController: 95, oldController: 1795, errors: 3, avgRT: 92, p95RT: 155, p99RT: 230, fallbacks: 0, trend: 'improving' },
  MESSAGES: { total: 1560, newController: 78, oldController: 1482, errors: 1, avgRT: 105, p95RT: 180, p99RT: 260, fallbacks: 1, trend: 'stable' },
  ANALYTICS: { total: 890, newController: 89, oldController: 801, errors: 2, avgRT: 145, p95RT: 220, p99RT: 340, fallbacks: 2, trend: 'stable' },
  WEBHOOKS: { total: 456, newController: 0, oldController: 456, errors: 0, avgRT: 120, p95RT: 180, p99RT: 250, fallbacks: 0, trend: 'stable' },
  FEATURE_FLAGS: { total: 3200, newController: 160, oldController: 3040, errors: 3, avgRT: 65, p95RT: 95, p99RT: 140, fallbacks: 0, trend: 'improving' },
  AI_SEARCH: { total: 670, newController: 34, oldController: 636, errors: 1, avgRT: 180, p95RT: 280, p99RT: 420, fallbacks: 1, trend: 'stable' },
  BIDS: { total: 1230, newController: 62, oldController: 1168, errors: 1, avgRT: 78, p95RT: 120, p99RT: 180, fallbacks: 0, trend: 'improving' },
  PAYMENTS: { total: 890, newController: 45, oldController: 845, errors: 1, avgRT: 95, p95RT: 150, p99RT: 220, fallbacks: 1, trend: 'stable' },
  ADMIN: { total: 340, newController: 17, oldController: 323, errors: 0, avgRT: 165, p95RT: 240, p99RT: 380, fallbacks: 0, trend: 'stable' }
};

// Controller Metrics Table
const metricsTable = new Table({
  head: ['Controller', 'Total Req', 'New/Old', 'Error %', 'Avg RT', 'P95 RT', 'P99 RT', 'Fallbacks', 'Trend'],
  colWidths: [15, 12, 12, 10, 10, 10, 10, 12, 10],
  style: { head: ['cyan'] }
});

Object.entries(metricsData).forEach(([controller, metrics]) => {
  const newOldRatio = `${metrics.newController}/${metrics.oldController}`;
  const errorRate = ((metrics.errors / metrics.total) * 100).toFixed(2) + '%';

  const errorRateColor = parseFloat(errorRate) > 1 ? chalk.red(errorRate) :
                         parseFloat(errorRate) > 0.5 ? chalk.yellow(errorRate) :
                         chalk.green(errorRate);

  const p95Color = metrics.p95RT > 500 ? chalk.red(`${metrics.p95RT}ms`) :
                    metrics.p95RT > 200 ? chalk.yellow(`${metrics.p95RT}ms`) :
                    chalk.green(`${metrics.p95RT}ms`);

  const p99Color = metrics.p99RT > 1000 ? chalk.red(`${metrics.p99RT}ms`) :
                    metrics.p99RT > 500 ? chalk.yellow(`${metrics.p99RT}ms`) :
                    chalk.green(`${metrics.p99RT}ms`);

  const trendIcon = metrics.trend === 'improving' ? '📈' :
                     metrics.trend === 'degrading' ? '📉' :
                     '➡️';

  metricsTable.push([
    controller,
    metrics.total,
    newOldRatio,
    errorRateColor,
    `${metrics.avgRT}ms`,
    p95Color,
    p99Color,
    metrics.fallbacks,
    trendIcon
  ]);
});

console.log(metricsTable.toString());

// Active Alerts
console.log(chalk.yellow.bold('\n⚠️  Active Alerts:\n'));

const alertsTable = new Table({
  head: ['Severity', 'Controller', 'Message', 'Time'],
  colWidths: [12, 15, 45, 20],
  style: { head: ['yellow'] }
});

const alerts = [
  { severity: 'WARNING', controller: 'AI_SEARCH', message: 'P95 response time high: 280ms', time: '10:35:22 PM' },
  { severity: 'INFO', controller: 'ANALYTICS', message: 'Fallback rate: 0.22%', time: '10:34:15 PM' },
  { severity: 'INFO', controller: 'FEATURE_FLAGS', message: 'Performance improving in last hour', time: '10:30:00 PM' }
];

alerts.forEach(alert => {
  const severityColor = alert.severity === 'CRITICAL' ? chalk.red('CRITICAL') :
                         alert.severity === 'WARNING' ? chalk.yellow('WARNING') :
                         chalk.blue('INFO');

  alertsTable.push([severityColor, alert.controller, alert.message, alert.time]);
});

console.log(alertsTable.toString());

// Summary Statistics
console.log(chalk.blue.bold('\n📈 Summary Statistics:\n'));

const totalRequests = Object.values(metricsData).reduce((sum, m) => sum + m.total, 0);
const totalNewRequests = Object.values(metricsData).reduce((sum, m) => sum + m.newController, 0);
const adoptionRate = ((totalNewRequests / totalRequests) * 100).toFixed(2);
const totalErrors = Object.values(metricsData).reduce((sum, m) => sum + m.errors, 0);
const overallErrorRate = ((totalErrors / totalRequests) * 100).toFixed(3);

console.log(`Total Requests: ${chalk.cyan(totalRequests.toLocaleString())}`);
console.log(`New Controller Adoption: ${chalk.cyan(adoptionRate + '%')}`);
console.log(`Overall Error Rate: ${parseFloat(overallErrorRate) > 1 ? chalk.red(overallErrorRate + '%') : chalk.green(overallErrorRate + '%')}`);
console.log(`Active Controllers: ${chalk.cyan('10')}`);
console.log(`Active Alerts: ${alerts.length > 0 ? chalk.yellow(alerts.length) : chalk.green('0')}`);

// Recommendations
console.log(chalk.blue.bold('\n💡 Recommendations:\n'));

const hasHighErrors = Object.values(metricsData).some(m => (m.errors / m.total) > 0.01);
const hasSlowResponse = Object.values(metricsData).some(m => m.p95RT > 500);

if (!hasHighErrors && !hasSlowResponse) {
  console.log(chalk.green('✓ All metrics within acceptable thresholds.'));
  console.log(chalk.gray('  → Safe to gradually increase rollout percentage'));
  console.log(chalk.cyan(`\n📊 Suggested next rollout: 10%`));
} else if (hasSlowResponse) {
  console.log(chalk.yellow('⚠ Some routes have slow response times.'));
  console.log(chalk.gray('  → Consider performance optimization before increasing rollout'));
} else {
  console.log(chalk.red('⚠ High error rates detected. Do not increase rollout.'));
}

// Live update simulation
console.log(chalk.gray('\n─'.repeat(50)));
console.log(chalk.gray('Monitoring active. Updates every 30 seconds.'));
console.log(chalk.gray('Press Ctrl+C to stop monitoring.\n'));

// Simulate real-time updates
let updateCount = 0;
const interval = setInterval(() => {
  updateCount++;
  process.stdout.write(chalk.gray(`\rLast update: ${new Date().toLocaleTimeString()} (Update #${updateCount})`));

  // Stop after 3 updates for demo
  if (updateCount >= 3) {
    clearInterval(interval);
    console.log(chalk.yellow('\n\nMonitoring stopped.'));
    process.exit(0);
  }
}, 2000);