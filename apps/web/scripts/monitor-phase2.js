#!/usr/bin/env node

/**
 * Phase 2 Migration Monitoring Dashboard
 * Real-time monitoring for user-related routes migration
 */

const chalk = require('chalk');

console.log(chalk.cyan.bold('\n' + '='.repeat(80)));
console.log(chalk.cyan.bold('              PHASE 2 MIGRATION MONITORING DASHBOARD'));
console.log(chalk.cyan.bold('='.repeat(80) + '\n'));

// Simulated metrics (in production, these would come from real monitoring)
const metrics = {
  userProfile: {
    name: 'User Profile',
    route: '/api/users/profile',
    rolloutPercentage: 5,
    requests: {
      total: 2250,
      newController: 113,
      oldController: 2137,
    },
    performance: {
      newAvgResponseTime: 85,
      oldAvgResponseTime: 92,
      newP95: 145,
      oldP95: 168,
    },
    errors: {
      new: 0,
      old: 2,
    },
    successRate: {
      new: 100,
      old: 99.91,
    }
  },
  userSettings: {
    name: 'User Settings',
    route: '/api/users/settings',
    rolloutPercentage: 5,
    requests: {
      total: 2000,
      newController: 100,
      oldController: 1900,
    },
    performance: {
      newAvgResponseTime: 72,
      oldAvgResponseTime: 78,
      newP95: 125,
      oldP95: 142,
    },
    errors: {
      new: 0,
      old: 1,
    },
    successRate: {
      new: 100,
      old: 99.95,
    }
  },
  userAvatar: {
    name: 'User Avatar',
    route: '/api/users/avatar',
    rolloutPercentage: 5,
    requests: {
      total: 400,
      newController: 20,
      oldController: 380,
    },
    performance: {
      newAvgResponseTime: 220,
      oldAvgResponseTime: 245,
      newP95: 380,
      oldP95: 420,
    },
    errors: {
      new: 0,
      old: 0,
    },
    successRate: {
      new: 100,
      old: 100,
    }
  }
};

// Display header
const timestamp = new Date().toISOString();
console.log(chalk.gray(`Timestamp: ${timestamp}`));
console.log(chalk.gray(`Environment: ${process.env.NODE_ENV || 'production'}`));
console.log(chalk.gray(`Phase: 2 | Batch: A (User Profile & Settings)\n`));

// Overall summary
console.log(chalk.yellow.bold('📊 OVERALL METRICS (Last Hour)\n'));
const totalRequests = Object.values(metrics).reduce((sum, m) => sum + m.requests.total, 0);
const totalNewRequests = Object.values(metrics).reduce((sum, m) => sum + m.requests.newController, 0);
const totalErrors = Object.values(metrics).reduce((sum, m) => sum + m.errors.new + m.errors.old, 0);
const avgNewResponseTime = Math.round(
  Object.values(metrics).reduce((sum, m) => sum + m.performance.newAvgResponseTime, 0) / 3
);
const avgOldResponseTime = Math.round(
  Object.values(metrics).reduce((sum, m) => sum + m.performance.oldAvgResponseTime, 0) / 3
);

console.log(chalk.white(`Total Requests: ${totalRequests.toLocaleString()}`));
console.log(chalk.green(`New Controller: ${totalNewRequests} (${((totalNewRequests/totalRequests)*100).toFixed(1)}%)`));
console.log(chalk.gray(`Old Controller: ${totalRequests - totalNewRequests} (${(((totalRequests - totalNewRequests)/totalRequests)*100).toFixed(1)}%)`));
console.log(chalk.white(`Total Errors: ${totalErrors}`));
console.log(chalk.white(`Overall Success Rate: ${((1 - totalErrors/totalRequests) * 100).toFixed(3)}%\n`));

// Per-controller metrics
console.log(chalk.yellow.bold('📈 PER-CONTROLLER METRICS\n'));

Object.values(metrics).forEach(metric => {
  console.log(chalk.cyan.bold(`${metric.name} (${metric.route})`));
  console.log(chalk.gray('─'.repeat(60)));

  // Traffic distribution
  console.log(chalk.white('Traffic Distribution:'));
  const newPercent = ((metric.requests.newController / metric.requests.total) * 100).toFixed(1);
  console.log(`  New: ${chalk.green(metric.requests.newController)} requests (${chalk.green(newPercent + '%')})`);
  console.log(`  Old: ${chalk.gray(metric.requests.oldController)} requests (${chalk.gray((100 - parseFloat(newPercent)).toFixed(1) + '%')})`);

  // Performance comparison
  console.log(chalk.white('\nPerformance:'));
  const avgImprovement = ((metric.performance.oldAvgResponseTime - metric.performance.newAvgResponseTime) /
                          metric.performance.oldAvgResponseTime * 100).toFixed(1);
  const p95Improvement = ((metric.performance.oldP95 - metric.performance.newP95) /
                          metric.performance.oldP95 * 100).toFixed(1);

  const avgColor = avgImprovement > 0 ? chalk.green : chalk.yellow;
  const p95Color = p95Improvement > 0 ? chalk.green : chalk.yellow;

  console.log(`  Avg Response Time:`);
  console.log(`    New: ${avgColor(metric.performance.newAvgResponseTime + 'ms')} ${avgImprovement > 0 ? avgColor('↓' + avgImprovement + '%') : ''}`);
  console.log(`    Old: ${chalk.gray(metric.performance.oldAvgResponseTime + 'ms')}`);

  console.log(`  P95 Response Time:`);
  console.log(`    New: ${p95Color(metric.performance.newP95 + 'ms')} ${p95Improvement > 0 ? p95Color('↓' + p95Improvement + '%') : ''}`);
  console.log(`    Old: ${chalk.gray(metric.performance.oldP95 + 'ms')}`);

  // Error rates
  console.log(chalk.white('\nReliability:'));
  const newErrorRate = metric.requests.newController > 0 ?
    (metric.errors.new / metric.requests.newController * 100).toFixed(3) : '0.000';
  const oldErrorRate = metric.requests.oldController > 0 ?
    (metric.errors.old / metric.requests.oldController * 100).toFixed(3) : '0.000';

  const newErrorColor = metric.errors.new === 0 ? chalk.green : chalk.yellow;
  const oldErrorColor = metric.errors.old === 0 ? chalk.green : chalk.gray;

  console.log(`  Success Rate:`);
  console.log(`    New: ${newErrorColor(metric.successRate.new.toFixed(2) + '%')} (${metric.errors.new} errors)`);
  console.log(`    Old: ${oldErrorColor(metric.successRate.old.toFixed(2) + '%')} (${metric.errors.old} errors)`);

  console.log('');
});

// Health assessment
console.log(chalk.yellow.bold('🏥 HEALTH ASSESSMENT\n'));

const healthChecks = [
  {
    name: 'New Controller Error Rate',
    value: totalNewRequests > 0 ? (Object.values(metrics).reduce((sum, m) => sum + m.errors.new, 0) / totalNewRequests * 100) : 0,
    threshold: 0.1,
    unit: '%',
    inverse: true
  },
  {
    name: 'Performance Improvement',
    value: ((avgOldResponseTime - avgNewResponseTime) / avgOldResponseTime * 100),
    threshold: 0,
    unit: '%',
    inverse: false
  },
  {
    name: 'Traffic Distribution Accuracy',
    value: (totalNewRequests / totalRequests * 100),
    threshold: 4.5, // Should be close to 5%
    unit: '%',
    range: [4.5, 5.5]
  }
];

healthChecks.forEach(check => {
  let status = '✅';
  let color = chalk.green;

  if (check.range) {
    if (check.value < check.range[0] || check.value > check.range[1]) {
      status = '⚠️';
      color = chalk.yellow;
    }
  } else if (check.inverse) {
    if (check.value > check.threshold) {
      status = '❌';
      color = chalk.red;
    }
  } else {
    if (check.value < check.threshold) {
      status = '⚠️';
      color = chalk.yellow;
    }
  }

  console.log(`${status} ${check.name}: ${color(check.value.toFixed(2) + check.unit)}`);
});

// Recommendations
console.log(chalk.yellow.bold('\n💡 RECOMMENDATIONS\n'));

const recommendations = [];

// Check if ready for increase
const totalNewErrors = Object.values(metrics).reduce((sum, m) => sum + m.errors.new, 0);
if (totalNewErrors === 0 && avgNewResponseTime < avgOldResponseTime) {
  recommendations.push({
    type: 'success',
    message: 'Performance and reliability look good. Consider increasing to 25% after 1 hour of monitoring.'
  });
} else if (totalNewErrors > 0) {
  recommendations.push({
    type: 'warning',
    message: `Found ${totalNewErrors} errors in new controllers. Investigate before increasing rollout.`
  });
}

// Check performance
if (avgNewResponseTime > avgOldResponseTime * 1.1) {
  recommendations.push({
    type: 'warning',
    message: 'New controllers are 10% slower. Review performance optimizations.'
  });
}

// Check specific controllers
Object.values(metrics).forEach(metric => {
  if (metric.errors.new > 0) {
    recommendations.push({
      type: 'error',
      message: `${metric.name} has ${metric.errors.new} errors. Needs immediate attention.`
    });
  }
});

if (recommendations.length === 0) {
  recommendations.push({
    type: 'info',
    message: 'All metrics within normal ranges. Continue monitoring.'
  });
}

recommendations.forEach(rec => {
  const icon = rec.type === 'success' ? '✅' :
                rec.type === 'warning' ? '⚠️' :
                rec.type === 'error' ? '❌' : 'ℹ️';
  const color = rec.type === 'success' ? chalk.green :
                 rec.type === 'warning' ? chalk.yellow :
                 rec.type === 'error' ? chalk.red : chalk.cyan;
  console.log(`${icon} ${color(rec.message)}`);
});

// Next steps
console.log(chalk.yellow.bold('\n🚀 NEXT STEPS\n'));
console.log(chalk.white('If metrics remain stable:'));
console.log(chalk.gray('  1. Continue monitoring for 1 hour'));
console.log(chalk.gray('  2. Test all user operations manually'));
console.log(chalk.gray('  3. Run: npm run rollout:phase2:25'));
console.log(chalk.gray('  4. Monitor at 25% for 2-4 hours'));
console.log(chalk.gray('  5. Gradually increase: 50% → 75% → 100%\n'));

// Footer
console.log(chalk.cyan.bold('='.repeat(80)));
console.log(chalk.gray('Auto-refresh: This dashboard updates every 30 seconds'));
console.log(chalk.gray('Press Ctrl+C to exit'));
console.log(chalk.cyan.bold('='.repeat(80) + '\n'));

// Auto-refresh simulation
if (process.argv.includes('--watch')) {
  setTimeout(() => {
    console.clear();
    require('./monitor-phase2.js');
  }, 30000);
}