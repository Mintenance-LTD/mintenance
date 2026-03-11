// ============================================================================
// PERFORMANCE TYPES
// All type definitions for the performance monitoring system
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'render' | 'network' | 'storage' | 'navigation' | 'custom';
  threshold?: number;
  tags?: Record<string, string>;
}

export interface PerformanceBudget {
  metric?: string;
  budget?: number;
  current?: number;
  status?: 'pass' | 'warn' | 'fail';
  percentage?: number;
  target?: number;
  warning?: number;
  critical?: number;
  unit?: string;
  category?: 'performance' | 'resources' | 'quality' | 'user_experience';
  enabled?: boolean;
  // Service-oriented budget fields
  serviceName?: string;
  budgets?: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    apiCalls: number;
    errorRate: number;
    downloadSize: number;
  };
  alertThresholds?: {
    warning: number;
    critical: number;
  };
}

export interface BudgetEnforcementRule {
  id: string;
  name: string;
  metric: string;
  target: number;
  warning: number;
  critical: number;
  unit: string;
  category: 'performance' | 'resources' | 'quality' | 'user_experience';
  enabled: boolean;
  comparison: 'less_than' | 'greater_than' | 'equal_to';
  description?: string;
  enforcement: 'log' | 'warn' | 'error' | 'throw';
}

export interface PerformanceReport {
  timestamp?: number;
  metrics?: PerformanceMetric[];
  budgets?: PerformanceBudget[];
  violations?: PerformanceViolation[];
  summary: {
    totalMetrics: number;
    passedBudgets?: number;
    failedBudgets?: number;
    averageRenderTime?: number;
    averageNetworkTime?: number;
    violations?: { warning: number; critical: number };
    averageResponseTime?: number;
    peakMemoryUsage?: number;
    errorRate?: number;
  };
  // Service-oriented report fields
  serviceName?: string;
  timeRange?: { start: number; end: number };
  trends?: {
    responseTime: number[];
    memoryUsage: number[];
    errorRate: number[];
  };
  recommendations?: string[];
}

export interface PerformanceViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  stackTrace?: string;
}

export interface ComponentPerformance {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  mountTime: number;
  updateTimes: number[];
}

// ============================================================================
// Service-oriented performance monitoring types
// ============================================================================

export type MetricType =
  | 'responseTime'
  | 'memoryUsage'
  | 'cpuUsage'
  | 'apiCalls'
  | 'errorRate'
  | 'downloadSize'
  | 'bundleSize';

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

export interface PerformanceEvent {
  type: string;
  serviceName: string;
  timestamp: number;
  data: Record<string, unknown>;
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

export interface ReactNativePerformanceConfig {
  enableBundleAnalysis?: boolean;
  enableMemoryTracking?: boolean;
  enableChunkPreloading?: boolean;
  maxBundleSize?: number;
  memoryWarningThreshold?: number;
  chunkLoadTimeout?: number;
}

export interface ServiceBudgetConfiguration {
  serviceName: string;
  budgets: PerformanceBudget;
  enabled: boolean;
  customCollectors?: string[];
}
