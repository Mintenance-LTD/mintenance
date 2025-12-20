/**
 * Performance Metrics Collector
 * Collects and processes performance metrics from various sources
 */

import { logger } from '../logger';
import { memoryManager } from '../memoryManager';
import {
  PerformanceMetrics,
  BudgetViolation,
  PerformanceBudget,
  MemoryInfo,
  PerformanceEvent,
  MetricType,
} from './types';

export class PerformanceMetricsCollector {
  private collectors = new Map<string, () => Promise<Partial<PerformanceMetrics>>>();
  private eventListeners = new Map<string, (event: PerformanceEvent) => void>();

  constructor() {
    this.initializeDefaultCollectors();
  }

  /**
   * Initialize default metric collectors
   */
  private initializeDefaultCollectors(): void {
    // Memory collector
    this.collectors.set('memory', this.collectMemoryMetrics.bind(this));

    // Response time collector (uses navigation timing API)
    this.collectors.set('responseTime', this.collectResponseTimeMetrics.bind(this));

    // Error rate collector
    this.collectors.set('errorRate', this.collectErrorRateMetrics.bind(this));

    logger.info('PerformanceMetricsCollector', 'Default collectors initialized', {
      collectorCount: this.collectors.size,
    });
  }

  /**
   * Register a custom metric collector
   */
  registerCollector(
    name: string,
    collector: () => Promise<Partial<PerformanceMetrics>>
  ): void {
    this.collectors.set(name, collector);
    logger.info('PerformanceMetricsCollector', 'Custom collector registered', { name });
  }

  /**
   * Collect all metrics for a service
   */
  async collectMetrics(serviceName: string): Promise<Partial<PerformanceMetrics>> {
    const metrics: Partial<PerformanceMetrics> = {
      serviceName,
      timestamp: Date.now(),
      budgetViolations: [],
    };

    const collectionPromises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
      try {
        const collectedMetrics = await collector();
        return { name, metrics: collectedMetrics };
      } catch (error) {
        logger.error('PerformanceMetricsCollector', `Failed to collect ${name} metrics`, error);
        return { name, metrics: {} };
      }
    });

    const results = await Promise.allSettled(collectionPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.metrics) {
        Object.assign(metrics, result.value.metrics);
      }
    });

    return metrics;
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(): Promise<Partial<PerformanceMetrics>> {
    try {
      const memoryInfo = await this.getMemoryInfo();
      const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024);

      return {
        memoryUsage: memoryUsageMB,
      };
    } catch (error) {
      logger.error('PerformanceMetricsCollector', 'Failed to collect memory metrics', error);
      return { memoryUsage: 0 };
    }
  }

  /**
   * Collect response time metrics
   */
  private async collectResponseTimeMetrics(): Promise<Partial<PerformanceMetrics>> {
    try {
      // Use Performance API if available
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

        if (navigationEntries.length > 0) {
          const entry = navigationEntries[0];
          const responseTime = entry.responseEnd - entry.requestStart;

          return {
            responseTime: Math.max(0, responseTime),
          };
        }
      }

      // Fallback: estimate based on recent API calls
      return this.estimateResponseTime();
    } catch (error) {
      logger.error('PerformanceMetricsCollector', 'Failed to collect response time metrics', error);
      return { responseTime: 0 };
    }
  }

  /**
   * Collect error rate metrics
   */
  private async collectErrorRateMetrics(): Promise<Partial<PerformanceMetrics>> {
    try {
      // This would typically connect to your error tracking system
      // For now, we'll return a simulated error rate
      const errorRate = await this.calculateErrorRate();

      return {
        errorRate,
      };
    } catch (error) {
      logger.error('PerformanceMetricsCollector', 'Failed to collect error rate metrics', error);
      return { errorRate: 0 };
    }
  }

  /**
   * Get memory information
   */
  private async getMemoryInfo(): Promise<MemoryInfo> {
    // Try to get actual memory info
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize || 0,
        totalJSHeapSize: memory.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
      };
    }

    // Fallback: use memory manager if available
    if (memoryManager) {
      const usage = await memoryManager.getMemoryUsage();
      return {
        usedJSHeapSize: usage.used * 1024 * 1024, // Convert MB to bytes
        totalJSHeapSize: usage.total * 1024 * 1024,
        jsHeapSizeLimit: usage.limit * 1024 * 1024,
      };
    }

    // Default fallback
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };
  }

  /**
   * Estimate response time based on recent performance
   */
  private async estimateResponseTime(): Promise<Partial<PerformanceMetrics>> {
    // This is a simplified estimation
    // In a real implementation, you'd track actual API response times
    const baseResponseTime = 100; // Base 100ms
    const variability = Math.random() * 200; // Add up to 200ms variability

    return {
      responseTime: baseResponseTime + variability,
    };
  }

  /**
   * Calculate error rate based on recent activity
   */
  private async calculateErrorRate(): Promise<number> {
    // This would typically connect to your error monitoring system
    // For now, return a simulated error rate
    return Math.random() * 2; // 0-2% error rate
  }

  /**
   * Check for budget violations
   */
  checkBudgetViolations(
    metrics: PerformanceMetrics,
    budget: PerformanceBudget
  ): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    const checks: Array<{
      metric: MetricType;
      actual: number;
      budget: number;
    }> = [
      { metric: 'responseTime', actual: metrics.responseTime, budget: budget.budgets.responseTime },
      { metric: 'memoryUsage', actual: metrics.memoryUsage, budget: budget.budgets.memoryUsage },
      { metric: 'cpuUsage', actual: metrics.cpuUsage, budget: budget.budgets.cpuUsage },
      { metric: 'apiCalls', actual: metrics.apiCallsPerMinute, budget: budget.budgets.apiCalls },
      { metric: 'errorRate', actual: metrics.errorRate, budget: budget.budgets.errorRate },
      { metric: 'downloadSize', actual: metrics.downloadSize, budget: budget.budgets.downloadSize },
    ];

    for (const check of checks) {
      if (check.actual > check.budget) {
        const violationPercentage = ((check.actual - check.budget) / check.budget) * 100;

        let severity: 'warning' | 'critical' = 'warning';
        if (violationPercentage >= budget.alertThresholds.critical) {
          severity = 'critical';
        } else if (violationPercentage >= budget.alertThresholds.warning) {
          severity = 'warning';
        }

        violations.push({
          metric: check.metric,
          actual: check.actual,
          budget: check.budget,
          severity,
          violationPercentage,
        });
      }
    }

    return violations;
  }

  /**
   * Emit performance event
   */
  emitPerformanceEvent(event: PerformanceEvent): void {
    // Notify registered listeners
    this.eventListeners.forEach((listener, name) => {
      try {
        listener(event);
      } catch (error) {
        logger.error('PerformanceMetricsCollector', `Event listener ${name} failed`, error);
      }
    });

    // Log the event
    logger.info('PerformanceMetricsCollector', 'Performance event emitted', {
      type: event.type,
      serviceName: event.serviceName,
      timestamp: event.timestamp,
    });
  }

  /**
   * Register event listener
   */
  addEventListener(name: string, listener: (event: PerformanceEvent) => void): void {
    this.eventListeners.set(name, listener);
    logger.info('PerformanceMetricsCollector', 'Event listener registered', { name });
  }

  /**
   * Remove event listener
   */
  removeEventListener(name: string): void {
    this.eventListeners.delete(name);
    logger.info('PerformanceMetricsCollector', 'Event listener removed', { name });
  }

  /**
   * Get current system performance snapshot
   */
  async getSystemSnapshot(): Promise<{
    memory: MemoryInfo;
    timing: PerformanceTiming | null;
    resources: PerformanceResourceTiming[];
  }> {
    const memory = await this.getMemoryInfo();

    let timing: PerformanceTiming | null = null;
    let resources: PerformanceResourceTiming[] = [];

    if (typeof performance !== 'undefined') {
      timing = performance.timing || null;

      if (performance.getEntriesByType) {
        resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      }
    }

    return { memory, timing, resources };
  }
}