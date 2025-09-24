import { logger } from './logger';

export interface PerformanceMetrics {
  bundleSize?: number;
  memoryUsage?: number;
  startupTime?: number;
  navigationTime?: number;
  apiResponseTime?: number;
  fps?: number;
}

export interface PerformanceBudget {
  metric: keyof PerformanceMetrics;
  warning: number;
  error: number;
  unit: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private budgets: PerformanceBudget[] = [
    {
      metric: 'memoryUsage',
      warning: 150000000,
      error: 300000000,
      unit: 'bytes',
    },
    { metric: 'startupTime', warning: 3000, error: 5000, unit: 'ms' },
    { metric: 'navigationTime', warning: 500, error: 1000, unit: 'ms' },
    { metric: 'apiResponseTime', warning: 2000, error: 5000, unit: 'ms' },
    { metric: 'fps', warning: 55, error: 50, unit: 'fps' },
  ];

  private startTime: number = Date.now();
  private navigationStartTime?: number;
  private apiStartTimes: Map<string, number> = new Map();

  recordStartupTime(): void {
    const startupTime = Date.now() - this.startTime;
    this.metrics.startupTime = startupTime;
    this.checkBudget('startupTime', startupTime);
    logger.debug(`App startup time: ${startupTime}ms`);
  }

  startNavigationTimer(): void {
    this.navigationStartTime = Date.now();
  }

  recordNavigationTime(screenName: string): void {
    if (!this.navigationStartTime) return;

    const navigationTime = Date.now() - this.navigationStartTime;
    this.metrics.navigationTime = navigationTime;
    this.checkBudget('navigationTime', navigationTime);
    logger.debug(`Navigation to ${screenName}: ${navigationTime}ms`);
    this.navigationStartTime = undefined;
  }

  startApiTimer(requestId: string): void {
    this.apiStartTimes.set(requestId, Date.now());
  }

  recordApiResponseTime(requestId: string, endpoint: string): void {
    const startTime = this.apiStartTimes.get(requestId);
    if (!startTime) return;

    const responseTime = Date.now() - startTime;
    this.metrics.apiResponseTime = responseTime;
    this.checkBudget('apiResponseTime', responseTime);
    logger.debug(`API ${endpoint} response time: ${responseTime}ms`);
    this.apiStartTimes.delete(requestId);
  }

  recordMemoryUsage(): void {
    // React Native doesn't have performance.memory, so we use JSC memory if available
    try {
      if (global.performance && (global.performance as any).memory) {
        const memory = (global.performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize;
        this.metrics.memoryUsage = memoryUsage;
        this.checkBudget('memoryUsage', memoryUsage);
        logger.debug(
          `Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`
        );
      } else if (
        (global as any).__DEV__ &&
        (global as any).nativePerformanceNow
      ) {
        // Use approximate memory estimation for development
        const approximateMemory = 50 * 1024 * 1024; // 50MB baseline
        this.metrics.memoryUsage = approximateMemory;
        logger.debug(
          `Estimated memory usage: ${(approximateMemory / 1024 / 1024).toFixed(2)}MB (estimated)`
        );
      } else {
        logger.debug('Memory monitoring not available on this platform');
      }
    } catch (error) {
      logger.warn('Failed to record memory usage:', error);
    }
  }

  recordFPS(fps: number): void {
    this.metrics.fps = fps;
    this.checkBudget('fps', fps);

    if (fps < 55) {
      logger.warn(`Low FPS detected: ${fps}`);
    }
  }

  recordMetric(name: string, value: number): void {
    // Record custom metrics for monitoring integration
    logger.debug(`Custom metric recorded: ${name} = ${value}`);

    // Store in a custom metrics map for later retrieval
    if (!this.metrics.customMetrics) {
      (this.metrics as any).customMetrics = new Map<string, number>();
    }
    (this.metrics as any).customMetrics.set(name, value);
  }

  getCustomMetrics(): Map<string, number> {
    return (this.metrics as any).customMetrics || new Map();
  }

  private checkBudget(metric: keyof PerformanceMetrics, value: number): void {
    const budget = this.budgets.find((b) => b.metric === metric);
    if (!budget) return;

    const isInverted = metric === 'fps'; // Higher is better for FPS

    if (isInverted ? value < budget.error : value > budget.error) {
      logger.error(
        `Performance budget exceeded for ${metric}: ${value}${budget.unit} (limit: ${budget.error}${budget.unit})`
      );
      this.reportBudgetViolation(metric, value, budget, 'error');
    } else if (isInverted ? value < budget.warning : value > budget.warning) {
      logger.warn(
        `Performance budget warning for ${metric}: ${value}${budget.unit} (limit: ${budget.warning}${budget.unit})`
      );
      this.reportBudgetViolation(metric, value, budget, 'warning');
    }
  }

  private reportBudgetViolation(
    metric: keyof PerformanceMetrics,
    value: number,
    budget: PerformanceBudget,
    severity: 'warning' | 'error'
  ): void {
    // In production, send to analytics service and monitoring system
    if (!__DEV__) {
      // Example: Analytics.track('performance_budget_violation', { metric, value, severity });
      logger.info(
        `Performance budget violation: ${severity} for ${metric}: ${value}${budget.unit}`
      );

      // Notify monitoring system
      this.notifyMonitoringSystem(metric, value, budget, severity);
    } else {
      logger.warn(
        `Performance budget ${severity}: ${metric} = ${value}${budget.unit} (limit: ${severity === 'error' ? budget.error : budget.warning}${budget.unit})`
      );
    }
  }

  private notifyMonitoringSystem(
    metric: keyof PerformanceMetrics,
    value: number,
    budget: PerformanceBudget,
    severity: 'warning' | 'error'
  ): void {
    // This will be called by the monitoring system when it's available
    // Using a weak reference to avoid circular dependencies
    try {
      const monitoring = (global as any).__monitoringSystem;
      if (monitoring && monitoring.recordPerformanceViolation) {
        monitoring.recordPerformanceViolation({
          metric,
          value,
          budget,
          severity,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.warn('Failed to notify monitoring system:', error);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getBudgetStatus(): {
    metric: string;
    value?: number;
    status: 'good' | 'warning' | 'error';
  }[] {
    return this.budgets.map((budget) => {
      const value = this.metrics[budget.metric];
      if (value === undefined) {
        return { metric: budget.metric, status: 'good' };
      }

      const isInverted = budget.metric === 'fps';
      let status: 'good' | 'warning' | 'error';

      if (isInverted ? value < budget.error : value > budget.error) {
        status = 'error';
      } else if (isInverted ? value < budget.warning : value > budget.warning) {
        status = 'warning';
      } else {
        status = 'good';
      }

      return { metric: budget.metric, value, status };
    });
  }

  generateReport(): string {
    const status = this.getBudgetStatus();
    const errors = status.filter((s) => s.status === 'error');
    const warnings = status.filter((s) => s.status === 'warning');
    const good = status.filter((s) => s.status === 'good');

    let report = '📊 Performance Budget Report\n\n';

    if (errors.length > 0) {
      report += '❌ Budget Violations (Errors):\n';
      errors.forEach((item) => {
        const budget = this.budgets.find((b) => b.metric === item.metric);
        report += `  • ${item.metric}: ${item.value}${budget?.unit || ''} (limit: ${budget?.error}${budget?.unit || ''})\n`;
      });
      report += '\n';
    }

    if (warnings.length > 0) {
      report += '⚠️ Budget Warnings:\n';
      warnings.forEach((item) => {
        const budget = this.budgets.find((b) => b.metric === item.metric);
        report += `  • ${item.metric}: ${item.value}${budget?.unit || ''} (warning: ${budget?.warning}${budget?.unit || ''})\n`;
      });
      report += '\n';
    }

    if (good.length > 0) {
      report += '✅ Within Budget:\n';
      good.forEach((item) => {
        if (item.value !== undefined) {
          const budget = this.budgets.find((b) => b.metric === item.metric);
          report += `  • ${item.metric}: ${item.value}${budget?.unit || ''}\n`;
        }
      });
    }

    return report;
  }

  reset(): void {
    this.metrics = {};
    this.startTime = Date.now();
    this.navigationStartTime = undefined;
    this.apiStartTimes.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-track memory usage every 30 seconds in development
if (__DEV__) {
  setInterval(() => {
    performanceMonitor.recordMemoryUsage();
  }, 30000);
}

export default performanceMonitor;
