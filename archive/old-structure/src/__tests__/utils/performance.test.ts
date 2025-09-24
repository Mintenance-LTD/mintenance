import {
  PerformanceMonitor,
  performanceMonitor,
  measurePerformance,
  usePerformanceMonitoring,
  PerformanceMetric,
  PerformanceBudget,
  PerformanceReport,
  ComponentPerformance,
} from '../../utils/performance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDeviceEventEmitter = {
  emit: jest.fn(),
};

jest.mock('react-native', () => ({
  DeviceEventEmitter: mockDeviceEventEmitter,
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

// Mock global performance
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024,
  },
};

global.performance = mockPerformance as any;
global.__DEV__ = true;

const { logger } = require('../../utils/logger');

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDeviceEventEmitter.emit.mockClear();

    // Reset singleton instance
    (PerformanceMonitor as any).instance = undefined;
    monitor = PerformanceMonitor.getInstance();

    // Mock performance.now to return incremental values
    let timeCounter = 1000;
    mockPerformance.now.mockImplementation(() => timeCounter++);
  });

  afterEach(() => {
    jest.useRealTimers();
    monitor.stopPeriodicReporting();
    monitor.clearMetrics();
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export the singleton instance', () => {
      expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
    });
  });

  describe('budget management', () => {
    it('should have default budgets initialized', () => {
      expect(monitor.getBudget('app_start_time')).toBe(3000);
      expect(monitor.getBudget('screen_transition_time')).toBe(300);
      expect(monitor.getBudget('component_render_time')).toBe(16);
      expect(monitor.getBudget('api_response_time')).toBe(2000);
      expect(monitor.getBudget('storage_operation_time')).toBe(100);
    });

    it('should allow setting custom budgets', () => {
      monitor.setBudget('custom_metric', 1000);
      expect(monitor.getBudget('custom_metric')).toBe(1000);
    });

    it('should return undefined for non-existent budgets', () => {
      expect(monitor.getBudget('non_existent')).toBeUndefined();
    });
  });

  describe('enable/disable functionality', () => {
    it('should respect enabled state', () => {
      monitor.setEnabled(false);
      monitor.recordMetric('test_metric', 100);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should record metrics when enabled', () => {
      monitor.setEnabled(true);
      monitor.recordMetric('test_metric', 100);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
    });
  });

  describe('metric recording', () => {
    it('should record basic metrics correctly', () => {
      const testTags = { component: 'TestComponent' };
      monitor.recordMetric('test_metric', 150, 'render', testTags);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);

      const metric = metrics[0];
      expect(metric.name).toBe('test_metric');
      expect(metric.value).toBe(150);
      expect(metric.category).toBe('render');
      expect(metric.tags).toEqual(testTags);
      expect(metric.timestamp).toBeDefined();
    });

    it('should set threshold from budget', () => {
      monitor.setBudget('test_metric', 100);
      monitor.recordMetric('test_metric', 50);

      const metrics = monitor.getMetrics();
      expect(metrics[0].threshold).toBe(100);
    });

    it('should emit violation events for budget violations', () => {
      monitor.setBudget('test_metric', 100);
      monitor.recordMetric('test_metric', 150);

      expect(mockDeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_violation',
        expect.objectContaining({
          metric: 'test_metric',
          threshold: 100,
          actual: 150,
          severity: 'medium',
        })
      );
    });

    it('should log warnings for significant violations', () => {
      monitor.setBudget('test_metric', 100);
      monitor.recordMetric('test_metric', 250); // 2.5x threshold

      expect(logger.warn).toHaveBeenCalledWith(
        'Performance violation: test_metric',
        {
          data: { expected: 100, actual: 250, tags: undefined },
        }
      );
    });

    it('should prevent memory leaks by limiting metric count', () => {
      // Record more than maxMetrics (1000)
      for (let i = 0; i < 1200; i++) {
        monitor.recordMetric(`metric_${i}`, i);
      }

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000); // Should be limited to maxMetrics
    });
  });

  describe('severity calculation', () => {
    beforeEach(() => {
      monitor.setBudget('test_metric', 100);
    });

    it('should calculate low severity correctly', () => {
      monitor.recordMetric('test_metric', 140); // 1.4x threshold
      expect(mockDeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_violation',
        expect.objectContaining({ severity: 'low' })
      );
    });

    it('should calculate medium severity correctly', () => {
      monitor.recordMetric('test_metric', 170); // 1.7x threshold
      expect(mockDeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_violation',
        expect.objectContaining({ severity: 'medium' })
      );
    });

    it('should calculate high severity correctly', () => {
      monitor.recordMetric('test_metric', 250); // 2.5x threshold
      expect(mockDeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_violation',
        expect.objectContaining({ severity: 'high' })
      );
    });

    it('should calculate critical severity correctly', () => {
      monitor.recordMetric('test_metric', 350); // 3.5x threshold
      expect(mockDeviceEventEmitter.emit).toHaveBeenCalledWith(
        'performance_violation',
        expect.objectContaining({ severity: 'critical' })
      );
    });
  });

  describe('timing utilities', () => {
    it('should measure duration with startTimer', () => {
      const endTimer = monitor.startTimer('timer_test', { context: 'test' });

      // Advance mock time
      mockPerformance.now.mockReturnValue(1100);
      endTimer();

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('timer_test');
      expect(metrics[0].value).toBe(100); // 1100 - 1000
      expect(metrics[0].tags).toEqual({ context: 'test' });
    });

    it('should measure async operations', async () => {
      const asyncOperation = jest.fn().mockResolvedValue('result');

      mockPerformance.now
        .mockReturnValueOnce(1000) // start time
        .mockReturnValueOnce(1150); // end time

      const result = await monitor.measureAsync('async_test', asyncOperation, 'network');

      expect(result).toBe('result');
      expect(asyncOperation).toHaveBeenCalled();

      const metrics = monitor.getMetrics();
      expect(metrics[0].name).toBe('async_test');
      expect(metrics[0].value).toBe(150);
      expect(metrics[0].category).toBe('network');
      expect(metrics[0].tags).toEqual({ status: 'success' });
    });

    it('should measure failed async operations', async () => {
      const asyncOperation = jest.fn().mockRejectedValue(new Error('Test error'));

      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1200);

      await expect(
        monitor.measureAsync('async_error_test', asyncOperation)
      ).rejects.toThrow('Test error');

      const metrics = monitor.getMetrics();
      expect(metrics[0].value).toBe(200);
      expect(metrics[0].tags).toEqual({ status: 'error' });
    });

    it('should measure sync operations', () => {
      const syncOperation = jest.fn().mockReturnValue('sync_result');

      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1075);

      const result = monitor.measureSync('sync_test', syncOperation, 'custom');

      expect(result).toBe('sync_result');
      expect(syncOperation).toHaveBeenCalled();

      const metrics = monitor.getMetrics();
      expect(metrics[0].value).toBe(75);
      expect(metrics[0].tags).toEqual({ status: 'success' });
    });

    it('should measure failed sync operations', () => {
      const syncOperation = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050);

      expect(() =>
        monitor.measureSync('sync_error_test', syncOperation)
      ).toThrow('Sync error');

      const metrics = monitor.getMetrics();
      expect(metrics[0].value).toBe(50);
      expect(metrics[0].tags).toEqual({ status: 'error' });
    });
  });

  describe('component performance tracking', () => {
    it('should track component render times', () => {
      monitor.trackComponentRender('TestComponent', 25);
      monitor.trackComponentRender('TestComponent', 30);
      monitor.trackComponentRender('TestComponent', 20);

      const componentMetrics = monitor.getComponentMetrics('TestComponent');
      expect(componentMetrics).toHaveLength(1);

      const component = componentMetrics[0];
      expect(component.componentName).toBe('TestComponent');
      expect(component.renderCount).toBe(3);
      expect(component.totalRenderTime).toBe(75);
      expect(component.averageRenderTime).toBe(25);
      expect(component.lastRenderTime).toBe(20);
      expect(component.updateTimes).toEqual([25, 30, 20]);
    });

    it('should limit stored update times', () => {
      // Add more than 10 render times
      for (let i = 0; i < 15; i++) {
        monitor.trackComponentRender('TestComponent', i * 10);
      }

      const componentMetrics = monitor.getComponentMetrics('TestComponent');
      const component = componentMetrics[0];
      expect(component.updateTimes).toHaveLength(10);
      expect(component.updateTimes[0]).toBe(50); // Should keep last 10
    });

    it('should get all component metrics when no name specified', () => {
      monitor.trackComponentRender('Component1', 15);
      monitor.trackComponentRender('Component2', 25);

      const allMetrics = monitor.getComponentMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.map(m => m.componentName)).toContain('Component1');
      expect(allMetrics.map(m => m.componentName)).toContain('Component2');
    });

    it('should return empty array for non-existent component', () => {
      const metrics = monitor.getComponentMetrics('NonExistentComponent');
      expect(metrics).toEqual([]);
    });
  });

  describe('memory monitoring', () => {
    it('should record memory usage when available', () => {
      monitor.recordMemoryUsage();

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(3);

      const heapUsed = metrics.find(m => m.name === 'js_heap_size_used');
      const heapTotal = metrics.find(m => m.name === 'js_heap_size_total');
      const heapLimit = metrics.find(m => m.name === 'js_heap_size_limit');

      expect(heapUsed?.value).toBe(50 * 1024 * 1024);
      expect(heapTotal?.value).toBe(100 * 1024 * 1024);
      expect(heapLimit?.value).toBe(2 * 1024 * 1024 * 1024);
    });

    it('should handle missing memory API gracefully', () => {
      const originalMemory = (global.performance as any).memory;
      delete (global.performance as any).memory;

      monitor.recordMemoryUsage();

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(0);

      // Restore memory API
      (global.performance as any).memory = originalMemory;
    });
  });

  describe('network performance tracking', () => {
    it('should track successful network requests', () => {
      monitor.trackNetworkRequest(
        'https://api.example.com/users/123',
        1000,
        1250,
        true
      );

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);

      const metric = metrics[0];
      expect(metric.name).toBe('api_response_time');
      expect(metric.value).toBe(250);
      expect(metric.category).toBe('network');
      expect(metric.tags).toEqual({
        url: 'https://api.example.com/users',
        success: 'true',
      });
    });

    it('should track failed network requests', () => {
      monitor.trackNetworkRequest(
        'https://api.example.com/error',
        1000,
        1500,
        false
      );

      const metrics = monitor.getMetrics();
      const metric = metrics[0];
      expect(metric.tags?.success).toBe('false');
    });

    it('should sanitize invalid URLs', () => {
      monitor.trackNetworkRequest('invalid-url', 1000, 1100, true);

      const metrics = monitor.getMetrics();
      expect(metrics[0].tags?.url).toBe('invalid_url');
    });
  });

  describe('metric filtering and retrieval', () => {
    beforeEach(() => {
      monitor.recordMetric('render_metric', 16, 'render');
      monitor.recordMetric('network_metric', 200, 'network');
      monitor.recordMetric('storage_metric', 50, 'storage');
      monitor.recordMetric('custom_metric', 100, 'custom');
    });

    it('should get all metrics when no category specified', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(4);
    });

    it('should filter metrics by category', () => {
      const renderMetrics = monitor.getMetrics('render');
      const networkMetrics = monitor.getMetrics('network');

      expect(renderMetrics).toHaveLength(1);
      expect(renderMetrics[0].name).toBe('render_metric');

      expect(networkMetrics).toHaveLength(1);
      expect(networkMetrics[0].name).toBe('network_metric');
    });

    it('should return copy of metrics array', () => {
      const metrics1 = monitor.getMetrics();
      const metrics2 = monitor.getMetrics();

      expect(metrics1).toEqual(metrics2);
      expect(metrics1).not.toBe(metrics2);
    });
  });

  describe('event listeners', () => {
    it('should notify listeners on new metrics', () => {
      const listener = jest.fn();
      const unsubscribe = monitor.onMetric(listener);

      monitor.recordMetric('test_metric', 100);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test_metric',
          value: 100,
        })
      );

      unsubscribe();
      monitor.recordMetric('test_metric_2', 200);
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      monitor.onMetric(faultyListener);
      monitor.recordMetric('test_metric', 100);

      expect(faultyListener).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Performance listener error',
        { data: expect.any(Error) }
      );
    });
  });

  describe('reporting and analytics', () => {
    beforeEach(() => {
      // Set up some test data
      monitor.setBudget('test_metric_1', 100);
      monitor.setBudget('test_metric_2', 200);

      monitor.recordMetric('test_metric_1', 150, 'render'); // Over budget
      monitor.recordMetric('test_metric_2', 180, 'network'); // Within budget
      monitor.recordMetric('test_metric_3', 50, 'custom'); // No budget
    });

    it('should generate comprehensive performance report', () => {
      const report = monitor.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.metrics).toHaveLength(3);
      expect(report.budgets.length).toBeGreaterThan(0);
      expect(report.violations).toHaveLength(1); // test_metric_1 violation
      expect(report.summary).toBeDefined();
    });

    it('should calculate budget status correctly', () => {
      const budgets = monitor.getBudgetStatus();

      const testMetric1Budget = budgets.find(b => b.metric === 'test_metric_1');
      const testMetric2Budget = budgets.find(b => b.metric === 'test_metric_2');

      expect(testMetric1Budget?.status).toBe('fail');
      expect(testMetric1Budget?.percentage).toBe(150);

      expect(testMetric2Budget?.status).toBe('warn'); // 90% of budget
      expect(testMetric2Budget?.percentage).toBe(90);
    });

    it('should store and retrieve performance reports', async () => {
      const mockKeys = ['perf_report_1000', 'perf_report_2000'];
      const mockReports = [
        ['perf_report_1000', JSON.stringify({ timestamp: 1000 })],
        ['perf_report_2000', JSON.stringify({ timestamp: 2000 })],
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue(mockReports);

      const reports = await monitor.getStoredReports();

      expect(reports).toHaveLength(2);
      expect(reports[0].timestamp).toBe(2000); // Should be sorted newest first
      expect(reports[1].timestamp).toBe(1000);
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const reports = await monitor.getStoredReports();

      expect(reports).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to retrieve performance reports',
        { data: expect.any(Error) }
      );
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      monitor.recordMetric('test1', 100);
      monitor.recordMetric('test2', 200);
      monitor.trackComponentRender('TestComponent', 25);
    });

    it('should clear all metrics and component data', () => {
      monitor.clearMetrics();

      expect(monitor.getMetrics()).toHaveLength(0);
      expect(monitor.getComponentMetrics()).toHaveLength(0);
    });
  });

  describe('periodic reporting', () => {
    it('should start periodic reporting on initialization', () => {
      expect(setInterval).toHaveBeenCalled();
    });

    it('should stop periodic reporting', () => {
      monitor.stopPeriodicReporting();
      expect(clearInterval).toHaveBeenCalled();
    });
  });
});

describe('performance decorators and hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.clearMetrics();

    let timeCounter = 1000;
    mockPerformance.now.mockImplementation(() => timeCounter++);
  });

  describe('@measurePerformance decorator', () => {
    it('should measure method performance', () => {
      class TestClass {
        @measurePerformance('custom_method_name', 'custom')
        testMethod(value: number) {
          return value * 2;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod(5);

      expect(result).toBe(10);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('custom_method_name');
      expect(metrics[0].category).toBe('custom');
    });

    it('should use default method name when not provided', () => {
      class TestClass {
        @measurePerformance()
        anotherMethod() {
          return 'result';
        }
      }

      const instance = new TestClass();
      instance.anotherMethod();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics[0].name).toBe('TestClass.anotherMethod');
    });
  });

  describe('usePerformanceMonitoring hook', () => {
    it('should provide performance monitoring methods', () => {
      const hook = usePerformanceMonitoring();

      expect(hook.recordMetric).toBeDefined();
      expect(hook.startTimer).toBeDefined();
      expect(hook.measureAsync).toBeDefined();
      expect(hook.measureSync).toBeDefined();
      expect(hook.trackComponentRender).toBeDefined();
      expect(hook.recordMemoryUsage).toBeDefined();
      expect(hook.generateReport).toBeDefined();
      expect(hook.getBudgetStatus).toBeDefined();
      expect(hook.onMetric).toBeDefined();
    });

    it('should call bound methods correctly', () => {
      const hook = usePerformanceMonitoring();

      hook.recordMetric('hook_test', 123, 'custom');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('hook_test');
      expect(metrics[0].value).toBe(123);
    });
  });
});