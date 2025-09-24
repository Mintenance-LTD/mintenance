/**
 * Performance Budget Repository
 * Handles storage and retrieval of performance budgets and metrics
 */

import { logger } from '../logger';
import {
  PerformanceBudget,
  PerformanceMetrics,
  ServiceBudgetConfiguration,
  PerformanceAlert,
  PerformanceReport,
} from './types';

export class PerformanceBudgetRepository {
  private budgets = new Map<string, PerformanceBudget>();
  private metrics = new Map<string, PerformanceMetrics[]>();
  private alerts = new Map<string, PerformanceAlert[]>();
  private configurations = new Map<string, ServiceBudgetConfiguration>();

  constructor() {
    this.initializeDefaultBudgets();
  }

  /**
   * Initialize default performance budgets for all services
   */
  private initializeDefaultBudgets(): void {
    // AI/ML Services Budget
    this.setBudget({
      serviceName: 'ml_service',
      budgets: {
        responseTime: 500, // 500ms for ML inference
        memoryUsage: 200, // 200MB for model loading
        cpuUsage: 70, // 70% max CPU usage
        apiCalls: 1000, // 1000 calls per minute
        errorRate: 5, // 5% max error rate
        downloadSize: 50, // 50KB max response
      },
      alertThresholds: {
        warning: 80, // Alert at 80% of budget
        critical: 95, // Critical at 95% of budget
      },
    });

    // Payment Service Budget
    this.setBudget({
      serviceName: 'payment',
      budgets: {
        responseTime: 2000, // 2s for payment processing
        memoryUsage: 100, // 100MB memory limit
        cpuUsage: 50, // 50% max CPU usage
        apiCalls: 500, // 500 calls per minute
        errorRate: 1, // 1% max error rate (critical)
        downloadSize: 20, // 20KB max response
      },
      alertThresholds: {
        warning: 80,
        critical: 90,
      },
    });

    // Authentication Service Budget
    this.setBudget({
      serviceName: 'auth',
      budgets: {
        responseTime: 1000, // 1s for auth
        memoryUsage: 50, // 50MB memory limit
        cpuUsage: 30, // 30% max CPU usage
        apiCalls: 2000, // 2000 calls per minute
        errorRate: 2, // 2% max error rate
        downloadSize: 10, // 10KB max response
      },
      alertThresholds: {
        warning: 75,
        critical: 90,
      },
    });

    // Database Operations Budget
    this.setBudget({
      serviceName: 'database',
      budgets: {
        responseTime: 200, // 200ms for DB queries
        memoryUsage: 300, // 300MB for DB operations
        cpuUsage: 60, // 60% max CPU usage
        apiCalls: 5000, // 5000 queries per minute
        errorRate: 1, // 1% max error rate
        downloadSize: 100, // 100KB max response
      },
      alertThresholds: {
        warning: 85,
        critical: 95,
      },
    });

    // File Upload/Download Budget
    this.setBudget({
      serviceName: 'file_service',
      budgets: {
        responseTime: 5000, // 5s for file operations
        memoryUsage: 500, // 500MB for file processing
        cpuUsage: 80, // 80% max CPU usage
        apiCalls: 100, // 100 operations per minute
        errorRate: 3, // 3% max error rate
        downloadSize: 1024, // 1MB max file size
      },
      alertThresholds: {
        warning: 80,
        critical: 90,
      },
    });

    logger.info('PerformanceBudgetRepository', 'Default budgets initialized', {
      budgetCount: this.budgets.size,
    });
  }

  /**
   * Set performance budget for a service
   */
  setBudget(budget: PerformanceBudget): void {
    this.budgets.set(budget.serviceName, budget);
    logger.info('PerformanceBudgetRepository', 'Budget set for service', {
      serviceName: budget.serviceName,
      budgets: budget.budgets,
    });
  }

  /**
   * Get performance budget for a service
   */
  getBudget(serviceName: string): PerformanceBudget | undefined {
    return this.budgets.get(serviceName);
  }

  /**
   * Get all performance budgets
   */
  getAllBudgets(): Map<string, PerformanceBudget> {
    return new Map(this.budgets);
  }

  /**
   * Store performance metrics
   */
  storeMetrics(metrics: PerformanceMetrics): void {
    if (!this.metrics.has(metrics.serviceName)) {
      this.metrics.set(metrics.serviceName, []);
    }

    const serviceMetrics = this.metrics.get(metrics.serviceName)!;
    serviceMetrics.push(metrics);

    // Keep only last 100 metrics per service for memory efficiency
    if (serviceMetrics.length > 100) {
      serviceMetrics.shift();
    }

    logger.debug('PerformanceBudgetRepository', 'Metrics stored', {
      serviceName: metrics.serviceName,
      timestamp: metrics.timestamp,
      violationCount: metrics.budgetViolations.length,
    });
  }

  /**
   * Get performance metrics for a service
   */
  getMetrics(serviceName: string, limit?: number): PerformanceMetrics[] {
    const metrics = this.metrics.get(serviceName) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get metrics for all services
   */
  getAllMetrics(): Map<string, PerformanceMetrics[]> {
    return new Map(this.metrics);
  }

  /**
   * Store performance alert
   */
  storeAlert(alert: PerformanceAlert): void {
    if (!this.alerts.has(alert.serviceName)) {
      this.alerts.set(alert.serviceName, []);
    }

    const serviceAlerts = this.alerts.get(alert.serviceName)!;
    serviceAlerts.push(alert);

    // Keep only last 50 alerts per service
    if (serviceAlerts.length > 50) {
      serviceAlerts.shift();
    }

    logger.warn('PerformanceBudgetRepository', 'Alert stored', {
      serviceName: alert.serviceName,
      severity: alert.severity,
      metric: alert.metric,
    });
  }

  /**
   * Get alerts for a service
   */
  getAlerts(serviceName: string, severity?: 'warning' | 'critical'): PerformanceAlert[] {
    const alerts = this.alerts.get(serviceName) || [];
    return severity ? alerts.filter(alert => alert.severity === severity) : alerts;
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    // Clean metrics
    for (const [serviceName, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(serviceName, filteredMetrics);
      cleanedCount += metrics.length - filteredMetrics.length;
    }

    // Clean alerts
    for (const [serviceName, alerts] of this.alerts.entries()) {
      const filteredAlerts = alerts.filter(a => a.timestamp > cutoffTime);
      this.alerts.set(serviceName, filteredAlerts);
      cleanedCount += alerts.length - filteredAlerts.length;
    }

    if (cleanedCount > 0) {
      logger.info('PerformanceBudgetRepository', 'Cleaned old data', {
        cleanedCount,
        cutoffTime: new Date(cutoffTime).toISOString(),
      });
    }
  }

  /**
   * Generate performance report for a service
   */
  generateReport(serviceName: string, timeRangeMs: number = 60 * 60 * 1000): PerformanceReport {
    const endTime = Date.now();
    const startTime = endTime - timeRangeMs;
    const metrics = this.getMetrics(serviceName)
      .filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

    const alerts = this.getAlerts(serviceName)
      .filter(a => a.timestamp >= startTime && a.timestamp <= endTime);

    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    const avgResponseTime = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
      : 0;

    const peakMemory = metrics.length > 0
      ? Math.max(...metrics.map(m => m.memoryUsage))
      : 0;

    const avgErrorRate = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length
      : 0;

    return {
      serviceName,
      timeRange: { start: startTime, end: endTime },
      summary: {
        totalMetrics: metrics.length,
        violations: { warning: warningCount, critical: criticalCount },
        averageResponseTime: avgResponseTime,
        peakMemoryUsage: peakMemory,
        errorRate: avgErrorRate,
      },
      trends: {
        responseTime: metrics.map(m => m.responseTime),
        memoryUsage: metrics.map(m => m.memoryUsage),
        errorRate: metrics.map(m => m.errorRate),
      },
      recommendations: this.generateRecommendations(serviceName, metrics, alerts),
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    serviceName: string,
    metrics: PerformanceMetrics[],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];
    const budget = this.getBudget(serviceName);

    if (!budget || metrics.length === 0) {
      return recommendations;
    }

    // Check for consistent high response times
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
    if (avgResponseTime > budget.budgets.responseTime * 0.8) {
      recommendations.push(`Consider optimizing ${serviceName} response time (avg: ${avgResponseTime.toFixed(2)}ms)`);
    }

    // Check for memory issues
    const peakMemory = Math.max(...metrics.map(m => m.memoryUsage));
    if (peakMemory > budget.budgets.memoryUsage * 0.9) {
      recommendations.push(`Monitor ${serviceName} memory usage (peak: ${peakMemory.toFixed(2)}MB)`);
    }

    // Check for high error rates
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    if (avgErrorRate > budget.budgets.errorRate * 0.5) {
      recommendations.push(`Investigate ${serviceName} error rate (avg: ${avgErrorRate.toFixed(2)}%)`);
    }

    // Check for frequent critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    if (criticalAlerts > 5) {
      recommendations.push(`Address critical performance issues in ${serviceName} (${criticalAlerts} alerts)`);
    }

    return recommendations;
  }
}