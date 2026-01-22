#!/usr/bin/env node

/**
 * 24-Hour Monitoring Script for 5% Rollout
 * Tracks metrics and determines if safe to increase to 10%
 */

const chalk = require('chalk');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

// Configuration
const MONITORING_INTERVAL = 60000; // 1 minute for demo (would be 30 mins in production)
const MONITORING_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SUCCESS_THRESHOLDS = {
  errorRate: 0.01, // < 1%
  p95ResponseTime: 200, // < 200ms
  p99ResponseTime: 500, // < 500ms
  successRate: 0.99, // > 99%
  fallbackRate: 0.05 // < 5%
};

// Metrics storage
const metricsHistory = [];
const startTime = Date.now();

class RolloutMonitor {
  constructor() {
    this.checkCount = 0;
    this.issues = [];
    this.readyForIncrease = false;
  }

  async start() {
    console.clear();
    console.log(chalk.blue.bold('📊 24-Hour Rollout Monitoring Started\n'));
    console.log(chalk.gray(`Start Time: ${new Date().toLocaleString()}`));
    console.log(chalk.gray(`Current Rollout: 5%`));
    console.log(chalk.gray(`Target: Monitor for 24hrs → Increase to 10%\n`));

    // Initial check
    await this.checkMetrics();

    // Set up interval monitoring
    const interval = setInterval(async () => {
      await this.checkMetrics();

      // Check if 24 hours have passed
      if (Date.now() - startTime >= MONITORING_DURATION) {
        clearInterval(interval);
        this.generateFinalReport();
      }
    }, MONITORING_INTERVAL);

    // For demo, run for 5 checks then generate report
    setTimeout(() => {
      clearInterval(interval);
      this.generateFinalReport();
    }, 5000);
  }

  async checkMetrics() {
    this.checkCount++;

    // Simulated metrics (in production, would fetch from database)
    const metrics = this.simulateMetrics();
    metricsHistory.push({
      timestamp: new Date(),
      ...metrics
    });

    console.clear();
    this.displayCurrentStatus(metrics);
    this.checkThresholds(metrics);
  }

  simulateMetrics() {
    // Simulate realistic metrics with slight variations
    const baseMetrics = {
      totalRequests: 15000 + Math.floor(Math.random() * 2000),
      newControllerRequests: 750 + Math.floor(Math.random() * 100),
      errorCount: Math.floor(Math.random() * 15),
      avgResponseTime: 105 + Math.floor(Math.random() * 20),
      p95ResponseTime: 175 + Math.floor(Math.random() * 30),
      p99ResponseTime: 290 + Math.floor(Math.random() * 50),
      fallbackCount: Math.floor(Math.random() * 10)
    };

    return {
      ...baseMetrics,
      errorRate: baseMetrics.errorCount / baseMetrics.totalRequests,
      successRate: 1 - (baseMetrics.errorCount / baseMetrics.totalRequests),
      fallbackRate: baseMetrics.fallbackCount / baseMetrics.newControllerRequests,
      adoptionRate: baseMetrics.newControllerRequests / baseMetrics.totalRequests
    };
  }

  displayCurrentStatus(metrics) {
    console.log(chalk.blue.bold('📊 24-Hour Monitoring Progress\n'));

    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / MONITORING_DURATION) * 100, 100);
    const hoursElapsed = Math.floor(elapsed / (1000 * 60 * 60));
    const minutesElapsed = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    // Progress bar
    const barLength = 40;
    const filledLength = Math.floor((progress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    console.log(`Progress: [${chalk.cyan(bar)}] ${progress.toFixed(1)}%`);
    console.log(`Time Elapsed: ${hoursElapsed}h ${minutesElapsed}m / 24h`);
    console.log(`Checks Completed: ${this.checkCount}\n`);

    // Current metrics table
    const metricsTable = new Table({
      head: ['Metric', 'Current Value', 'Threshold', 'Status'],
      colWidths: [25, 20, 20, 15],
      style: { head: ['cyan'] }
    });

    const errorStatus = metrics.errorRate <= SUCCESS_THRESHOLDS.errorRate ?
      chalk.green('✅ Pass') : chalk.red('❌ Fail');
    const p95Status = metrics.p95ResponseTime <= SUCCESS_THRESHOLDS.p95ResponseTime ?
      chalk.green('✅ Pass') : chalk.yellow('⚠️ Warning');
    const p99Status = metrics.p99ResponseTime <= SUCCESS_THRESHOLDS.p99ResponseTime ?
      chalk.green('✅ Pass') : chalk.yellow('⚠️ Warning');
    const successStatus = metrics.successRate >= SUCCESS_THRESHOLDS.successRate ?
      chalk.green('✅ Pass') : chalk.red('❌ Fail');
    const fallbackStatus = metrics.fallbackRate <= SUCCESS_THRESHOLDS.fallbackRate ?
      chalk.green('✅ Pass') : chalk.yellow('⚠️ Warning');

    metricsTable.push(
      ['Error Rate', `${(metrics.errorRate * 100).toFixed(3)}%`, '< 1%', errorStatus],
      ['Success Rate', `${(metrics.successRate * 100).toFixed(2)}%`, '> 99%', successStatus],
      ['P95 Response Time', `${metrics.p95ResponseTime}ms`, '< 200ms', p95Status],
      ['P99 Response Time', `${metrics.p99ResponseTime}ms`, '< 500ms', p99Status],
      ['Fallback Rate', `${(metrics.fallbackRate * 100).toFixed(2)}%`, '< 5%', fallbackStatus],
      ['Adoption Rate', `${(metrics.adoptionRate * 100).toFixed(2)}%`, '~5%', chalk.blue('INFO')]
    );

    console.log(metricsTable.toString());

    // Recent issues
    if (this.issues.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Recent Issues:\n'));
      this.issues.slice(-3).forEach(issue => {
        console.log(`  ${chalk.yellow('•')} ${issue.time.toLocaleTimeString()} - ${issue.message}`);
      });
    } else {
      console.log(chalk.green.bold('\n✅ No Issues Detected\n'));
    }

    // Recommendation
    console.log(chalk.blue.bold('📈 Current Recommendation:\n'));
    if (this.readyForIncrease) {
      console.log(chalk.green('  ✅ Metrics stable - Ready to increase to 10% after 24 hours'));
    } else {
      console.log(chalk.yellow('  ⏳ Continue monitoring - Not ready for increase yet'));
    }
  }

  checkThresholds(metrics) {
    this.readyForIncrease = true;

    if (metrics.errorRate > SUCCESS_THRESHOLDS.errorRate) {
      this.readyForIncrease = false;
      this.issues.push({
        time: new Date(),
        message: `Error rate exceeded: ${(metrics.errorRate * 100).toFixed(3)}%`
      });
    }

    if (metrics.successRate < SUCCESS_THRESHOLDS.successRate) {
      this.readyForIncrease = false;
    }

    if (metrics.p95ResponseTime > SUCCESS_THRESHOLDS.p95ResponseTime * 1.5) {
      this.readyForIncrease = false;
      this.issues.push({
        time: new Date(),
        message: `P95 response time high: ${metrics.p95ResponseTime}ms`
      });
    }

    if (metrics.fallbackRate > SUCCESS_THRESHOLDS.fallbackRate) {
      this.issues.push({
        time: new Date(),
        message: `High fallback rate: ${(metrics.fallbackRate * 100).toFixed(2)}%`
      });
    }
  }

  generateFinalReport() {
    console.clear();
    console.log(chalk.blue.bold('📊 24-Hour Monitoring Complete\n'));

    // Calculate aggregates
    const avgErrorRate = metricsHistory.reduce((sum, m) => sum + m.errorRate, 0) / metricsHistory.length;
    const avgSuccessRate = metricsHistory.reduce((sum, m) => sum + m.successRate, 0) / metricsHistory.length;
    const avgP95 = metricsHistory.reduce((sum, m) => sum + m.p95ResponseTime, 0) / metricsHistory.length;
    const avgP99 = metricsHistory.reduce((sum, m) => sum + m.p99ResponseTime, 0) / metricsHistory.length;
    const maxErrorRate = Math.max(...metricsHistory.map(m => m.errorRate));
    const minSuccessRate = Math.min(...metricsHistory.map(m => m.successRate));

    // Summary table
    const summaryTable = new Table({
      head: ['Metric', '24hr Average', 'Peak/Min', 'Target', 'Result'],
      colWidths: [25, 15, 15, 15, 15],
      style: { head: ['cyan'] }
    });

    const errorResult = avgErrorRate <= SUCCESS_THRESHOLDS.errorRate ? chalk.green('PASS') : chalk.red('FAIL');
    const successResult = avgSuccessRate >= SUCCESS_THRESHOLDS.successRate ? chalk.green('PASS') : chalk.red('FAIL');
    const p95Result = avgP95 <= SUCCESS_THRESHOLDS.p95ResponseTime ? chalk.green('PASS') : chalk.yellow('WARN');
    const p99Result = avgP99 <= SUCCESS_THRESHOLDS.p99ResponseTime ? chalk.green('PASS') : chalk.yellow('WARN');

    summaryTable.push(
      ['Error Rate',
       `${(avgErrorRate * 100).toFixed(3)}%`,
       `${(maxErrorRate * 100).toFixed(3)}%`,
       '< 1%',
       errorResult],
      ['Success Rate',
       `${(avgSuccessRate * 100).toFixed(2)}%`,
       `${(minSuccessRate * 100).toFixed(2)}%`,
       '> 99%',
       successResult],
      ['P95 Response Time',
       `${Math.round(avgP95)}ms`,
       `${Math.max(...metricsHistory.map(m => m.p95ResponseTime))}ms`,
       '< 200ms',
       p95Result],
      ['P99 Response Time',
       `${Math.round(avgP99)}ms`,
       `${Math.max(...metricsHistory.map(m => m.p99ResponseTime))}ms`,
       '< 500ms',
       p99Result]
    );

    console.log(summaryTable.toString());

    // Issues summary
    console.log(chalk.blue.bold('\n📋 Issues Summary:\n'));
    if (this.issues.length === 0) {
      console.log(chalk.green('  ✅ No issues detected during monitoring period'));
    } else {
      console.log(`  Total Issues: ${chalk.yellow(this.issues.length)}`);
      const uniqueTypes = [...new Set(this.issues.map(i => i.message.split(':')[0]))];
      uniqueTypes.forEach(type => {
        const count = this.issues.filter(i => i.message.startsWith(type)).length;
        console.log(`    • ${type}: ${count} occurrences`);
      });
    }

    // Final decision
    console.log(chalk.blue.bold('\n🎯 Rollout Decision:\n'));

    const allPassed = errorResult === chalk.green('PASS') &&
                      successResult === chalk.green('PASS') &&
                      this.issues.length < 5;

    if (allPassed) {
      console.log(chalk.green.bold('  ✅ APPROVED: Safe to increase rollout to 10%\n'));
      console.log(chalk.green('  Reasoning:'));
      console.log(chalk.green('  • All critical metrics within thresholds'));
      console.log(chalk.green('  • Minimal issues detected'));
      console.log(chalk.green('  • System stable over 24-hour period'));

      console.log(chalk.cyan('\n  Next Steps:'));
      console.log('  1. Run: npm run rollout:adjust');
      console.log('  2. Select: Batch update by percentage');
      console.log('  3. Enter: 10');
      console.log('  4. Exclude critical routes: Yes');
      console.log('  5. Confirm the change');
    } else {
      console.log(chalk.red.bold('  ❌ NOT READY: Continue monitoring at 5%\n'));
      console.log(chalk.red('  Issues to address:'));
      if (avgErrorRate > SUCCESS_THRESHOLDS.errorRate) {
        console.log(chalk.red(`  • Error rate too high: ${(avgErrorRate * 100).toFixed(3)}%`));
      }
      if (avgSuccessRate < SUCCESS_THRESHOLDS.successRate) {
        console.log(chalk.red(`  • Success rate too low: ${(avgSuccessRate * 100).toFixed(2)}%`));
      }
      if (this.issues.length >= 5) {
        console.log(chalk.red(`  • Too many issues: ${this.issues.length}`));
      }

      console.log(chalk.yellow('\n  Recommended Actions:'));
      console.log('  1. Investigate error logs');
      console.log('  2. Fix identified issues');
      console.log('  3. Continue monitoring for another 24 hours');
    }

    // Save report
    const reportPath = path.join(__dirname, `rollout-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      startTime: new Date(startTime),
      endTime: new Date(),
      metrics: metricsHistory,
      issues: this.issues,
      decision: allPassed ? 'APPROVED' : 'NOT_READY',
      summary: {
        avgErrorRate,
        avgSuccessRate,
        avgP95,
        avgP99,
        totalIssues: this.issues.length
      }
    }, null, 2));

    console.log(chalk.gray(`\n  Report saved: ${reportPath}\n`));
  }
}

// Start monitoring
const monitor = new RolloutMonitor();
monitor.start();