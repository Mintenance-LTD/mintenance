/**
 * Performance Budget Types and Interfaces
 * Centralized type definitions for performance monitoring system
 */

export interface PerformanceBudget {
  serviceName: string;
  budgets: {
    responseTime: number; // Maximum response time in ms
    memoryUsage: number; // Maximum memory usage in MB
    cpuUsage: number; // Maximum CPU usage percentage
    apiCalls: number; // Maximum API calls per minute
    errorRate: number; // Maximum error rate percentage
    downloadSize: number; // Maximum download size in KB
  };
  alertThresholds: {
    warning: number; // Warning at X% of budget
    critical: number; // Critical at X% of budget
  };
}

export interface PerformanceMetrics {
  serviceName: string;
  timestamp: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  apiCallsPerMinute: number;
  errorRate: number;
  downloadSize: number;
  budgetViolations: BudgetViolation[];
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  severity: 'warning' | 'critical';
  violationPercentage: number;
}

export interface ReactNativePerformanceConfig {
  enableBundleAnalysis?: boolean;
  enableMemoryTracking?: boolean;
  enableChunkPreloading?: boolean;
  maxBundleSize?: number; // KB
  memoryWarningThreshold?: number; // MB
  chunkLoadTimeout?: number; // ms
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface BundleInfo {
  size: number;
  chunkSizes: Record<string, number>;
  totalSize: number;
  compressionRatio: number;
}

export interface PerformanceAlert {
  serviceName: string;
  metric: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  actual: number;
  budget: number;
  violationPercentage: number;
}

export interface PerformanceReport {
  serviceName: string;
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalMetrics: number;
    violations: {
      warning: number;
      critical: number;
    };
    averageResponseTime: number;
    peakMemoryUsage: number;
    errorRate: number;
  };
  trends: {
    responseTime: number[]; // Trend values
    memoryUsage: number[];
    errorRate: number[];
  };
  recommendations: string[];
}

export interface ServiceBudgetConfiguration {
  serviceName: string;
  budgetProfile: 'strict' | 'moderate' | 'relaxed';
  customBudgets?: Partial<PerformanceBudget['budgets']>;
  alertSettings?: {
    enableWarnings: boolean;
    enableCriticalAlerts: boolean;
    notificationChannels: ('log' | 'email' | 'slack')[];
  };
}

export type MetricType = 'responseTime' | 'memoryUsage' | 'cpuUsage' | 'apiCalls' | 'errorRate' | 'downloadSize';

export type PerformanceEventType =
  | 'budget_violation'
  | 'performance_improvement'
  | 'service_degradation'
  | 'alert_triggered'
  | 'monitoring_started'
  | 'monitoring_stopped';

export interface PerformanceEvent {
  type: PerformanceEventType;
  serviceName: string;
  timestamp: number;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    sessionId?: string;
    deviceInfo?: any;
  };
}