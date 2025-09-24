import {
  errorMonitoring,
  withErrorMonitoring,
  useErrorReporting,
  ErrorReport,
  ErrorContext,
  ErrorMetrics,
  DeviceInfo,
} from '../../utils/errorMonitoring';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../utils/memoryManager', () => ({
  memoryManager: {
    getCurrentMemoryUsage: jest.fn().mockResolvedValue({
      used: 100 * 1024 * 1024,
      total: 200 * 1024 * 1024,
    }),
  },
}));

// Mock React
jest.mock('react', () => ({
  useCallback: jest.fn((fn) => fn),
  Component: class Component {},
  createElement: jest.fn((type, props, children) => ({
    type,
    props,
    children,
  })),
}));

const { logger } = require('../../utils/logger');
const { memoryManager } = require('../../utils/memoryManager');

describe('ErrorMonitoringSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock AsyncStorage responses
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce('test_session_123') // Session ID
      .mockResolvedValueOnce(null); // No stored errors initially
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('singleton behavior', () => {
    it('should provide singleton access', () => {
      expect(errorMonitoring).toBeDefined();
      expect(typeof errorMonitoring.reportError).toBe('function');
      expect(typeof errorMonitoring.getErrorMetrics).toBe('function');
    });

    it('should export the singleton instance', () => {
      expect(errorMonitoring).toBeDefined();
    });
  });

  describe('session management', () => {
    it('should handle session creation properly', async () => {
      expect(errorMonitoring).toBeDefined();
      // Session management happens automatically on init
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should not throw errors during session creation
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize error monitoring session')
      );
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw and should handle errors gracefully
      await errorMonitoring.reportError(new Error('Test error'));

      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize error monitoring session')
      );
    });
  });

  describe('error reporting', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for init
    });

    it('should report error with basic information', async () => {
      const testError = new Error('Test error message');
      const errorId = await errorMonitoring.reportError(testError);

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^error_[a-z0-9]+_[a-z0-9]+$/);

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors.length).toBeGreaterThanOrEqual(1);

      const reportedError = allErrors.find(e => e.message === 'Test error message');
      expect(reportedError).toBeDefined();
      expect(reportedError?.type).toBe('javascript');
      expect(reportedError?.count).toBeGreaterThanOrEqual(1);
    });

    it('should report string errors as Error objects', async () => {
      const errorId = await errorMonitoring.reportError('String error message');

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].message).toBe('String error message');
    });

    it('should increment count for duplicate errors', async () => {
      const testError = new Error('Duplicate error for count test');

      await errorMonitoring.reportError(testError);
      await errorMonitoring.reportError(testError);

      const allErrors = errorMonitoring.getAllErrors();
      const duplicateError = allErrors.find(e => e.message === 'Duplicate error for count test');
      expect(duplicateError).toBeDefined();
      expect(duplicateError?.count).toBeGreaterThanOrEqual(2);
    });

    it('should accept custom error options', async () => {
      const testError = new Error('Custom error');
      const context: Partial<ErrorContext> = {
        screen: 'HomeScreen',
        action: 'button_press',
        component: 'CustomButton',
      };

      await errorMonitoring.reportError(testError, {
        type: 'user',
        severity: 'critical',
        context,
        userId: 'user123',
      });

      const allErrors = errorMonitoring.getAllErrors();
      const error = allErrors.find(e => e.message === 'Custom error');
      expect(error).toBeDefined();
      expect(error?.type).toBe('user');
      expect(error?.severity).toBe('critical');
      expect(error?.userId).toBe('user123');
      expect(error?.context.screen).toBe('HomeScreen');
      expect(error?.context.action).toBe('button_press');
      expect(error?.context.component).toBe('CustomButton');
    });

    it('should enrich error context with system information', async () => {
      const testError = new Error('Context test');
      await errorMonitoring.reportError(testError);

      const allErrors = errorMonitoring.getAllErrors();
      const error = allErrors[0];
      expect(error.context.networkStatus).toBe('online');
      expect(error.context.buildVersion).toBe('1.1.0');
      expect(error.context.memoryUsage).toBe(100 * 1024 * 1024);
      expect(error.context.deviceInfo).toBeDefined();
    });

    it('should handle memory tracking errors gracefully', async () => {
      memoryManager.getCurrentMemoryUsage.mockRejectedValueOnce(new Error('Memory error'));

      const testError = new Error('Memory test');
      await errorMonitoring.reportError(testError);

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to get memory usage for error context:',
        { data: expect.any(Error) }
      );
    });
  });

  describe('severity determination', () => {
    it('should determine network errors as medium severity', async () => {
      const networkError = new Error('Network request failed');
      await errorMonitoring.reportError(networkError);

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].severity).toBe('medium');
    });

    it('should determine memory errors as critical severity', async () => {
      const memoryError = new Error('Out of memory allocation failed');
      await errorMonitoring.reportError(memoryError);

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].severity).toBe('critical');
    });

    it('should determine security errors as high severity', async () => {
      const securityError = new Error('Unauthorized access permission denied');
      await errorMonitoring.reportError(securityError);

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].severity).toBe('high');
    });

    it('should determine warnings as low severity', async () => {
      const warningError = new Error('Warning: deprecated API usage');
      await errorMonitoring.reportError(warningError);

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].severity).toBe('low');
    });

    it('should default to medium severity for unknown errors', async () => {
      const unknownError = new Error('Some unknown error');
      await errorMonitoring.reportError(unknownError);

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].severity).toBe('medium');
    });
  });

  describe('error handlers', () => {
    it('should register and notify error handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsubscribe1 = errorMonitoring.registerErrorHandler(handler1);
      const unsubscribe2 = errorMonitoring.registerErrorHandler(handler2);

      const testError = new Error('Handler test');
      await errorMonitoring.reportError(testError);

      expect(handler1).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Handler test',
        })
      );
      expect(handler2).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Handler test',
        })
      );

      // Test unsubscribe
      unsubscribe1();
      await errorMonitoring.reportError(new Error('After unsubscribe'));

      expect(handler1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(handler2).toHaveBeenCalledTimes(2); // Should be called again
    });

    it('should handle error handler exceptions gracefully', async () => {
      const faultyHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      errorMonitoring.registerErrorHandler(faultyHandler);
      await errorMonitoring.reportError(new Error('Test error'));

      expect(faultyHandler).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Error handler failed:',
        { data: expect.any(Error) }
      );
    });
  });

  describe('error resolution', () => {
    it('should mark errors as resolved', async () => {
      const testError = new Error('Resolvable error');
      const errorId = await errorMonitoring.reportError(testError);

      const resolved = await errorMonitoring.resolveError(errorId);

      expect(resolved).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors[0].resolved).toBe(true);
    });

    it('should return false for non-existent error IDs', async () => {
      const resolved = await errorMonitoring.resolveError('non_existent_id');
      expect(resolved).toBe(false);
    });
  });

  describe('metrics and analytics', () => {
    beforeEach(async () => {
      // Set up test data
      await errorMonitoring.reportError(new Error('Critical memory error'), {
        severity: 'critical',
        type: 'system',
      });
      await errorMonitoring.reportError(new Error('Network timeout'), {
        severity: 'medium',
        type: 'network',
      });
      await errorMonitoring.reportError(new Error('JavaScript error'), {
        severity: 'high',
        type: 'javascript',
      });
      await errorMonitoring.reportError(new Error('Network timeout')); // Duplicate

      // Resolve one error
      const allErrors = errorMonitoring.getAllErrors();
      await errorMonitoring.resolveError(allErrors[0].id);
    });

    it('should calculate comprehensive error metrics', () => {
      const metrics: ErrorMetrics = errorMonitoring.getErrorMetrics();

      expect(metrics.totalErrors).toBe(4); // Including duplicate count
      expect(metrics.uniqueErrors).toBe(3);
      expect(metrics.criticalErrors).toBe(1);
      expect(metrics.resolvedErrors).toBe(1);
      expect(metrics.errorRate).toBe(4 / 3); // totalErrors / uniqueErrors

      expect(metrics.errorsByType).toEqual({
        system: 1,
        network: 2, // One original + one duplicate
        javascript: 1,
      });

      expect(metrics.errorsBySeverity).toEqual({
        critical: 1,
        medium: 2, // Network errors + duplicate
        high: 1,
      });

      expect(metrics.topErrors).toHaveLength(3);
      expect(metrics.topErrors[0].count).toBe(2); // Network timeout (most frequent)
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const metrics = errorMonitoring.getErrorMetrics({
        start: oneHourAgo,
        end: now,
      });

      // All errors should be within the time range
      expect(metrics.uniqueErrors).toBe(3);
    });

    it('should exclude errors outside time range', () => {
      const futureTime = Date.now() + 60 * 60 * 1000;

      const metrics = errorMonitoring.getErrorMetrics({
        start: futureTime,
        end: futureTime + 1000,
      });

      expect(metrics.uniqueErrors).toBe(0);
      expect(metrics.totalErrors).toBe(0);
    });
  });

  describe('error cleanup', () => {
    beforeEach(async () => {
      // Add some old errors
      const oldTimestamp = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago
      const recentTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      await errorMonitoring.reportError(new Error('Old resolved error'));
      await errorMonitoring.reportError(new Error('Old unresolved error'));
      await errorMonitoring.reportError(new Error('Recent error'));

      const allErrors = errorMonitoring.getAllErrors();
      allErrors[0].timestamp = oldTimestamp;
      allErrors[0].resolved = true;
      allErrors[1].timestamp = oldTimestamp;
      allErrors[1].resolved = false;
      allErrors[2].timestamp = recentTimestamp;
    });

    it('should clear old resolved errors', async () => {
      const clearedCount = await errorMonitoring.clearOldErrors(30);

      expect(clearedCount).toBe(1); // Only old resolved error
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      const remainingErrors = errorMonitoring.getAllErrors();
      expect(remainingErrors).toHaveLength(2); // Old unresolved + recent
    });

    it('should keep unresolved errors even if old', async () => {
      await errorMonitoring.clearOldErrors(30);

      const remainingErrors = errorMonitoring.getAllErrors();
      const oldUnresolved = remainingErrors.find(
        e => e.message === 'Old unresolved error'
      );
      expect(oldUnresolved).toBeDefined();
    });
  });

  describe('error report generation', () => {
    beforeEach(async () => {
      await errorMonitoring.reportError(new Error('Critical error 1'), {
        severity: 'critical',
        type: 'system',
      });
      await errorMonitoring.reportError(new Error('Critical error 2'), {
        severity: 'critical',
        type: 'system',
      });

      // Add many network errors to test recommendations
      for (let i = 0; i < 8; i++) {
        await errorMonitoring.reportError(new Error(`Network error ${i}`), {
          type: 'network',
          severity: 'medium',
        });
      }
    });

    it('should generate comprehensive error report', () => {
      const report = errorMonitoring.generateErrorReport();

      expect(report.summary).toContain('10 total errors'); // 2 critical + 8 network
      expect(report.summary).toContain('10 unique');
      expect(report.summary).toContain('2 critical');

      expect(report.recommendations).toContain('Address critical errors immediately');
      expect(report.recommendations).toContain('High error rate detected');
      expect(report.recommendations).toContain('Focus on network errors');

      expect(report.metrics).toBeDefined();
    });

    it('should not recommend addressing critical errors when none exist', async () => {
      // Clear existing errors and add only non-critical ones
      errorMonitoring.errorReports = [];
      await errorMonitoring.reportError(new Error('Non-critical error'), {
        severity: 'low',
      });

      const report = errorMonitoring.generateErrorReport();

      expect(report.recommendations).not.toContain('Address critical errors immediately');
    });
  });

  describe('configuration', () => {
    it('should allow configuration of options', () => {
      const newOptions = {
        enableAutoReporting: false,
        enableUserFeedback: false,
        maxStoredErrors: 500,
      };

      errorMonitoring.configure(newOptions);

      expect(logger.debug).toHaveBeenCalledWith(
        'Error monitoring configured',
        { options: expect.objectContaining(newOptions) }
      );
    });

    it('should merge configuration with existing options', () => {
      const initialOptions = errorMonitoring.options;
      const partialOptions = { enableAutoReporting: false };

      errorMonitoring.configure(partialOptions);

      expect(errorMonitoring.options.enableAutoReporting).toBe(false);
      expect(errorMonitoring.options.enableUserFeedback).toBe(initialOptions.enableUserFeedback);
    });
  });

  describe('storage management', () => {
    it('should save error reports to storage', async () => {
      await errorMonitoring.reportError(new Error('Storage test'));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@mintenance/error_reports',
        expect.any(String)
      );
    });

    it('should limit stored errors to prevent storage bloat', async () => {
      errorMonitoring.configure({ maxStoredErrors: 2 });

      await errorMonitoring.reportError(new Error('Error 1'));
      await errorMonitoring.reportError(new Error('Error 2'));
      await errorMonitoring.reportError(new Error('Error 3'));

      const allErrors = errorMonitoring.getAllErrors();
      expect(allErrors).toHaveLength(2); // Should keep only last 2
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      await errorMonitoring.reportError(new Error('Test error'));

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to save error reports:',
        { data: expect.any(Error) }
      );
    });

    it('should load stored errors on initialization', async () => {
      const storedErrors = [
        {
          id: 'stored_error_1',
          message: 'Stored error',
          type: 'javascript',
          severity: 'medium',
          timestamp: Date.now(),
          sessionId: 'test_session',
          resolved: false,
          count: 1,
          context: {},
        },
      ];

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('test_session')
        .mockResolvedValueOnce(JSON.stringify(storedErrors));

      const newSystem = ErrorMonitoringSystem.getInstance();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(logger.debug).toHaveBeenCalledWith(
        'Loaded 1 stored error reports'
      );
    });
  });

  describe('global error handlers', () => {
    it('should intercept console.error calls', () => {
      const originalConsoleError = console.error;
      const testError = new Error('Console error test');

      console.error(testError);

      // Verify error was reported
      const allErrors = errorMonitoring.getAllErrors();
      const consoleError = allErrors.find(e =>
        e.message === 'Console error test' &&
        e.context.source === 'console.error'
      );
      expect(consoleError).toBeDefined();

      // Restore original console.error
      console.error = originalConsoleError;
    });
  });
});

describe('React integration', () => {
  describe('withErrorMonitoring HOC', () => {
    it('should create error monitoring wrapper component', () => {
      const TestComponent = () => ({ type: 'TestComponent' });
      const WrappedComponent = withErrorMonitoring(TestComponent, 'TestComponent');

      expect(WrappedComponent).toBeDefined();
      expect(WrappedComponent.name).toBe('ErrorMonitoredComponent');
    });

    it('should report component errors', () => {
      const TestComponent = () => ({ type: 'TestComponent' });
      const WrappedComponent = withErrorMonitoring(TestComponent);

      const instance = new WrappedComponent({});
      const testError = new Error('Component error');
      const errorInfo = { componentStack: 'Component stack trace' };

      // Mock reportError
      const reportErrorSpy = jest.spyOn(errorMonitoring, 'reportError');

      instance.componentDidCatch(testError, errorInfo);

      expect(reportErrorSpy).toHaveBeenCalledWith(testError, {
        type: 'javascript',
        severity: 'high',
        context: {
          component: 'TestComponent',
          props: {},
          componentStack: 'Component stack trace',
        },
      });
    });
  });

  describe('useErrorReporting hook', () => {
    it('should provide error reporting functions', () => {
      const hook = useErrorReporting();

      expect(hook.reportError).toBeDefined();
      expect(hook.metrics).toBeDefined();
      expect(hook.clearOldErrors).toBeDefined();
    });

    it('should use useCallback for reportError', () => {
      useErrorReporting();

      expect(React.useCallback).toHaveBeenCalledWith(
        expect.any(Function),
        []
      );
    });
  });
});