// ============================================================================
// PERFORMANCE TESTING
// Utilities for testing performance and tracking metrics
// ============================================================================

export interface TestPerformanceResult {
  renderTime: number;
  memoryUsage: number;
  asyncOperations: Array<{
    name: string;
    duration: number;
    success: boolean;
  }>;
  budgetViolations: Array<{
    metric: string;
    expected: number;
    actual: number;
  }>;
}

export class PerformanceTester {
  private metrics: Array<{ name: string; value: number; timestamp: number }> = [];

  startTest(name: string): () => void {
    const startTime = performance.now();
    const startMemory = global.gc ? process.memoryUsage() : null;

    return () => {
      const duration = performance.now() - startTime;
      const endMemory = global.gc ? process.memoryUsage() : null;

      this.metrics.push({
        name: `${name}_duration`,
        value: duration,
        timestamp: Date.now(),
      });

      if (startMemory && endMemory) {
        this.metrics.push({
          name: `${name}_memory`,
          value: endMemory.heapUsed - startMemory.heapUsed,
          timestamp: Date.now(),
        });
      }
    };
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTest = this.startTest(name);
    try {
      const result = await fn();
      endTest();
      return result;
    } catch (error) {
      endTest();
      throw error;
    }
  }

  measureSync<T>(name: string, fn: () => T): T {
    const endTest = this.startTest(name);
    try {
      const result = fn();
      endTest();
      return result;
    } catch (error) {
      endTest();
      throw error;
    }
  }

  getMetrics(): Array<{ name: string; value: number; timestamp: number }> {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No performance metrics collected';
    }

    const report = ['Performance Test Report', '========================'];

    const grouped = this.metrics.reduce((acc, metric) => {
      const baseName = metric.name.replace(/_duration|_memory/, '');
      if (!acc[baseName]) acc[baseName] = {};

      if (metric.name.endsWith('_duration')) {
        acc[baseName].duration = metric.value;
      } else if (metric.name.endsWith('_memory')) {
        acc[baseName].memory = metric.value;
      }

      return acc;
    }, {} as Record<string, { duration?: number; memory?: number }>);

    Object.entries(grouped).forEach(([name, values]) => {
      report.push(`\n${name}:`);
      if (values.duration !== undefined) {
        report.push(`  Duration: ${values.duration.toFixed(2)}ms`);
      }
      if (values.memory !== undefined) {
        report.push(`  Memory: ${(values.memory / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    return report.join('\n');
  }
}
