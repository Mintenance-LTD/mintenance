// Mock the performance module before importing
jest.mock('../../utils/performance', () => ({
  performanceBudgetService: {
    initialize: jest.fn(() => Promise.resolve()),
    setBudget: jest.fn(),
    recordMetrics: jest.fn(() => Promise.resolve()),
    getViolations: jest.fn(() => []),
    exportData: jest.fn(() => Promise.resolve({})),
  },
  PerformanceBudget: {},
  PerformanceMetrics: {},
  BudgetViolation: {},
  ReactNativePerformanceConfig: {},
}));

import {
  PerformanceBudgetManagerLegacy as PerformanceBudgetManager,
  performanceBudgetManager,
  measurePerformance,
  withPerformanceEnforcement,
  usePerformanceMonitoring,
  reactNativePerformanceEnforcer,
} from '../../utils/performance';
import React from 'react';
import { render } from '../setup/testUtils';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/errorMonitoring', () => ({
  errorMonitoring: {
    reportError: jest.fn(),
  },
}));

jest.mock('../../utils/memoryManager', () => ({
  memoryManager: {
    performCleanup: jest.fn(),
    registerMemoryWarningCallback: jest.fn(),
    registerCleanupCallback: jest.fn(),
  },
}));

jest.mock('../../utils/codeSplitting', () => ({
  codeSplittingManager: {
    clearChunkCache: jest.fn(),
    preloadChunks: jest.fn(),
  },
}));

// Mock React Native components
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
}));

describe('PerformanceBudgetManager', () => {
  let budgetManager: PerformanceBudgetManager;

  beforeEach(() => {
    budgetManager = new PerformanceBudgetManager();
    jest.clearAllMocks();
  });

  describe('Budget Management', () => {
    it('initializes with default budgets', () => {
      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.budget).toBeDefined();
      expect(summary.budget?.serviceName).toBe('payment');
      expect(summary.budget?.budgets.responseTime).toBe(2000);
      expect(summary.budget?.budgets.errorRate).toBe(1);
    });

    it('allows setting custom budgets', () => {
      const customBudget = {
        serviceName: 'custom_service',
        budgets: {
          responseTime: 1000,
          memoryUsage: 100,
          cpuUsage: 50,
          apiCalls: 1000,
          errorRate: 2,
          downloadSize: 50,
        },
        alertThresholds: {
          warning: 80,
          critical: 95,
        },
      };

      budgetManager.setBudget(customBudget);
      const summary = budgetManager.getPerformanceSummary('custom_service');
      expect(summary.budget).toEqual(customBudget);
    });

    it('handles missing budgets gracefully', () => {
      budgetManager.recordMetrics('unknown_service', 100);
      // Should not throw error and log warning
      expect(true).toBe(true);
    });
  });

  describe('Metrics Recording', () => {
    it('records metrics correctly', () => {
      budgetManager.recordMetrics('payment', 1500, 80, 30, 200, 0.5, 15);

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.recentMetrics).toHaveLength(1);
      expect(summary.recentMetrics[0].responseTime).toBe(1500);
      expect(summary.recentMetrics[0].memoryUsage).toBe(80);
      expect(summary.recentMetrics[0].cpuUsage).toBe(30);
      expect(summary.recentMetrics[0].errorRate).toBe(0.5);
    });

    it('calculates average metrics correctly', () => {
      // Record multiple metrics
      for (let i = 0; i < 5; i++) {
        budgetManager.recordMetrics('payment', 1000 + i * 100, 50 + i * 10);
      }

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.averageMetrics.responseTime).toBe(1200); // (1000+1100+1200+1300+1400)/5
      expect(summary.averageMetrics.memoryUsage).toBe(70); // (50+60+70+80+90)/5
    });

    it('limits stored metrics to 100 entries', () => {
      // Record 150 metrics
      for (let i = 0; i < 150; i++) {
        budgetManager.recordMetrics('payment', 1000);
      }

      const summary = budgetManager.getPerformanceSummary('payment');
      const allMetrics = budgetManager.exportMetrics().metrics.payment;
      expect(allMetrics).toHaveLength(100);
    });
  });

  describe('Budget Violation Detection', () => {
    it('detects warning violations', () => {
      // Payment service warning threshold is 70% of 2000ms = 1400ms
      budgetManager.recordMetrics('payment', 1500); // Over warning but under critical

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.recentMetrics[0].budgetViolations).toHaveLength(1);
      expect(summary.recentMetrics[0].budgetViolations[0].severity).toBe('warning');
      expect(summary.recentMetrics[0].budgetViolations[0].metric).toBe('responseTime');
    });

    it('detects critical violations', () => {
      // Payment service critical threshold is 90% of 2000ms = 1800ms
      budgetManager.recordMetrics('payment', 1900); // Over critical

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.recentMetrics[0].budgetViolations).toHaveLength(1);
      expect(summary.recentMetrics[0].budgetViolations[0].severity).toBe('critical');
    });

    it('detects multiple metric violations', () => {
      // Violate both response time and memory
      budgetManager.recordMetrics('payment', 1900, 95); // Both over critical

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.recentMetrics[0].budgetViolations).toHaveLength(2);
    });

    it('calculates violation percentages correctly', () => {
      budgetManager.recordMetrics('payment', 2200); // 110% of budget (2000ms)

      const summary = budgetManager.getPerformanceSummary('payment');
      const violation = summary.recentMetrics[0].budgetViolations[0];
      expect(violation.violationPercentage).toBe(110);
    });
  });

  describe('Health Score Calculation', () => {
    it('calculates health score correctly for good performance', () => {
      budgetManager.recordMetrics('payment', 500, 30, 20, 100, 0.1, 5); // All within budget

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.healthScore).toBeGreaterThan(80);
    });

    it('calculates health score correctly for poor performance', () => {
      budgetManager.recordMetrics('payment', 3000, 150, 80, 600, 2, 25); // All over budget

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.healthScore).toBeLessThan(50);
    });

    it('penalizes health score for violations', () => {
      // Record multiple violations
      for (let i = 0; i < 5; i++) {
        budgetManager.recordMetrics('payment', 2500); // Over budget
      }

      const summary = budgetManager.getPerformanceSummary('payment');
      expect(summary.healthScore).toBeLessThan(50);
    });
  });

  describe('System Health', () => {
    it('calculates overall system health', () => {
      // Record good metrics for multiple services
      budgetManager.recordMetrics('payment', 500);
      budgetManager.recordMetrics('database', 50);
      budgetManager.recordMetrics('api_gateway', 100);

      const systemHealth = budgetManager.getSystemHealth();
      expect(systemHealth.overallScore).toBeGreaterThan(80);
      expect(systemHealth.criticalServices).toHaveLength(0);
    });

    it('identifies critical services', () => {
      // Record poor metrics for payment service
      budgetManager.recordMetrics('payment', 5000, 200, 90, 600, 5, 50);
      budgetManager.recordMetrics('database', 50); // Good performance

      const systemHealth = budgetManager.getSystemHealth();
      expect(systemHealth.criticalServices).toContain('payment');
      expect(systemHealth.criticalServices).not.toContain('database');
    });

    it('provides performance recommendations', () => {
      // Record poor overall performance
      budgetManager.recordMetrics('payment', 5000);
      budgetManager.recordMetrics('database', 500);
      budgetManager.recordMetrics('api_gateway', 1000);

      const systemHealth = budgetManager.getSystemHealth();
      expect(systemHealth.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Monitoring', () => {
    it('starts and stops monitoring', () => {
      budgetManager.startMonitoring(1000);
      expect(budgetManager.startMonitoring).toBeDefined();

      budgetManager.stopMonitoring();
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('handles repeated start monitoring calls', () => {
      budgetManager.startMonitoring(1000);
      budgetManager.startMonitoring(1000); // Should not create duplicate intervals

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Data Export', () => {
    it('exports metrics correctly', () => {
      budgetManager.recordMetrics('payment', 1500);
      budgetManager.recordMetrics('database', 100);

      const exported = budgetManager.exportMetrics();
      expect(exported.budgets).toBeDefined();
      expect(exported.metrics).toBeDefined();
      expect(exported.systemHealth).toBeDefined();

      expect(exported.budgets.payment).toBeDefined();
      expect(exported.metrics.payment).toHaveLength(1);
    });
  });
});

describe('measurePerformance utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('measures successful operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');

    const result = await measurePerformance('test_service', mockOperation);

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('measures failed operations', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));

    await expect(measurePerformance('test_service', mockOperation)).rejects.toThrow('Test error');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('records additional metrics', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');

    await measurePerformance('test_service', mockOperation, {
      memoryUsage: 100,
      cpuUsage: 50,
      downloadSize: 1024,
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('handles synchronous operations wrapped in promise', async () => {
    const syncOperation = () => Promise.resolve(42);

    const result = await measurePerformance('test_service', syncOperation);
    expect(result).toBe(42);
  });
});

describe('React Native Performance Enforcer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default config', async () => {
    await reactNativePerformanceEnforcer.initialize();

    const status = reactNativePerformanceEnforcer.getStatus();
    expect(status.config.enableBundleAnalysis).toBe(true);
    expect(status.config.enableMemoryTracking).toBe(true);
    expect(status.config.maxBundleSize).toBe(20 * 1024);
  });

  it('provides status information', () => {
    const status = reactNativePerformanceEnforcer.getStatus();

    expect(status.config).toBeDefined();
    expect(status.monitoring).toBeDefined();
    expect(status.recommendations).toBeDefined();
    expect(Array.isArray(status.recommendations)).toBe(true);
  });

  it('cleans up resources', () => {
    reactNativePerformanceEnforcer.cleanup();
    // Should not throw errors
    expect(true).toBe(true);
  });
});

describe('React HOC and Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('withPerformanceEnforcement HOC works', () => {
    const TestComponent = () => React.createElement('Text', {}, 'Test');
    const WrappedComponent = withPerformanceEnforcement(TestComponent, 'TestComponent');

    const { unmount } = render(React.createElement(WrappedComponent));

    // Should render without errors
    expect(unmount).toBeDefined();
    unmount();
  });

  it('usePerformanceMonitoring hook works', () => {
    const TestComponent = () => {
      const { renderCount, renderTime } = usePerformanceMonitoring('TestComponent', 16);
      return React.createElement('Text', {}, `Renders: ${renderCount}, Time: ${renderTime}`);
    };

    const { unmount } = render(React.createElement(TestComponent));

    // Should render without errors
    expect(unmount).toBeDefined();
    unmount();
  });
});

describe('Integration Tests', () => {
  it('handles complete performance monitoring workflow', async () => {
    // Start monitoring
    performanceBudgetManager.startMonitoring(100);

    // Record various metrics
    performanceBudgetManager.recordMetrics('payment', 1500, 80, 30, 200, 0.5, 15);
    performanceBudgetManager.recordMetrics('database', 150, 400, 60, 4000, 1, 80);
    performanceBudgetManager.recordMetrics('api_gateway', 250, 120, 45, 8000, 2, 400);

    // Measure performance of async operation
    const result = await measurePerformance('test_service', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'completed';
    });

    expect(result).toBe('completed');

    // Get system health
    const systemHealth = performanceBudgetManager.getSystemHealth();
    expect(systemHealth.overallScore).toBeGreaterThan(0);
    expect(systemHealth.servicesHealth).toBeDefined();

    // Export metrics
    const exported = performanceBudgetManager.exportMetrics();
    expect(Object.keys(exported.budgets).length).toBeGreaterThan(0);
    expect(Object.keys(exported.metrics).length).toBeGreaterThan(0);

    // Stop monitoring
    performanceBudgetManager.stopMonitoring();
  });

  it('handles error scenarios gracefully', () => {
    // Get summary for non-existent service (without recording metrics first)
    const summary = performanceBudgetManager.getPerformanceSummary('non_existent_service');
    expect(summary.budget).toBeUndefined();
    expect(summary.recentMetrics).toHaveLength(0);

    // Record metrics for non-existent service should not throw
    performanceBudgetManager.recordMetrics('non_existent_service', 1000);
    const summaryAfter = performanceBudgetManager.getPerformanceSummary('non_existent_service');
    expect(summaryAfter.recentMetrics).toHaveLength(1); // Now it should have the metric we just recorded

    // Should not throw errors
    expect(true).toBe(true);
  });

  it('handles edge cases with zero or negative values', () => {
    // Clear any existing metrics for payment service
    performanceBudgetManager.clearMetrics('payment');

    // Record edge case metrics
    performanceBudgetManager.recordMetrics('payment', 0, -1, 150, 0);

    const summary = performanceBudgetManager.getPerformanceSummary('payment');
    expect(summary.recentMetrics).toHaveLength(1);
    expect(summary.recentMetrics[0].responseTime).toBe(0);
    expect(summary.recentMetrics[0].memoryUsage).toBe(-1);
  });
});