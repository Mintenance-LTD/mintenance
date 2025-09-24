import performanceMonitor from '../../utils/performanceMonitor';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock global performance object
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  },
};

// Mock global variables
(global as any).__DEV__ = true;
(global as any).nativePerformanceNow = jest.fn(() => Date.now());

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    // Reset the singleton instance for testing
    performanceMonitor.reset();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Startup Time Tracking', () => {
    it('records startup time correctly', () => {
      // Mock Date.now for precise timing control
      const mockDateNow = jest.spyOn(Date, 'now');
      mockDateNow.mockReturnValueOnce(1000); // Start time during reset

      // Reset with known start time
      performanceMonitor.reset();

      mockDateNow.mockReturnValueOnce(3000); // End time (1000 + 2000)
      performanceMonitor.recordStartupTime();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.startupTime).toBe(2000);

      mockDateNow.mockRestore();
    });

    it('checks startup time against budget', () => {
      // Simulate slow startup (6 seconds, over error threshold of 5 seconds)
      jest.advanceTimersByTime(6000);
      performanceMonitor.recordStartupTime();

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const startupStatus = budgetStatus.find(s => s.metric === 'startupTime');
      expect(startupStatus?.status).toBe('error');
    });

    it('generates warning for moderate startup time', () => {
      // Simulate moderate startup (4 seconds, over warning threshold of 3 seconds)
      jest.advanceTimersByTime(4000);
      performanceMonitor.recordStartupTime();

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const startupStatus = budgetStatus.find(s => s.metric === 'startupTime');
      expect(startupStatus?.status).toBe('warning');
    });
  });

  describe('Navigation Time Tracking', () => {
    it('records navigation time correctly', () => {
      performanceMonitor.startNavigationTimer();

      // Simulate 300ms navigation
      jest.advanceTimersByTime(300);
      performanceMonitor.recordNavigationTime('HomeScreen');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.navigationTime).toBe(300);
    });

    it('handles navigation without starting timer', () => {
      // Don't start timer, should not record
      performanceMonitor.recordNavigationTime('HomeScreen');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.navigationTime).toBeUndefined();
    });

    it('resets navigation timer after recording', () => {
      performanceMonitor.startNavigationTimer();
      jest.advanceTimersByTime(300);
      performanceMonitor.recordNavigationTime('HomeScreen');

      // Try to record again without restarting timer
      performanceMonitor.recordNavigationTime('ProfileScreen');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.navigationTime).toBe(300); // Should still be the first recording
    });

    it('checks navigation time against budget', () => {
      performanceMonitor.startNavigationTimer();

      // Simulate slow navigation (1200ms, over error threshold of 1000ms)
      jest.advanceTimersByTime(1200);
      performanceMonitor.recordNavigationTime('SlowScreen');

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const navStatus = budgetStatus.find(s => s.metric === 'navigationTime');
      expect(navStatus?.status).toBe('error');
    });
  });

  describe('API Response Time Tracking', () => {
    it('records API response time correctly', () => {
      const requestId = 'test-request-123';
      performanceMonitor.startApiTimer(requestId);

      // Simulate 1.5 second API response
      jest.advanceTimersByTime(1500);
      performanceMonitor.recordApiResponseTime(requestId, '/api/users');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiResponseTime).toBe(1500);
    });

    it('handles API recording without starting timer', () => {
      // Don't start timer, should not record
      performanceMonitor.recordApiResponseTime('unknown-request', '/api/test');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiResponseTime).toBeUndefined();
    });

    it('removes request ID after recording', () => {
      const requestId = 'test-request-123';
      performanceMonitor.startApiTimer(requestId);
      jest.advanceTimersByTime(1000);
      performanceMonitor.recordApiResponseTime(requestId, '/api/users');

      // Try to record again with same ID
      performanceMonitor.recordApiResponseTime(requestId, '/api/users');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiResponseTime).toBe(1000); // Should still be the first recording
    });

    it('handles multiple concurrent API requests', () => {
      const requestId1 = 'request-1';
      const requestId2 = 'request-2';

      performanceMonitor.startApiTimer(requestId1);
      jest.advanceTimersByTime(500);
      performanceMonitor.startApiTimer(requestId2);
      jest.advanceTimersByTime(1000); // Total: request1=1500ms, request2=1000ms

      performanceMonitor.recordApiResponseTime(requestId2, '/api/fast');
      const metricsAfterFirst = performanceMonitor.getMetrics();
      expect(metricsAfterFirst.apiResponseTime).toBe(1000);

      jest.advanceTimersByTime(500); // Additional 500ms for request1
      performanceMonitor.recordApiResponseTime(requestId1, '/api/slow');
      const metricsAfterSecond = performanceMonitor.getMetrics();
      expect(metricsAfterSecond.apiResponseTime).toBe(2000); // 1500 + 500
    });

    it('checks API response time against budget', () => {
      const requestId = 'slow-request';
      performanceMonitor.startApiTimer(requestId);

      // Simulate very slow API (6 seconds, over error threshold of 5 seconds)
      jest.advanceTimersByTime(6000);
      performanceMonitor.recordApiResponseTime(requestId, '/api/slow-endpoint');

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const apiStatus = budgetStatus.find(s => s.metric === 'apiResponseTime');
      expect(apiStatus?.status).toBe('error');
    });
  });

  describe('Memory Usage Tracking', () => {
    beforeEach(() => {
      // Reset global performance mock
      (global as any).performance = mockPerformance;
    });

    it('records memory usage when performance.memory is available', () => {
      performanceMonitor.recordMemoryUsage();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBe(50 * 1024 * 1024); // 50MB
    });

    it('uses estimated memory in development when performance.memory unavailable', () => {
      (global as any).performance = undefined;

      performanceMonitor.recordMemoryUsage();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBe(50 * 1024 * 1024); // Baseline 50MB
    });

    it('handles memory monitoring gracefully when not available', () => {
      (global as any).performance = undefined;
      (global as any).__DEV__ = false;
      (global as any).nativePerformanceNow = undefined;

      performanceMonitor.recordMemoryUsage();

      // Should not throw error
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeUndefined();
    });

    it('handles memory recording errors gracefully', () => {
      // Mock performance to throw error
      (global as any).performance = {
        get memory() {
          throw new Error('Memory access denied');
        },
      };

      performanceMonitor.recordMemoryUsage();

      // Should not throw error
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeUndefined();
    });

    it('checks memory usage against budget', () => {
      // Mock high memory usage (400MB, over error threshold of 300MB)
      (global as any).performance = {
        memory: {
          usedJSHeapSize: 400 * 1024 * 1024,
        },
      };

      performanceMonitor.recordMemoryUsage();

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const memoryStatus = budgetStatus.find(s => s.metric === 'memoryUsage');
      expect(memoryStatus?.status).toBe('error');
    });
  });

  describe('FPS Tracking', () => {
    it('records FPS correctly', () => {
      performanceMonitor.recordFPS(60);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBe(60);
    });

    it('warns about low FPS', () => {
      performanceMonitor.recordFPS(45); // Below 55 FPS threshold

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBe(45);
    });

    it('checks FPS against budget (inverted logic)', () => {
      // Low FPS (40) should be error status (below 50 FPS error threshold)
      performanceMonitor.recordFPS(40);

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const fpsStatus = budgetStatus.find(s => s.metric === 'fps');
      expect(fpsStatus?.status).toBe('error');
    });

    it('handles good FPS correctly', () => {
      performanceMonitor.recordFPS(58); // Above warning threshold of 55

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const fpsStatus = budgetStatus.find(s => s.metric === 'fps');
      expect(fpsStatus?.status).toBe('good');
    });
  });

  describe('Budget Status', () => {
    it('returns good status for metrics within budget', () => {
      performanceMonitor.recordStartupTime(); // Should be very fast with fake timers

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const startupStatus = budgetStatus.find(s => s.metric === 'startupTime');
      expect(startupStatus?.status).toBe('good');
      expect(startupStatus?.value).toBe(0);
    });

    it('returns good status for undefined metrics', () => {
      const budgetStatus = performanceMonitor.getBudgetStatus();
      const undefinedStatus = budgetStatus.find(s => s.metric === 'apiResponseTime');
      expect(undefinedStatus?.status).toBe('good');
      expect(undefinedStatus?.value).toBeUndefined();
    });

    it('handles mixed budget status correctly', () => {
      // Good startup time
      performanceMonitor.recordStartupTime();

      // Bad FPS
      performanceMonitor.recordFPS(30);

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const startupStatus = budgetStatus.find(s => s.metric === 'startupTime');
      const fpsStatus = budgetStatus.find(s => s.metric === 'fps');

      expect(startupStatus?.status).toBe('good');
      expect(fpsStatus?.status).toBe('error');
    });
  });

  describe('Performance Report Generation', () => {
    it('generates report with no violations', () => {
      // Record good metrics
      performanceMonitor.recordStartupTime(); // Fast
      performanceMonitor.recordFPS(60); // Good FPS

      const report = performanceMonitor.generateReport();
      expect(report).toContain('📊 Performance Budget Report');
      expect(report).toContain('✅ Within Budget');
      expect(report).not.toContain('❌ Budget Violations');
      expect(report).not.toContain('⚠️ Budget Warnings');
    });

    it('generates report with warnings', () => {
      // Record moderate metrics
      jest.advanceTimersByTime(4000); // 4s startup (warning)
      performanceMonitor.recordStartupTime();

      const report = performanceMonitor.generateReport();
      expect(report).toContain('⚠️ Budget Warnings');
      expect(report).toContain('startupTime: 4000ms');
    });

    it('generates report with errors', () => {
      // Record bad metrics
      jest.advanceTimersByTime(6000); // 6s startup (error)
      performanceMonitor.recordStartupTime();
      performanceMonitor.recordFPS(30); // Low FPS (error)

      const report = performanceMonitor.generateReport();
      expect(report).toContain('❌ Budget Violations (Errors)');
      expect(report).toContain('startupTime: 6000ms');
      expect(report).toContain('fps: 30fps');
    });

    it('generates comprehensive report with mixed status', () => {
      // Mixed metrics
      jest.advanceTimersByTime(4000); // Warning
      performanceMonitor.recordStartupTime();
      performanceMonitor.recordFPS(30); // Error
      performanceMonitor.recordFPS(60); // Good (overwrites previous)

      const report = performanceMonitor.generateReport();
      expect(report).toContain('📊 Performance Budget Report');
      expect(report).toContain('⚠️ Budget Warnings');
      expect(report).toContain('✅ Within Budget');
    });
  });

  describe('Reset Functionality', () => {
    it('resets all metrics and timers', () => {
      // Record some metrics
      performanceMonitor.recordStartupTime();
      performanceMonitor.recordFPS(45);
      performanceMonitor.startNavigationTimer();
      performanceMonitor.startApiTimer('test-request');

      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);

      // Should not record navigation/API without restarting timers
      performanceMonitor.recordNavigationTime('TestScreen');
      performanceMonitor.recordApiResponseTime('test-request', '/api/test');

      const metricsAfterReset = performanceMonitor.getMetrics();
      expect(metricsAfterReset.navigationTime).toBeUndefined();
      expect(metricsAfterReset.apiResponseTime).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles rapid successive measurements', () => {
      // Multiple rapid API calls
      for (let i = 0; i < 100; i++) {
        performanceMonitor.startApiTimer(`request-${i}`);
        jest.advanceTimersByTime(10);
        performanceMonitor.recordApiResponseTime(`request-${i}`, `/api/endpoint-${i}`);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.apiResponseTime).toBe(10); // Last recorded value
    });

    it('handles zero timing values', () => {
      performanceMonitor.recordStartupTime(); // With fake timers, should be 0

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.startupTime).toBe(0);

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const status = budgetStatus.find(s => s.metric === 'startupTime');
      expect(status?.status).toBe('good');
    });

    it('handles very large timing values', () => {
      jest.advanceTimersByTime(1000000); // 1000 seconds
      performanceMonitor.recordStartupTime();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.startupTime).toBe(1000000);

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const status = budgetStatus.find(s => s.metric === 'startupTime');
      expect(status?.status).toBe('error');
    });

    it('handles negative FPS values', () => {
      performanceMonitor.recordFPS(-10);

      const budgetStatus = performanceMonitor.getBudgetStatus();
      const fpsStatus = budgetStatus.find(s => s.metric === 'fps');
      expect(fpsStatus?.status).toBe('error');
    });
  });

  describe('Integration with Logger', () => {
    it('logs debug information for normal operations', () => {
      const { logger } = require('../../utils/logger');

      performanceMonitor.recordStartupTime();
      performanceMonitor.recordFPS(60);

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('App startup time'));
    });

    it('logs warnings for performance issues', () => {
      const { logger } = require('../../utils/logger');

      performanceMonitor.recordFPS(45); // Below warning threshold

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Low FPS detected: 45'));
    });

    it('logs errors for budget violations', () => {
      const { logger } = require('../../utils/logger');

      jest.advanceTimersByTime(6000); // Over error threshold
      performanceMonitor.recordStartupTime();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Performance budget exceeded for startupTime')
      );
    });
  });
});

describe('Singleton Performance Monitor', () => {
  it('exports singleton instance', () => {
    expect(performanceMonitor).toBeDefined();
    expect(typeof performanceMonitor.recordStartupTime).toBe('function');
  });

  it('auto-tracks memory usage in development', () => {
    jest.useFakeTimers();
    const { logger } = require('../../utils/logger');

    // Ensure we're in development mode for this test
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    // Mock global.performance.memory for memory tracking to work
    const originalPerformance = global.performance;
    (global as any).performance = {
      memory: {
        usedJSHeapSize: 52428800 // 50MB in bytes
      }
    };

    // Clear previous logger calls
    logger.debug.mockClear();

    // Manually call recordMemoryUsage to simulate the setInterval call
    performanceMonitor.recordMemoryUsage();

    // Should have been called - memory tracking logs memory usage
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Memory usage')
    );

    // Restore original values
    (global as any).__DEV__ = originalDev;
    global.performance = originalPerformance;
    jest.useRealTimers();
  });
});

describe('Production vs Development Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('behaves differently in production mode', () => {
    jest.useFakeTimers();
    (global as any).__DEV__ = false;
    const { logger } = require('../../utils/logger');

    performanceMonitor.reset();
    jest.advanceTimersByTime(6000);
    performanceMonitor.recordStartupTime();

    // Should still log errors in production (via checkBudget method)
    expect(logger.error).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('reports budget violations correctly in production', () => {
    jest.useFakeTimers();
    (global as any).__DEV__ = false;
    const { logger } = require('../../utils/logger');

    performanceMonitor.reset();
    jest.advanceTimersByTime(6000);
    performanceMonitor.recordStartupTime();

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Performance budget violation: error for startupTime')
    );

    jest.useRealTimers();
  });
});