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
  metric: string;
  budget: number;
  current: number;
  status: 'pass' | 'warn' | 'fail';
  percentage: number;
  target?: number;
  warning?: number;
  critical?: number;
  unit?: string;
  category?: 'performance' | 'resources' | 'quality' | 'user_experience';
  enabled?: boolean;
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
  timestamp: number;
  metrics: PerformanceMetric[];
  budgets: PerformanceBudget[];
  violations: PerformanceViolation[];
  summary: {
    totalMetrics: number;
    passedBudgets: number;
    failedBudgets: number;
    averageRenderTime: number;
    averageNetworkTime: number;
  };
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
