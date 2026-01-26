import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  MemoryManager,
  memoryManager,
  useMemoryCleanup,
  withMemoryTracking,
  MemoryUsage,
  MemoryCleanupOptions,
  ComponentMemoryTracker,
} from '../../utils/memoryManager';
import { logger } from '../../utils/logger';

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentState: 'active',
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

// Mock React hooks
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  const useEffect = jest.fn((callback) => {
    // Execute the callback immediately for testing
    const cleanup = callback();
    // Store cleanup function for testing
    if (cleanup) {
      (useEffect as any).cleanup = cleanup;
    }
  });

  return {
    ...actualReact,
    useEffect,
    forwardRef: jest.fn((component) => component),
    createElement: jest.fn((component, props) => ({ component, props })),
  };
});

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton instance
    (MemoryManager as any).instance = null;
    manager = MemoryManager.getInstance();
  });

  afterEach(() => {
    manager.stopMemoryMonitoring();
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MemoryManager.getInstance();
      const instance2 = MemoryManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize monitoring on creation', () => {
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });
  });

  describe('getCurrentMemoryUsage', () => {
    it('should return current memory usage', async () => {
      const usage = await manager.getCurrentMemoryUsage();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('total');
      expect(usage).toHaveProperty('percentage');
      expect(usage).toHaveProperty('timestamp');
      expect(usage).toHaveProperty('componentCounts');
      expect(usage).toHaveProperty('listenerCounts');
    });

    it('should calculate percentage correctly', async () => {
      const usage = await manager.getCurrentMemoryUsage();

      const expectedPercentage = (usage.used / usage.total) * 100;
      expect(usage.percentage).toBeCloseTo(expectedPercentage, 2);
    });

    it('should store usage in history', async () => {
      const usage1 = await manager.getCurrentMemoryUsage();
      const usage2 = await manager.getCurrentMemoryUsage();

      const history = manager.getMemoryHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject(usage1);
      expect(history[1]).toMatchObject(usage2);
    });

    it('should limit history size', async () => {
      // Create more than HISTORY_LIMIT (100) entries
      for (let i = 0; i < 105; i++) {
        await manager.getCurrentMemoryUsage();
      }

      const history = manager.getMemoryHistory();
      expect(history).toHaveLength(100);
    });

    it('should handle errors and throw', async () => {
      // Force an error by mocking Date.now
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => {
        throw new Error('Test error');
      });

      await expect(manager.getCurrentMemoryUsage()).rejects.toThrow('Test error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get memory usage:',
        expect.any(Error)
      );

      Date.now = originalDateNow;
    });
  });

  describe('Memory Monitoring', () => {
    it('should start monitoring by default', async () => {
      jest.advanceTimersByTime(60000); // 1 minute
      await Promise.resolve();
      expect(logger.performance).toHaveBeenCalled();
    });

    it('should stop monitoring', () => {
      manager.stopMemoryMonitoring();
      expect(logger.debug).toHaveBeenCalledWith('Memory monitoring stopped');
      jest.clearAllMocks();

      jest.advanceTimersByTime(60000);
      expect(logger.performance).not.toHaveBeenCalled();
    });

    it('should not double-start monitoring', () => {
      const startSpy = jest.spyOn(manager as any, 'startMemoryMonitoring');
      (manager as any).startMemoryMonitoring();

      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it('should not double-stop monitoring', () => {
      manager.stopMemoryMonitoring();
      jest.clearAllMocks();

      manager.stopMemoryMonitoring();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('performCleanup', () => {
    it('should perform standard cleanup', async () => {
      await manager.performCleanup();

      expect(logger.debug).toHaveBeenCalledWith(
        'Starting memory cleanup',
        expect.objectContaining({
          options: expect.objectContaining({
            aggressive: false,
            clearCaches: true,
            removeListeners: false,
            gcSuggest: true,
          }),
        })
      );
      expect(logger.performance).toHaveBeenCalledWith(
        'Memory cleanup',
        expect.any(Number),
        expect.objectContaining({ type: 'standard' })
      );
    });

    it('should perform aggressive cleanup', async () => {
      await manager.performCleanup({ aggressive: true });

      expect(logger.performance).toHaveBeenCalledWith(
        'Memory cleanup',
        expect.any(Number),
        expect.objectContaining({ type: 'aggressive' })
      );
    });

    it('should clear caches when requested', async () => {
      await manager.performCleanup({ clearCaches: true });

      expect(logger.debug).toHaveBeenCalledWith('Image caches cleared');
    });

    it('should remove listeners when requested', async () => {
      await manager.performCleanup({ removeListeners: true });

      expect(logger.debug).toHaveBeenCalledWith('Stale listeners removed');
    });

    it('should call garbage collection if available', async () => {
      (global as any).gc = jest.fn();

      await manager.performCleanup({ gcSuggest: true });

      expect(global.gc).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Garbage collection suggested');

      delete (global as any).gc;
    });

    it('should run cleanup callbacks', async () => {
      const callback = jest.fn();
      manager.registerCleanupCallback(callback);

      await manager.performCleanup();

      expect(callback).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Executed 1 cleanup callbacks');
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock error in clearImageCaches
      jest.spyOn(manager as any, 'clearImageCaches').mockRejectedValue(new Error('Cache error'));

      await manager.performCleanup();

      expect(logger.error).toHaveBeenCalledWith(
        'Memory cleanup failed:',
        expect.any(Error)
      );
    });
  });

  describe('Memory Thresholds', () => {
    it('should trigger warning at WARNING_THRESHOLD', async () => {
      // Mock high memory usage
      jest.spyOn(manager, 'getCurrentMemoryUsage').mockResolvedValue({
        used: 200 * 1024 * 1024, // 200MB (above 150MB warning)
        total: 2 * 1024 * 1024 * 1024,
        percentage: 10,
        timestamp: Date.now(),
        componentCounts: {},
        listenerCounts: {},
      });

      await (manager as any).checkMemoryUsage();

      expect(logger.warn).toHaveBeenCalledWith(
        'High memory usage detected',
        expect.objectContaining({
          used: 200 * 1024 * 1024,
        })
      );
    });

    it('should trigger critical cleanup at CRITICAL_THRESHOLD', async () => {
      // Mock critical memory usage
      jest.spyOn(manager, 'getCurrentMemoryUsage').mockResolvedValue({
        used: 400 * 1024 * 1024, // 400MB (above 300MB critical)
        total: 2 * 1024 * 1024 * 1024,
        percentage: 20,
        timestamp: Date.now(),
        componentCounts: {},
        listenerCounts: {},
      });

      const aggressiveCleanupSpy = jest.spyOn(manager as any, 'performAggressiveCleanup');

      await (manager as any).checkMemoryUsage();

      expect(logger.error).toHaveBeenCalledWith(
        'Critical memory usage detected',
        expect.any(Error),
        expect.objectContaining({
          used: 400 * 1024 * 1024,
        })
      );
      expect(aggressiveCleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Component Tracking', () => {
    it('should track component mounting', () => {
      manager.trackComponent('TestComponent', 'mount');

      const report = manager.getComponentMemoryReport();
      expect(report).toHaveLength(1);
      expect(report[0]).toMatchObject({
        componentName: 'TestComponent',
        mountCount: 1,
        unmountCount: 0,
        currentInstances: 1,
        memoryLeaks: 0,
      });
    });

    it('should track component unmounting', () => {
      manager.trackComponent('TestComponent', 'mount');
      manager.trackComponent('TestComponent', 'unmount');

      const report = manager.getComponentMemoryReport();
      expect(report[0]).toMatchObject({
        mountCount: 1,
        unmountCount: 1,
        currentInstances: 0,
      });
    });

    it('should detect memory leaks', () => {
      // Unmount without mount (memory leak)
      manager.trackComponent('LeakyComponent', 'unmount');

      expect(logger.warn).toHaveBeenCalledWith(
        'Potential memory leak detected in LeakyComponent',
        expect.objectContaining({
          mountCount: 0,
          unmountCount: 1,
        })
      );

      const report = manager.getComponentMemoryReport();
      expect(report[0].memoryLeaks).toBe(1);
    });

    it('should sort report by current instances', () => {
      manager.trackComponent('Component1', 'mount');
      manager.trackComponent('Component1', 'mount');
      manager.trackComponent('Component2', 'mount');
      manager.trackComponent('Component3', 'mount');
      manager.trackComponent('Component3', 'mount');
      manager.trackComponent('Component3', 'mount');

      const report = manager.getComponentMemoryReport();
      expect(report[0].componentName).toBe('Component3');
      expect(report[0].currentInstances).toBe(3);
      expect(report[1].componentName).toBe('Component1');
      expect(report[1].currentInstances).toBe(2);
    });
  });

  describe('Callbacks', () => {
    it('should register and execute cleanup callbacks', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.registerCleanupCallback(callback1);
      manager.registerCleanupCallback(callback2);

      await manager.performCleanup();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unregister cleanup callbacks', async () => {
      const callback = jest.fn();
      const unregister = manager.registerCleanupCallback(callback);

      unregister();

      await manager.performCleanup();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle cleanup callback errors', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      manager.registerCleanupCallback(errorCallback);

      await manager.performCleanup();

      expect(logger.warn).toHaveBeenCalledWith(
        'Cleanup callback failed:',
        expect.objectContaining({ data: expect.any(Error) })
      );
    });

    it('should register and notify memory warning callbacks', async () => {
      const warningCallback = jest.fn();
      manager.registerMemoryWarningCallback(warningCallback);

      // Trigger warning
      jest.spyOn(manager, 'getCurrentMemoryUsage').mockResolvedValue({
        used: 200 * 1024 * 1024,
        total: 2 * 1024 * 1024 * 1024,
        percentage: 10,
        timestamp: Date.now(),
        componentCounts: {},
        listenerCounts: {},
      });

      await (manager as any).checkMemoryUsage();

      expect(warningCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          used: 200 * 1024 * 1024,
        })
      );
    });

    it('should unregister memory warning callbacks', async () => {
      const callback = jest.fn();
      const unregister = manager.registerMemoryWarningCallback(callback);

      unregister();

      jest.spyOn(manager, 'getCurrentMemoryUsage').mockResolvedValue({
        used: 200 * 1024 * 1024,
        total: 2 * 1024 * 1024 * 1024,
        percentage: 10,
        timestamp: Date.now(),
        componentCounts: {},
        listenerCounts: {},
      });

      await (manager as any).checkMemoryUsage();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Memory Report', () => {
    it('should generate empty report with no data', () => {
      const report = manager.generateMemoryReport();

      expect(report).toMatchObject({
        current: null,
        average: 0,
        peak: 0,
        trend: 'stable',
        issues: ['No memory data available'],
      });
    });

    it('should generate report with current usage', async () => {
      await manager.getCurrentMemoryUsage();

      const report = manager.generateMemoryReport();

      expect(report.current).toBeDefined();
      expect(report.average).toBeGreaterThan(0);
      expect(report.peak).toBeGreaterThan(0);
    });

    it('should detect increasing trend', async () => {
      // Mock increasing memory usage
      let baseUsage = 100 * 1024 * 1024;
      jest.spyOn(manager as any, 'simulateMemoryUsage').mockImplementation(() => {
        baseUsage += 20 * 1024 * 1024;
        return {
          used: baseUsage,
          total: 2 * 1024 * 1024 * 1024,
        };
      });

      // Generate 5 data points
      for (let i = 0; i < 5; i++) {
        await manager.getCurrentMemoryUsage();
      }

      const report = manager.generateMemoryReport();
      expect(report.trend).toBe('increasing');
    });

    it('should detect decreasing trend', async () => {
      // Mock decreasing memory usage
      let baseUsage = 200 * 1024 * 1024;
      jest.spyOn(manager as any, 'simulateMemoryUsage').mockImplementation(() => {
        baseUsage -= 20 * 1024 * 1024;
        return {
          used: baseUsage,
          total: 2 * 1024 * 1024 * 1024,
        };
      });

      // Generate 5 data points
      for (let i = 0; i < 5; i++) {
        await manager.getCurrentMemoryUsage();
      }

      const report = manager.generateMemoryReport();
      expect(report.trend).toBe('decreasing');
    });

    it('should identify critical usage issue', async () => {
      jest.spyOn(manager as any, 'simulateMemoryUsage').mockReturnValue({
        used: 1900 * 1024 * 1024,
        total: 2 * 1024 * 1024 * 1024,
      });

      await manager.getCurrentMemoryUsage();

      const report = manager.generateMemoryReport();
      expect(report.issues).toContain('Critical memory usage detected');
    });

    it('should identify memory leaks in report', async () => {
      manager.trackComponent('LeakyComponent', 'unmount');
      await manager.getCurrentMemoryUsage();

      const report = manager.generateMemoryReport();
      expect(report.issues).toContain('Potential memory leaks in 1 components');
    });
  });

  describe('AppState Listener', () => {
    it('should perform cleanup on background', () => {
      const changeListener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      const performCleanupSpy = jest.spyOn(manager, 'performCleanup');

      changeListener('background');

      expect(logger.debug).toHaveBeenCalledWith(
        'App moved to background, performing cleanup'
      );
      expect(performCleanupSpy).toHaveBeenCalled();
    });

    it('should not cleanup on active state', () => {
      const changeListener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      const performCleanupSpy = jest.spyOn(manager, 'performCleanup');

      jest.clearAllMocks();
      changeListener('active');

      expect(performCleanupSpy).not.toHaveBeenCalled();
    });
  });

  describe('Compatibility Methods', () => {
    it('should clear unused modules', async () => {
      await manager.clearUnusedModules();

      expect(logger.info).toHaveBeenCalledWith(
        'MemoryManager',
        'Clearing unused modules'
      );
    });

    it('should get memory usage', async () => {
      const usage = await manager.getMemoryUsage();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('total');
    });

    it('should force garbage collection', async () => {
      await manager.forceGarbageCollection();

      expect(logger.info).toHaveBeenCalledWith(
        'MemoryManager',
        'Forcing garbage collection'
      );
    });

    it('should optimize image cache', async () => {
      await manager.optimizeImageCache();

      expect(logger.info).toHaveBeenCalledWith(
        'MemoryManager',
        'Optimizing image cache'
      );
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(memoryManager).toBeInstanceOf(MemoryManager);
    });
  });
});

describe('useMemoryCleanup Hook', () => {
  it('should register cleanup function', () => {
    const cleanup = jest.fn();
    const registerSpy = jest.spyOn(memoryManager, 'registerCleanupCallback');

    useMemoryCleanup(cleanup);

    expect(registerSpy).toHaveBeenCalledWith(cleanup);
  });

  it('should unregister on unmount', () => {
    const cleanup = jest.fn();
    const unregister = jest.fn();

    jest.spyOn(memoryManager, 'registerCleanupCallback').mockReturnValue(unregister);

    useMemoryCleanup(cleanup);

    // Get the cleanup function from useEffect
    const effectCleanup = (React.useEffect as any).cleanup;
    if (effectCleanup) {
      effectCleanup();
    }

    expect(unregister).toHaveBeenCalled();
  });

  it('should handle no cleanup function', () => {
    const registerSpy = jest.spyOn(memoryManager, 'registerCleanupCallback');

    useMemoryCleanup();

    expect(registerSpy).not.toHaveBeenCalled();
  });
});

describe('withMemoryTracking HOC', () => {
  it('should track component mounting', () => {
    const TestComponent = jest.fn(() => null);
    TestComponent.displayName = 'TestComponent';

    const trackSpy = jest.spyOn(memoryManager, 'trackComponent');

    const WrappedComponent = withMemoryTracking(TestComponent);

    // Simulate rendering
    const props = { test: 'prop' };
    WrappedComponent(props, null);

    expect(trackSpy).toHaveBeenCalledWith('TestComponent', 'mount');
  });

  it('should track component unmounting', () => {
    const TestComponent = jest.fn(() => null);
    TestComponent.displayName = 'TestComponent';

    const trackSpy = jest.spyOn(memoryManager, 'trackComponent');

    const WrappedComponent = withMemoryTracking(TestComponent);
    WrappedComponent({}, null);

    // Get the cleanup function from useEffect
    const effectCleanup = (React.useEffect as any).cleanup;
    if (effectCleanup) {
      effectCleanup();
    }

    expect(trackSpy).toHaveBeenCalledWith('TestComponent', 'unmount');
  });

  it('should use custom component name', () => {
    const TestComponent = jest.fn(() => null);
    const trackSpy = jest.spyOn(memoryManager, 'trackComponent');

    const WrappedComponent = withMemoryTracking(TestComponent, 'CustomName');
    WrappedComponent({}, null);

    expect(trackSpy).toHaveBeenCalledWith('CustomName', 'mount');
  });

  it('should fallback to component name', () => {
    function FunctionComponent() {
      return null;
    }

    const trackSpy = jest.spyOn(memoryManager, 'trackComponent');

    const WrappedComponent = withMemoryTracking(FunctionComponent);
    WrappedComponent({}, null);

    expect(trackSpy).toHaveBeenCalledWith('FunctionComponent', 'mount');
  });

  it('should use Unknown for anonymous component', () => {
    const TestComponent = jest.fn(() => null);
    Object.defineProperty(TestComponent, 'name', { value: '' });
    const trackSpy = jest.spyOn(memoryManager, 'trackComponent');

    const WrappedComponent = withMemoryTracking(TestComponent);
    WrappedComponent({}, null);

    expect(trackSpy).toHaveBeenCalledWith('Unknown', 'mount');
  });

  it('should forward props and ref', () => {
    const TestComponent = jest.fn(() => null);
    const ref = { current: null };
    const props = { test: 'prop', other: 123 };

    const WrappedComponent = withMemoryTracking(TestComponent);
    WrappedComponent(props, ref);

    expect(React.createElement).toHaveBeenCalledWith(
      TestComponent,
      expect.objectContaining({ ...props, ref })
    );
  });
});
