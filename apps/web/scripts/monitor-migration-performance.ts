#!/usr/bin/env ts-node

/**
 * Real-time Performance Monitoring for Migrated Routes
 * Monitors production/staging performance metrics and alerts on issues
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import Table from 'cli-table3';
import { EventEmitter } from 'events';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const MONITORING_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLDS = {
  errorRate: 0.01, // 1%
  p95ResponseTime: 500, // 500ms
  p99ResponseTime: 1000, // 1000ms
  availability: 0.999, // 99.9%
};

interface ControllerMetrics {
  controller: string;
  totalRequests: number;
  newControllerRequests: number;
  oldControllerRequests: number;
  errors: number;
  errorRate: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  fallbackCount: number;
  lastHourTrend: 'improving' | 'stable' | 'degrading';
}

interface Alert {
  severity: 'info' | 'warning' | 'critical';
  controller: string;
  message: string;
  timestamp: Date;
  metric?: string;
  value?: number;
  threshold?: number;
}

class PerformanceMonitor extends EventEmitter {
  private supabase: any;
  private metrics: Map<string, ControllerMetrics> = new Map();
  private alerts: Alert[] = [];
  private isMonitoring = false;

  constructor() {
    super();
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async startMonitoring(): Promise<void> {
    console.log(chalk.blue.bold('🔍 Starting Performance Monitoring\n'));
    console.log(chalk.gray(`Monitoring interval: ${MONITORING_INTERVAL / 1000}s`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    this.isMonitoring = true;

    // Initial metrics fetch
    await this.fetchMetrics();

    // Set up real-time subscription
    this.setupRealtimeSubscription();

    // Periodic metrics update
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      await this.fetchMetrics();
      this.analyzeMetrics();
      this.displayDashboard();
    }, MONITORING_INTERVAL);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nStopping monitoring...'));
      this.isMonitoring = false;
      process.exit(0);
    });
  }

  private setupRealtimeSubscription(): void {
    // Subscribe to controller usage logs for real-time updates
    this.supabase
      .channel('controller-usage')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'controller_usage_logs'
      }, (payload: unknown) => {
        this.handleRealtimeUpdate(payload.new);
      })
      .subscribe();

    console.log(chalk.green('✓ Real-time monitoring established\n'));
  }

  private handleRealtimeUpdate(log: unknown): void {
    // Process real-time log entry
    const controller = log.module;
    const metrics = this.metrics.get(controller) || this.createEmptyMetrics(controller);

    // Update counts
    metrics.totalRequests++;
    if (log.is_new_controller) {
      metrics.newControllerRequests++;
    } else {
      metrics.oldControllerRequests++;
    }

    // Check for fallback
    if (log.metadata?.error && log.is_new_controller) {
      metrics.fallbackCount++;
      this.createAlert('warning', controller, 'Fallback triggered', 'fallback');
    }

    this.metrics.set(controller, metrics);
  }

  private async fetchMetrics(): Promise<void> {
    try {
      // Fetch controller usage statistics
      const { data: stats, error } = await this.supabase
        .rpc('get_controller_statistics', {
          time_window: '1 hour'
        });

      if (error) throw error;

      // Process statistics
      for (const stat of stats || []) {
        const metrics = this.processStatistics(stat);
        this.metrics.set(stat.controller, metrics);
      }

      // Fetch response time metrics
      await this.fetchResponseTimeMetrics();

      // Fetch error rates
      await this.fetchErrorRates();

    } catch (error) {
      console.error(chalk.red('Error fetching metrics:'), error);
    }
  }

  private async fetchResponseTimeMetrics(): Promise<void> {
    const { data, error } = await this.supabase
      .from('controller_usage_logs')
      .select('module, metadata')
      .gte('logged_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('logged_at', { ascending: false });

    if (error) return;

    // Calculate response time percentiles
    const responseTimesByController = new Map<string, number[]>();

    for (const log of data || []) {
      if (log.metadata?.responseTime) {
        const times = responseTimesByController.get(log.module) || [];
        times.push(log.metadata.responseTime);
        responseTimesByController.set(log.module, times);
      }
    }

    // Update metrics with percentiles
    for (const [controller, times] of responseTimesByController) {
      const metrics = this.metrics.get(controller);
      if (metrics && times.length > 0) {
        times.sort((a, b) => a - b);
        metrics.avgResponseTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        metrics.p50ResponseTime = times[Math.floor(times.length * 0.5)];
        metrics.p95ResponseTime = times[Math.floor(times.length * 0.95)];
        metrics.p99ResponseTime = times[Math.floor(times.length * 0.99)];
      }
    }
  }

  private async fetchErrorRates(): Promise<void> {
    const { data, error } = await this.supabase
      .from('controller_usage_logs')
      .select('module, metadata')
      .gte('logged_at', new Date(Date.now() - 3600000).toISOString())
      .not('metadata->error', 'is', null);

    if (error) return;

    // Count errors by controller
    const errorCounts = new Map<string, number>();
    for (const log of data || []) {
      errorCounts.set(log.module, (errorCounts.get(log.module) || 0) + 1);
    }

    // Update error rates
    for (const [controller, errorCount] of errorCounts) {
      const metrics = this.metrics.get(controller);
      if (metrics) {
        metrics.errors = errorCount;
        metrics.errorRate = metrics.totalRequests > 0
          ? errorCount / metrics.totalRequests
          : 0;
      }
    }
  }

  private processStatistics(stat: unknown): ControllerMetrics {
    return {
      controller: stat.controller,
      totalRequests: stat.total_requests || 0,
      newControllerRequests: stat.new_controller_requests || 0,
      oldControllerRequests: stat.old_controller_requests || 0,
      errors: stat.errors || 0,
      errorRate: stat.error_rate || 0,
      avgResponseTime: stat.avg_response_time || 0,
      p50ResponseTime: stat.p50_response_time || 0,
      p95ResponseTime: stat.p95_response_time || 0,
      p99ResponseTime: stat.p99_response_time || 0,
      fallbackCount: stat.fallback_count || 0,
      lastHourTrend: this.determineTrend(stat)
    };
  }

  private determineTrend(stat: unknown): 'improving' | 'stable' | 'degrading' {
    // Compare current hour vs previous hour
    if (stat.current_hour_errors < stat.previous_hour_errors) {
      return 'improving';
    } else if (stat.current_hour_errors > stat.previous_hour_errors) {
      return 'degrading';
    }
    return 'stable';
  }

  private createEmptyMetrics(controller: string): ControllerMetrics {
    return {
      controller,
      totalRequests: 0,
      newControllerRequests: 0,
      oldControllerRequests: 0,
      errors: 0,
      errorRate: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      fallbackCount: 0,
      lastHourTrend: 'stable'
    };
  }

  private analyzeMetrics(): void {
    this.alerts = []; // Clear previous alerts

    for (const [controller, metrics] of this.metrics) {
      // Check error rate threshold
      if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
        this.createAlert(
          'critical',
          controller,
          `Error rate exceeded: ${(metrics.errorRate * 100).toFixed(2)}%`,
          'errorRate',
          metrics.errorRate,
          ALERT_THRESHOLDS.errorRate
        );
      }

      // Check p95 response time
      if (metrics.p95ResponseTime > ALERT_THRESHOLDS.p95ResponseTime) {
        this.createAlert(
          'warning',
          controller,
          `P95 response time high: ${metrics.p95ResponseTime}ms`,
          'p95ResponseTime',
          metrics.p95ResponseTime,
          ALERT_THRESHOLDS.p95ResponseTime
        );
      }

      // Check p99 response time
      if (metrics.p99ResponseTime > ALERT_THRESHOLDS.p99ResponseTime) {
        this.createAlert(
          'critical',
          controller,
          `P99 response time critical: ${metrics.p99ResponseTime}ms`,
          'p99ResponseTime',
          metrics.p99ResponseTime,
          ALERT_THRESHOLDS.p99ResponseTime
        );
      }

      // Check fallback rate
      const fallbackRate = metrics.newControllerRequests > 0
        ? metrics.fallbackCount / metrics.newControllerRequests
        : 0;

      if (fallbackRate > 0.05) { // More than 5% fallbacks
        this.createAlert(
          'warning',
          controller,
          `High fallback rate: ${(fallbackRate * 100).toFixed(2)}%`,
          'fallbackRate',
          fallbackRate,
          0.05
        );
      }

      // Check trend
      if (metrics.lastHourTrend === 'degrading') {
        this.createAlert(
          'info',
          controller,
          'Performance degrading in last hour',
          'trend'
        );
      }
    }
  }

  private createAlert(
    severity: 'info' | 'warning' | 'critical',
    controller: string,
    message: string,
    metric?: string,
    value?: number,
    threshold?: number
  ): void {
    const alert: Alert = {
      severity,
      controller,
      message,
      timestamp: new Date(),
      metric,
      value,
      threshold
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // Log critical alerts immediately
    if (severity === 'critical') {
      console.log(chalk.red.bold(`\n🚨 CRITICAL ALERT: ${controller} - ${message}\n`));
    }
  }

  private displayDashboard(): void {
    console.clear();
    console.log(chalk.blue.bold('📊 Migration Performance Dashboard\n'));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

    // Controller metrics table
    const metricsTable = new Table({
      head: [
        'Controller',
        'Total Req',
        'New/Old',
        'Error %',
        'Avg RT',
        'P95 RT',
        'P99 RT',
        'Fallbacks',
        'Trend'
      ],
      colWidths: [25, 12, 12, 10, 10, 10, 10, 12, 10],
      style: { head: ['cyan'] }
    });

    for (const [controller, metrics] of this.metrics) {
      const newOldRatio = `${metrics.newControllerRequests}/${metrics.oldControllerRequests}`;
      const errorRate = `${(metrics.errorRate * 100).toFixed(2)}%`;

      const errorRateColor = metrics.errorRate > ALERT_THRESHOLDS.errorRate
        ? chalk.red(errorRate)
        : chalk.green(errorRate);

      const p95Color = metrics.p95ResponseTime > ALERT_THRESHOLDS.p95ResponseTime
        ? chalk.yellow(`${metrics.p95ResponseTime}ms`)
        : chalk.green(`${metrics.p95ResponseTime}ms`);

      const p99Color = metrics.p99ResponseTime > ALERT_THRESHOLDS.p99ResponseTime
        ? chalk.red(`${metrics.p99ResponseTime}ms`)
        : chalk.green(`${metrics.p99ResponseTime}ms`);

      const trendIcon = metrics.lastHourTrend === 'improving' ? '📈'
        : metrics.lastHourTrend === 'degrading' ? '📉'
        : '➡️';

      metricsTable.push([
        controller,
        metrics.totalRequests,
        newOldRatio,
        errorRateColor,
        `${metrics.avgResponseTime}ms`,
        p95Color,
        p99Color,
        metrics.fallbackCount,
        trendIcon
      ]);
    }

    console.log(metricsTable.toString());

    // Display alerts
    if (this.alerts.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Active Alerts:\n'));

      const alertsTable = new Table({
        head: ['Severity', 'Controller', 'Message', 'Time'],
        colWidths: [12, 25, 50, 20],
        style: { head: ['yellow'] }
      });

      for (const alert of this.alerts.slice(0, 5)) { // Show latest 5 alerts
        const severityColor = alert.severity === 'critical' ? chalk.red('CRITICAL')
          : alert.severity === 'warning' ? chalk.yellow('WARNING')
          : chalk.blue('INFO');

        alertsTable.push([
          severityColor,
          alert.controller,
          alert.message,
          alert.timestamp.toLocaleTimeString()
        ]);
      }

      console.log(alertsTable.toString());
    }

    // Summary statistics
    console.log(chalk.blue.bold('\n📈 Summary Statistics:\n'));

    const totalRequests = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.totalRequests, 0);

    const totalNewRequests = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.newControllerRequests, 0);

    const adoptionRate = totalRequests > 0
      ? (totalNewRequests / totalRequests * 100).toFixed(2)
      : 0;

    const totalErrors = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.errors, 0);

    const overallErrorRate = totalRequests > 0
      ? (totalErrors / totalRequests * 100).toFixed(3)
      : 0;

    console.log(`Total Requests: ${chalk.cyan(totalRequests)}`);
    console.log(`New Controller Adoption: ${chalk.cyan(adoptionRate + '%')}`);
    console.log(`Overall Error Rate: ${parseFloat(overallErrorRate.toString()) > 1 ? chalk.red(overallErrorRate + '%') : chalk.green(overallErrorRate + '%')}`);
    console.log(`Active Controllers: ${chalk.cyan(this.metrics.size)}`);
    console.log(`Active Alerts: ${this.alerts.length > 0 ? chalk.yellow(this.alerts.length) : chalk.green('0')}`);

    // Recommendations
    this.displayRecommendations();
  }

  private displayRecommendations(): void {
    console.log(chalk.blue.bold('\n💡 Recommendations:\n'));

    const hasHighErrors = Array.from(this.metrics.values())
      .some(m => m.errorRate > ALERT_THRESHOLDS.errorRate);

    const hasSlowResponse = Array.from(this.metrics.values())
      .some(m => m.p95ResponseTime > ALERT_THRESHOLDS.p95ResponseTime);

    const hasHighFallbacks = Array.from(this.metrics.values())
      .some(m => m.fallbackCount > m.newControllerRequests * 0.05);

    if (hasHighErrors) {
      console.log(chalk.red('⚠ High error rates detected. Do not increase rollout.'));
      console.log(chalk.gray('  → Investigate error logs and fix issues first'));
    } else if (hasSlowResponse) {
      console.log(chalk.yellow('⚠ Some routes have slow response times.'));
      console.log(chalk.gray('  → Consider performance optimization before increasing rollout'));
    } else if (hasHighFallbacks) {
      console.log(chalk.yellow('⚠ High fallback rates indicate instability.'));
      console.log(chalk.gray('  → Debug new controller failures before proceeding'));
    } else {
      console.log(chalk.green('✓ All metrics within acceptable thresholds.'));
      console.log(chalk.gray('  → Safe to gradually increase rollout percentage'));
    }

    // Calculate suggested rollout increase
    const currentAdoption = this.calculateCurrentAdoption();
    if (currentAdoption < 25 && !hasHighErrors && !hasHighFallbacks) {
      console.log(chalk.cyan(`\n📊 Suggested next rollout: ${currentAdoption * 2}%`));
    }
  }

  private calculateCurrentAdoption(): number {
    const total = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.totalRequests, 0);

    const newController = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.newControllerRequests, 0);

    return total > 0 ? Math.round((newController / total) * 100) : 0;
  }
}

// Run monitor
(async () => {
  const monitor = new PerformanceMonitor();

  // Set up alert notifications
  monitor.on('alert', (alert: Alert) => {
    // In production, this could send to Slack, PagerDuty, etc.
    if (alert.severity === 'critical') {
      console.log('\x07'); // System beep for critical alerts
    }
  });

  await monitor.startMonitoring();
})();