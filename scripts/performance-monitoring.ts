/**
 * Performance Monitoring Script
 * Monitors application performance in production
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  summary: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log critical performance issues
    this.checkThresholds(metric);
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkThresholds(metric: PerformanceMetric) {
    const thresholds = {
      'database_query': 1000, // 1 second
      'api_response': 2000,   // 2 seconds
      'payment_processing': 5000, // 5 seconds
      'ai_analysis': 10000,   // 10 seconds
      'message_delivery': 1000, // 1 second
      'notification_send': 2000, // 2 seconds
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`⚠️ Performance threshold exceeded: ${metric.name} took ${metric.value}ms (threshold: ${threshold}ms)`);
    }
  }

  /**
   * Get performance report for the last N minutes
   */
  getReport(minutesBack: number = 5): PerformanceReport {
    const cutoffTime = Date.now() - (minutesBack * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        timestamp: Date.now(),
        metrics: [],
        summary: {
          avgResponseTime: 0,
          errorRate: 0,
          throughput: 0,
          memoryUsage: 0,
        },
      };
    }

    const responseTimes = recentMetrics
      .filter(m => m.name.includes('response') || m.name.includes('query'))
      .map(m => m.value);

    const errors = recentMetrics.filter(m => m.name === 'error').length;
    const totalRequests = recentMetrics.filter(m => m.name.includes('request')).length;

    return {
      timestamp: Date.now(),
      metrics: recentMetrics,
      summary: {
        avgResponseTime: responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0,
        errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
        throughput: totalRequests / minutesBack, // requests per minute
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }

  /**
   * Get current memory usage (mock implementation)
   */
  private getMemoryUsage(): number {
    // In a real React Native app, you'd use a native module or Performance API
    // For now, we'll simulate based on metrics count
    return this.metrics.length * 0.1; // MB approximation
  }

  /**
   * Start monitoring database operations
   */
  monitorDatabaseQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return queryFn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.recordMetric('database_query', duration, { queryName, success: true });
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.recordMetric('database_query', duration, { queryName, success: false, error: error.message });
        this.recordMetric('error', 1, { type: 'database', queryName, error: error.message });
        throw error;
      });
  }

  /**
   * Monitor API response times
   */
  monitorApiCall<T>(endpoint: string, apiFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return apiFn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.recordMetric('api_response', duration, { endpoint, success: true });
        this.recordMetric('request', 1, { endpoint, success: true });
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.recordMetric('api_response', duration, { endpoint, success: false, error: error.message });
        this.recordMetric('request', 1, { endpoint, success: false });
        this.recordMetric('error', 1, { type: 'api', endpoint, error: error.message });
        throw error;
      });
  }

  /**
   * Monitor payment processing
   */
  monitorPayment<T>(paymentType: string, paymentFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return paymentFn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.recordMetric('payment_processing', duration, { paymentType, success: true });
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.recordMetric('payment_processing', duration, { paymentType, success: false, error: error.message });
        this.recordMetric('error', 1, { type: 'payment', paymentType, error: error.message });
        throw error;
      });
  }

  /**
   * Monitor AI analysis operations
   */
  monitorAIAnalysis<T>(analysisType: string, analysisFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    return analysisFn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.recordMetric('ai_analysis', duration, { analysisType, success: true });
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.recordMetric('ai_analysis', duration, { analysisType, success: false, error: error.message });
        this.recordMetric('error', 1, { type: 'ai', analysisType, error: error.message });
        throw error;
      });
  }

  /**
   * Export performance data for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'name,value,timestamp,metadata\n';
      const rows = this.metrics.map(m => 
        `${m.name},${m.value},${m.timestamp},"${JSON.stringify(m.metadata || {})}"`
      ).join('\n');
      return headers + rows;
    }
    
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData() {
    const report = this.getReport(5);
    const criticalMetrics = this.metrics
      .filter(m => Date.now() - m.timestamp < 60000) // Last minute
      .filter(m => {
        const thresholds = {
          'database_query': 1000,
          'api_response': 2000,
          'payment_processing': 5000,
          'ai_analysis': 10000,
        };
        const threshold = thresholds[m.name as keyof typeof thresholds];
        return threshold && m.value > threshold;
      });

    return {
      summary: report.summary,
      criticalIssues: criticalMetrics.length,
      recentErrors: this.metrics
        .filter(m => m.name === 'error' && Date.now() - m.timestamp < 300000) // Last 5 minutes
        .slice(-10), // Last 10 errors
      topSlowQueries: this.metrics
        .filter(m => m.name === 'database_query')
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance monitoring decorators for easy integration
export function MonitorPerformance(metricName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        performanceMonitor.recordMetric(metricName, duration, { 
          method: propertyKey,
          success: true 
        });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        performanceMonitor.recordMetric(metricName, duration, { 
          method: propertyKey,
          success: false,
          error: (error as Error).message 
        });
        throw error;
      }
    };

    return descriptor;
  };
}

// Usage examples:
// @MonitorPerformance('database_query')
// async getUserJobs(userId: string) { ... }

// @MonitorPerformance('api_response')
// async sendMessage(message: string) { ... }

export default performanceMonitor;