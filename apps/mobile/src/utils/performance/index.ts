// ============================================================================
// PERFORMANCE MONITORING SYSTEM - MAIN EXPORTS
// Central exports for the refactored performance monitoring system
// ============================================================================

// Core classes
export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
export { MetricsCollector } from './MetricsCollector';
export { BudgetEnforcer } from './BudgetEnforcer';
export { BudgetRuleManager } from './BudgetRuleManager';
export { Reporter } from './Reporter';

// All types
export * from './types';

// ============================================================================
// HOOKS & UTILITIES
// ============================================================================

import { performanceMonitor } from './PerformanceMonitor';
import { PerformanceMetric } from './types';

// Decorator for measuring function performance
export function measurePerformance(
  name?: string,
  category: PerformanceMetric['category'] = 'custom'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureSync(
        methodName,
        () => originalMethod.apply(this, args),
        category
      );
    };

    return descriptor;
  };
}

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor),
    trackComponentRender: performanceMonitor.trackComponentRender.bind(performanceMonitor),
    recordMemoryUsage: performanceMonitor.recordMemoryUsage.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    getBudgetStatus: performanceMonitor.getBudgetStatus.bind(performanceMonitor),
    getAdvancedBudgetStatus: performanceMonitor.getAdvancedBudgetStatus.bind(performanceMonitor),
    generateBudgetReport: performanceMonitor.generateBudgetReport.bind(performanceMonitor),
    addBudgetRule: performanceMonitor.addBudgetRule.bind(performanceMonitor),
    removeBudgetRule: performanceMonitor.removeBudgetRule.bind(performanceMonitor),
    updateBudgetRule: performanceMonitor.updateBudgetRule.bind(performanceMonitor),
    setBudgetRuleEnabled: performanceMonitor.setBudgetRuleEnabled.bind(performanceMonitor),
    getAllBudgetRules: performanceMonitor.getAllBudgetRules.bind(performanceMonitor),
    setEnforcementEnabled: performanceMonitor.setEnforcementEnabled.bind(performanceMonitor),
    onMetric: performanceMonitor.onMetric.bind(performanceMonitor),
    onBudgetViolation: performanceMonitor.onBudgetViolation.bind(performanceMonitor),
  };
};

// Default export
export default performanceMonitor;