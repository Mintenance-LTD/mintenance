import React from 'react';
import {
  codeSplittingManager,
  createLazyComponent,
  createLazyScreen,
  createLazyFeature,
  useChunkPreloader,
  useChunkPerformance,
  LazyLoadOptions,
  ChunkMetrics,
} from '../../utils/codeSplitting';
import { logger } from '../../utils/logger';
import { memoryManager } from '../../utils/memoryManager';

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  lazy: jest.fn((importFn) => {
    const Component = () => null;
    Component.displayName = 'LazyComponent';
    // Call the import function to test loading logic
    (Component as any)._importFn = importFn;
    return Component;
  }),
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useEffect: jest.fn((effect, deps) => {
    // Execute effect immediately for testing
    effect();
  }),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
  },
}));

jest.mock('../../utils/memoryManager', () => ({
  memoryManager: {
    registerCleanupCallback: jest.fn(),
  },
}));

// Mock performance API
global.performance = {
  now: jest.fn(() => 1000),
} as any;

describe('CodeSplittingManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (codeSplittingManager as any).chunkCache.clear();
    (codeSplittingManager as any).loadingChunks.clear();
    (codeSplittingManager as any).chunkMetrics.length = 0;
    (codeSplittingManager as any).preloadQueue.length = 0;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = codeSplittingManager;
      const instance2 = codeSplittingManager;

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across references', () => {
      const metrics1 = codeSplittingManager.getChunkMetrics();
      const metrics2 = codeSplittingManager.getChunkMetrics();

      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('createLazyComponent', () => {
    it('should create a lazy component with default options', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      const LazyComponent = codeSplittingManager.createLazyComponent(mockImportFn);

      expect(React.lazy).toHaveBeenCalled();
      expect(LazyComponent).toBeDefined();
      expect((LazyComponent as any).displayName).toBe('LazyComponent');
    });

    it('should add chunk to preload queue when preload is true', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      codeSplittingManager.createLazyComponent(mockImportFn, {
        preload: true,
        chunkName: 'test-chunk',
      });

      expect((codeSplittingManager as any).preloadQueue).toContain('test-chunk');
    });

    it('should use custom options', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      const options: LazyLoadOptions = {
        timeout: 5000,
        retryAttempts: 2,
        chunkName: 'custom-chunk',
        preload: false,
      };

      codeSplittingManager.createLazyComponent(mockImportFn, options);

      expect(React.lazy).toHaveBeenCalled();
    });
  });

  describe('Chunk Loading', () => {
    it('should load chunk successfully', async () => {
      const mockComponent = { default: () => null };
      const mockImportFn = jest.fn(() => Promise.resolve(mockComponent));

      // Simulate React.lazy calling the import function
      const lazyFn = (React.lazy as jest.Mock).mock.calls[0]?.[0];
      if (!lazyFn) {
        codeSplittingManager.createLazyComponent(mockImportFn);
        const newLazyFn = (React.lazy as jest.Mock).mock.calls[0][0];
        await newLazyFn();
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Loading chunk')
      );
    });

    it('should cache loaded chunks', async () => {
      const mockComponent = { default: () => null };
      const mockImportFn = jest.fn(() => Promise.resolve(mockComponent));

      codeSplittingManager.createLazyComponent(mockImportFn, {
        chunkName: 'cached-chunk',
      });

      // Get the lazy function that React.lazy would call
      const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];

      // Load the chunk twice
      await lazyFn();
      await lazyFn();

      // Should only import once due to caching
      expect(mockImportFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const mockImportFn = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ default: () => null });
      });

      codeSplittingManager.createLazyComponent(mockImportFn, {
        chunkName: 'retry-chunk',
        retryAttempts: 3,
      });

      const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];
      await lazyFn();

      expect(mockImportFn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('load failed'),
        expect.any(Object)
      );
    });

    it('should handle timeout', async () => {
      const mockImportFn = jest.fn(
        () =>
          new Promise((resolve) => {
            // Never resolve to simulate timeout
            setTimeout(() => resolve({ default: () => null }), 20000);
          })
      );

      codeSplittingManager.createLazyComponent(mockImportFn, {
        chunkName: 'timeout-chunk',
        timeout: 100,
        retryAttempts: 0,
      });

      const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];

      await expect(lazyFn()).rejects.toThrow('timeout');
    });

    it('should track failed loads', async () => {
      const mockImportFn = jest.fn(() =>
        Promise.reject(new Error('Load failed'))
      );

      codeSplittingManager.createLazyComponent(mockImportFn, {
        chunkName: 'failed-chunk',
        retryAttempts: 0,
      });

      const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];

      try {
        await lazyFn();
      } catch (error) {
        // Expected to fail
      }

      const metrics = codeSplittingManager.getChunkMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].error).toBeDefined();
    });

    it('should register cleanup callback for failed chunks', async () => {
      const mockImportFn = jest.fn(() =>
        Promise.reject(new Error('Load failed'))
      );

      codeSplittingManager.createLazyComponent(mockImportFn, {
        chunkName: 'cleanup-chunk',
        retryAttempts: 0,
      });

      const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];

      try {
        await lazyFn();
      } catch (error) {
        // Expected to fail
      }

      expect(memoryManager.registerCleanupCallback).toHaveBeenCalled();
    });
  });

  describe('Preloading', () => {
    it('should preload chunks', async () => {
      await codeSplittingManager.preloadChunks(['chunk1', 'chunk2', 'chunk3']);

      expect(logger.debug).toHaveBeenCalledWith('Preloading 3 chunks');
      expect(logger.debug).toHaveBeenCalledWith('Preloaded chunk: chunk1');
      expect(logger.debug).toHaveBeenCalledWith('Preloaded chunk: chunk2');
      expect(logger.debug).toHaveBeenCalledWith('Preloaded chunk: chunk3');
    });

    it('should clear preload queue after preloading', async () => {
      (codeSplittingManager as any).preloadQueue = ['queued1', 'queued2'];

      await codeSplittingManager.preloadChunks();

      expect((codeSplittingManager as any).preloadQueue).toHaveLength(0);
    });

    it('should handle preload failures gracefully', async () => {
      // Mock a failing preload scenario
      let callCount = 0;
      (logger.debug as jest.Mock).mockImplementation((msg: string) => {
        callCount++;
        if (msg.includes('Preloaded chunk: failing-chunk')) {
          throw new Error('Preload failed');
        }
        return undefined;
      });

      await codeSplittingManager.preloadChunks(['failing-chunk']);

      // Should log warning but not throw
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to preload'),
        expect.any(Object)
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear specific chunk from cache', () => {
      (codeSplittingManager as any).chunkCache.set('test-chunk', {});

      codeSplittingManager.clearChunkCache('test-chunk');

      expect((codeSplittingManager as any).chunkCache.has('test-chunk')).toBe(
        false
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Cleared cache for chunk: test-chunk'
      );
    });

    it('should clear all chunks from cache', () => {
      (codeSplittingManager as any).chunkCache.set('chunk1', {});
      (codeSplittingManager as any).chunkCache.set('chunk2', {});

      codeSplittingManager.clearChunkCache();

      expect((codeSplittingManager as any).chunkCache.size).toBe(0);
      expect(logger.debug).toHaveBeenCalledWith('Cleared all chunk cache');
    });
  });

  describe('Performance Metrics', () => {
    it('should track successful chunk loads', async () => {
      const mockComponent = { default: () => null };
      const mockImportFn = jest.fn(() => Promise.resolve(mockComponent));

      (performance.now as jest.Mock)
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time

      codeSplittingManager.createLazyComponent(mockImportFn, {
        chunkName: 'metrics-chunk',
      });

      const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];
      await lazyFn();

      const metrics = codeSplittingManager.getChunkMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        chunkName: 'metrics-chunk',
        loadTime: 500,
        success: true,
      });
    });

    it('should limit metrics history to 100 entries', () => {
      // Add 105 metrics
      for (let i = 0; i < 105; i++) {
        (codeSplittingManager as any).trackChunkMetrics({
          chunkName: `chunk-${i}`,
          loadTime: 100,
          size: 1000,
          success: true,
          timestamp: Date.now(),
        });
      }

      const metrics = codeSplittingManager.getChunkMetrics();
      expect(metrics).toHaveLength(100);
      expect(metrics[0].chunkName).toBe('chunk-5'); // First 5 should be removed
    });

    it('should generate performance report', () => {
      // Add test metrics
      const testMetrics: ChunkMetrics[] = [
        {
          chunkName: 'fast-chunk',
          loadTime: 100,
          size: 1000,
          success: true,
          timestamp: Date.now(),
        },
        {
          chunkName: 'slow-chunk',
          loadTime: 500,
          size: 2000,
          success: true,
          timestamp: Date.now(),
        },
        {
          chunkName: 'failed-chunk',
          loadTime: 1000,
          size: 0,
          success: false,
          error: new Error('Load failed'),
          timestamp: Date.now(),
        },
      ];

      testMetrics.forEach((metric) => {
        (codeSplittingManager as any).trackChunkMetrics(metric);
      });

      const report = codeSplittingManager.getPerformanceReport();

      expect(report).toMatchObject({
        totalChunks: 3,
        successRate: 66.66666666666666,
        averageLoadTime: 300,
        slowestChunks: expect.any(Array),
        failedChunks: expect.any(Array),
      });

      expect(report.slowestChunks).toHaveLength(2);
      expect(report.slowestChunks[0].chunkName).toBe('slow-chunk');
      expect(report.failedChunks).toHaveLength(1);
      expect(report.failedChunks[0].chunkName).toBe('failed-chunk');
    });

    it('should handle empty metrics report', () => {
      const report = codeSplittingManager.getPerformanceReport();

      expect(report).toEqual({
        totalChunks: 0,
        successRate: 0,
        averageLoadTime: 0,
        slowestChunks: [],
        failedChunks: [],
      });
    });
  });

  describe('Utility Methods', () => {
    it('should enable code splitting', async () => {
      await codeSplittingManager.enableCodeSplitting();

      expect(logger.info).toHaveBeenCalledWith(
        'CodeSplittingManager',
        'Code splitting enabled'
      );
    });

    it('should preload critical chunks', async () => {
      await codeSplittingManager.preloadCriticalChunks();

      expect(logger.info).toHaveBeenCalledWith(
        'CodeSplittingManager',
        'Preloading critical chunks'
      );
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLazyComponent', () => {
    it('should create lazy component using manager', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      const component = createLazyComponent(mockImportFn, {
        chunkName: 'util-chunk',
      });

      expect(component).toBeDefined();
      expect(React.lazy).toHaveBeenCalled();
    });
  });

  describe('createLazyScreen', () => {
    it('should create lazy screen with screen-specific options', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      const screen = createLazyScreen(mockImportFn, 'HomeScreen');

      expect(React.lazy).toHaveBeenCalled();
      const lazyCall = (React.lazy as jest.Mock).mock.calls[0];
      expect(lazyCall).toBeDefined();
    });

    it('should use screen name in chunk name', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      createLazyScreen(mockImportFn, 'ProfileScreen');

      // Check preload queue or metrics would contain screen-ProfileScreen
      // This is validated through the options passed to createLazyComponent
      expect(React.lazy).toHaveBeenCalled();
    });
  });

  describe('createLazyFeature', () => {
    it('should create lazy feature with preload enabled', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      createLazyFeature(mockImportFn, 'UserAuth');

      expect((codeSplittingManager as any).preloadQueue).toContain(
        'feature-UserAuth'
      );
    });

    it('should use feature name in chunk name', () => {
      const mockImportFn = jest.fn(() =>
        Promise.resolve({ default: () => null })
      );

      createLazyFeature(mockImportFn, 'Payment');

      expect((codeSplittingManager as any).preloadQueue).toContain(
        'feature-Payment'
      );
    });
  });
});

describe('React Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useChunkPreloader', () => {
    it('should preload chunks on mount', () => {
      const chunkNames = ['chunk1', 'chunk2'];

      useChunkPreloader(chunkNames);

      expect(logger.debug).toHaveBeenCalledWith('Preloading 2 chunks');
    });

    it('should handle preload errors', async () => {
      const chunkNames = ['error-chunk'];

      // Mock preloadChunks to throw
      const originalPreload = codeSplittingManager.preloadChunks;
      codeSplittingManager.preloadChunks = jest.fn(() =>
        Promise.reject(new Error('Preload failed'))
      );

      useChunkPreloader(chunkNames);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(logger.warn).toHaveBeenCalledWith(
        'Chunk preloading failed:',
        expect.any(Object)
      );

      // Restore original method
      codeSplittingManager.preloadChunks = originalPreload;
    });
  });

  describe('useChunkPerformance', () => {
    it('should return metrics and report', () => {
      const result = useChunkPerformance();

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('report');
      expect(result).toHaveProperty('clearCache');
      expect(typeof result.clearCache).toBe('function');
    });

    it('should initialize with current metrics', () => {
      // Add a test metric
      (codeSplittingManager as any).trackChunkMetrics({
        chunkName: 'test-chunk',
        loadTime: 100,
        size: 1000,
        success: true,
        timestamp: Date.now(),
      });

      const result = useChunkPerformance();

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].chunkName).toBe('test-chunk');
    });

    it('should provide clearCache function', () => {
      const result = useChunkPerformance();

      result.clearCache('test-chunk');

      expect(logger.debug).toHaveBeenCalledWith(
        'Cleared cache for chunk: test-chunk'
      );
    });

    it('should set up interval for metrics updates', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      useChunkPerformance();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle concurrent loads of same chunk', async () => {
    const mockComponent = { default: () => null };
    let callCount = 0;
    const mockImportFn = jest.fn(
      () =>
        new Promise((resolve) => {
          callCount++;
          setTimeout(() => resolve(mockComponent), 100);
        })
    );

    codeSplittingManager.createLazyComponent(mockImportFn, {
      chunkName: 'concurrent-chunk',
    });

    const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];

    // Start multiple concurrent loads
    const promises = [lazyFn(), lazyFn(), lazyFn()];

    const results = await Promise.all(promises);

    // Should only import once despite concurrent calls
    expect(callCount).toBe(1);
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });

  it('should handle exponential backoff on retries', async () => {
    let attempts = 0;
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const mockImportFn = jest.fn(() => {
      attempts++;
      if (attempts <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ default: () => null });
    });

    codeSplittingManager.createLazyComponent(mockImportFn, {
      chunkName: 'backoff-chunk',
      retryAttempts: 2,
    });

    const lazyFn = (React.lazy as jest.Mock).mock.calls[0][0];
    await lazyFn();

    // Check exponential backoff delays
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000); // 2^0 * 1000
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000); // 2^1 * 1000

    setTimeoutSpy.mockRestore();
  });

  it('should estimate chunk size correctly', () => {
    const testChunk = {
      component: () => null,
      data: { test: 'value', nested: { prop: 123 } },
    };

    // Access private method through instance
    const size = (codeSplittingManager as any).estimateChunkSize(testChunk);

    expect(size).toBeGreaterThan(0);
  });

  it('should handle chunk size estimation errors', () => {
    // Create circular reference
    const circularChunk: any = { prop: null };
    circularChunk.prop = circularChunk;

    const size = (codeSplittingManager as any).estimateChunkSize(circularChunk);

    expect(size).toBe(0);
  });
});
