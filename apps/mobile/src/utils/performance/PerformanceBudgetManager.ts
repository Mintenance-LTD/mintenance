/**
 * Performance Budget Manager
 * Core manager for monitoring and enforcing performance budgets
 */

import { logger } from '../logger';
import { errorMonitoring } from '../errorMonitoring';
import { PerformanceBudgetRepository } from './PerformanceBudgetRepository';
import { PerformanceMetricsCollector } from './PerformanceMetricsCollector';
import {
  PerformanceBudget,
  PerformanceMetrics,
  BudgetViolation,
  PerformanceAlert,
  PerformanceEvent,
  PerformanceReport,
} from './types';

export class PerformanceBudgetManager {
  private repository: PerformanceBudgetRepository;
  private collector: PerformanceMetricsCollector;
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private alertHandlers = new Map<string, (alert: PerformanceAlert) => void>();

  constructor(
    repository?: PerformanceBudgetRepository,
    collector?: PerformanceMetricsCollector
  ) {
    this.repository = repository || new PerformanceBudgetRepository();
    this.collector = collector || new PerformanceMetricsCollector();

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.collector.addEventListener('budget_manager', (event: PerformanceEvent) => {
      this.handlePerformanceEvent(event);
    });
  }

  /**
   * Set performance budget for a service
   */
  setBudget(budget: PerformanceBudget): void {
    this.repository.setBudget(budget);

    logger.info('PerformanceBudgetManager', 'Budget configured', {
      serviceName: budget.serviceName,
      responseTime: budget.budgets.responseTime,
      memoryUsage: budget.budgets.memoryUsage,
    });
  }

  /**
   * Get performance budget for a service
   */
  getBudget(serviceName: string): PerformanceBudget | undefined {
    return this.repository.getBudget(serviceName);
  }

  /**
   * Record performance metrics for a service
   */
  async recordMetrics(
    serviceName: string,
    responseTime: number,
    memoryUsage?: number,
    cpuUsage?: number,
    apiCallsPerMinute?: number,
    errorRate?: number,
    downloadSize?: number
  ): Promise<void> {
    const budget = this.repository.getBudget(serviceName);
    if (!budget) {
      logger.warn('PerformanceBudgetManager', `No performance budget found for service: ${serviceName}`);
      return;
    }

    // Collect additional metrics
    const collectedMetrics = await this.collector.collectMetrics(serviceName);

    const metrics: PerformanceMetrics = {
      serviceName,
      timestamp: Date.now(),
      responseTime,
      memoryUsage: memoryUsage || collectedMetrics.memoryUsage || 0,
      cpuUsage: cpuUsage || collectedMetrics.cpuUsage || 0,
      apiCallsPerMinute: apiCallsPerMinute || collectedMetrics.apiCallsPerMinute || 0,
      errorRate: errorRate || collectedMetrics.errorRate || 0,
      downloadSize: downloadSize || collectedMetrics.downloadSize || 0,
      budgetViolations: [],
    };

    // Check for budget violations
    metrics.budgetViolations = this.collector.checkBudgetViolations(metrics, budget);

    // Store metrics
    this.repository.storeMetrics(metrics);

    // Handle violations
    if (metrics.budgetViolations.length > 0) {
      await this.handleBudgetViolations(metrics);
    }

    // Log performance data
    this.logPerformanceData(metrics);

    // Emit performance event
    this.collector.emitPerformanceEvent({
      type: metrics.budgetViolations.length > 0 ? 'budget_violation' : 'performance_improvement',
      serviceName,
      timestamp: metrics.timestamp,
      data: {
        metrics,
        violations: metrics.budgetViolations,
      },
    });
  }

  /**
   * Handle budget violations
   */
  private async handleBudgetViolations(metrics: PerformanceMetrics): Promise<void> {
    for (const violation of metrics.budgetViolations) {
      const alert: PerformanceAlert = {
        serviceName: metrics.serviceName,
        metric: violation.metric,
        severity: violation.severity,
        message: this.generateViolationMessage(violation, metrics.serviceName),
        timestamp: metrics.timestamp,
        actual: violation.actual,
        budget: violation.budget,
        violationPercentage: violation.violationPercentage,
      };

      // Store alert
      this.repository.storeAlert(alert);

      // Trigger alert handlers
      await this.triggerAlertHandlers(alert);

      // Log violation
      logger.warn('PerformanceBudgetManager', 'Budget violation detected', {
        serviceName: metrics.serviceName,
        metric: violation.metric,
        severity: violation.severity,
        actual: violation.actual,
        budget: violation.budget,
        violationPercentage: violation.violationPercentage,
      });

      // Report to error monitoring if critical
      if (violation.severity === 'critical') {
        errorMonitoring.reportError(
          new Error(`Critical performance budget violation: ${alert.message}`),
          {
            serviceName: metrics.serviceName,
            metric: violation.metric,
            violationPercentage: violation.violationPercentage,
          }
        );
      }
    }
  }

  /**
   * Generate violation message
   */
  private generateViolationMessage(violation: BudgetViolation, serviceName: string): string {
    const { metric, actual, budget, violationPercentage } = violation;

    const metricDisplay = this.getMetricDisplayName(metric);
    const unit = this.getMetricUnit(metric);

    return `${serviceName} ${metricDisplay} exceeded budget: ${actual.toFixed(2)}${unit} > ${budget.toFixed(2)}${unit} (+${violationPercentage.toFixed(1)}%)`;
  }

  /**
   * Get metric display name
   */
  private getMetricDisplayName(metric: string): string {
    const displayNames: Record<string, string> = {
      responseTime: 'response time',
      memoryUsage: 'memory usage',
      cpuUsage: 'CPU usage',
      apiCalls: 'API calls/min',
      errorRate: 'error rate',
      downloadSize: 'download size',
    };
    return displayNames[metric] || metric;
  }

  /**
   * Get metric unit
   */
  private getMetricUnit(metric: string): string {
    const units: Record<string, string> = {
      responseTime: 'ms',
      memoryUsage: 'MB',
      cpuUsage: '%',
      apiCalls: '/min',
      errorRate: '%',
      downloadSize: 'KB',
    };
    return units[metric] || '';
  }

  /**
   * Trigger alert handlers
   */
  private async triggerAlertHandlers(alert: PerformanceAlert): Promise<void> {
    const handlerPromises = Array.from(this.alertHandlers.entries()).map(async ([name, handler]) => {
      try {
        await handler(alert);
      } catch (error) {
        logger.error('PerformanceBudgetManager', `Alert handler ${name} failed`, error);
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  /**
   * Log performance data
   */
  private logPerformanceData(metrics: PerformanceMetrics): void {
    const logLevel = metrics.budgetViolations.length > 0 ? 'warn' : 'debug';

    logger[logLevel]('PerformanceBudgetManager', 'Performance metrics recorded', {
      serviceName: metrics.serviceName,
      responseTime: metrics.responseTime,
      memoryUsage: metrics.memoryUsage,
      errorRate: metrics.errorRate,
      violations: metrics.budgetViolations.length,
    });
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoring) {
      logger.warn('PerformanceBudgetManager', 'Monitoring already started');
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.performScheduledMonitoring();
    }, intervalMs);

    logger.info('PerformanceBudgetManager', 'Continuous monitoring started', {
      intervalMs,
    });
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) {
      logger.warn('PerformanceBudgetManager', 'Monitoring not running');
      return;
    }

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('PerformanceBudgetManager', 'Continuous monitoring stopped');
  }

  /**
   * Perform scheduled monitoring
   */
  private async performScheduledMonitoring(): Promise<void> {
    try {
      const budgets = this.repository.getAllBudgets();

      for (const [serviceName] of budgets) {
        // Collect current metrics for each service
        const metrics = await this.collector.collectMetrics(serviceName);

        if (metrics.responseTime !== undefined) {
          await this.recordMetrics(
            serviceName,
            metrics.responseTime,
            metrics.memoryUsage,
            metrics.cpuUsage,
            metrics.apiCallsPerMinute,
            metrics.errorRate,
            metrics.downloadSize
          );
        }
      }

      // Cleanup old data
      this.repository.cleanup();
    } catch (error) {
      logger.error('PerformanceBudgetManager', 'Scheduled monitoring failed', error);
    }
  }

  /**
   * Handle performance events
   */
  private handlePerformanceEvent(event: PerformanceEvent): void {
    logger.info('PerformanceBudgetManager', 'Performance event received', {
      type: event.type,
      serviceName: event.serviceName,
    });

    // Additional event processing can be added here
  }

  /**
   * Register alert handler
   */
  onAlert(name: string, handler: (alert: PerformanceAlert) => void): void {
    this.alertHandlers.set(name, handler);
    logger.info('PerformanceBudgetManager', 'Alert handler registered', { name });
  }

  /**
   * Remove alert handler
   */
  removeAlertHandler(name: string): void {
    this.alertHandlers.delete(name);
    logger.info('PerformanceBudgetManager', 'Alert handler removed', { name });
  }

  /**
   * Get performance report for a service
   */
  getPerformanceReport(serviceName: string, timeRangeMs?: number): PerformanceReport {
    return this.repository.generateReport(serviceName, timeRangeMs);
  }

  /**
   * Get all performance alerts
   */
  getAlerts(serviceName?: string, severity?: 'warning' | 'critical'): PerformanceAlert[] {
    if (serviceName) {
      return this.repository.getAlerts(serviceName, severity);
    }

    const allAlerts: PerformanceAlert[] = [];
    const budgets = this.repository.getAllBudgets();

    for (const [service] of budgets) {
      allAlerts.push(...this.repository.getAlerts(service, severity));
    }

    return allAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance metrics
   */
  getMetrics(serviceName: string, limit?: number): PerformanceMetrics[] {
    return this.repository.getMetrics(serviceName, limit);
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.monitoring;
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    monitoring: boolean;
    budgetCount: number;
    alertCount: number;
    lastUpdate: number;
  } {
    const budgets = this.repository.getAllBudgets();
    const alerts = this.getAlerts();

    return {
      monitoring: this.monitoring,
      budgetCount: budgets.size,
      alertCount: alerts.length,
      lastUpdate: Date.now(),
    };
  }
}