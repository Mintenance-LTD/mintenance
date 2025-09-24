/**
 * Performance Budget System
 * Complete performance monitoring and enforcement system
 */

// Main service orchestrator
export { PerformanceBudgetService, performanceBudgetService } from './PerformanceBudgetService';

// Core components
export { PerformanceBudgetManager } from './PerformanceBudgetManager';
export { ReactNativePerformanceEnforcer } from './ReactNativePerformanceEnforcer';
export { PerformanceBudgetRepository } from './PerformanceBudgetRepository';
export { PerformanceMetricsCollector } from './PerformanceMetricsCollector';

// Types and interfaces
export * from './types';

// Re-export commonly used React import for dashboard component
import React from 'react';
export { React };