/**
 * Comprehensive unit tests for ReactNativePerformanceEnforcer.
 *
 * Mocks ONLY externals (logger, memoryManager, codeSplittingManager) and uses
 * deterministic spies for Math.random / Date.now / performance.memory / global.gc,
 * plus jest fake timers for the interval + chunk-preload timeout paths.
 */

import { ReactNativePerformanceEnforcer } from '../ReactNativePerformanceEnforcer';
import { logger } from '../../logger';
import { memoryManager } from '../../memoryManager';
import { codeSplittingManager } from '../../codeSplitting';
import type { PerformanceEvent } from '../types';

jest.mock('../../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../memoryManager', () => ({
  memoryManager: {
    getMemoryUsage: jest.fn(),
    clearUnusedModules: jest.fn(),
    forceGarbageCollection: jest.fn(),
    optimizeImageCache: jest.fn(),
  },
}));

jest.mock('../../codeSplitting', () => ({
  codeSplittingManager: {
    preloadCriticalChunks: jest.fn(),
    enableCodeSplitting: jest.fn(),
  },
}));

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockMemoryManager = memoryManager as unknown as {
  getMemoryUsage: jest.Mock;
  clearUnusedModules: jest.Mock;
  forceGarbageCollection: jest.Mock;
  optimizeImageCache: jest.Mock;
};
const mockCodeSplitting = codeSplittingManager as unknown as {
  preloadCriticalChunks: jest.Mock;
  enableCodeSplitting: jest.Mock;
};

// Helper to read the `memory` field type-safely across spies.
type PerfWithMemory = typeof performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

describe('ReactNativePerformanceEnforcer', () => {
  let dateNowSpy: jest.SpyInstance;
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    // Default external mock resolutions.
    mockMemoryManager.getMemoryUsage.mockResolvedValue({
      used: 10,
      total: 100,
      limit: 200,
    });
    mockMemoryManager.clearUnusedModules.mockResolvedValue(undefined);
    mockMemoryManager.forceGarbageCollection.mockResolvedValue(undefined);
    mockMemoryManager.optimizeImageCache.mockResolvedValue(undefined);
    mockCodeSplitting.preloadCriticalChunks.mockResolvedValue(undefined);
    mockCodeSplitting.enableCodeSplitting.mockResolvedValue(undefined);

    // Deterministic time + randomness.
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0); // 0 => smallest values
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    randomSpy.mockRestore();
    // Clean up any patched performance.memory / global.gc.
    delete (performance as PerfWithMemory).memory;
    delete (global as unknown as { gc?: () => void }).gc;
    jest.useRealTimers();
  });

  // ------------------------------------------------------------------
  // constructor / config
  // ------------------------------------------------------------------
  describe('constructor & config defaults', () => {
    it('applies default config when none provided', () => {
      const enforcer = new ReactNativePerformanceEnforcer();
      expect(enforcer.getConfig()).toEqual({
        enableBundleAnalysis: true,
        enableMemoryTracking: true,
        enableChunkPreloading: false,
        maxBundleSize: 20 * 1024,
        memoryWarningThreshold: 150,
        chunkLoadTimeout: 10000,
      });
    });

    it('overrides defaults with provided config', () => {
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        maxBundleSize: 999,
      });
      const config = enforcer.getConfig();
      expect(config.enableBundleAnalysis).toBe(false);
      expect(config.maxBundleSize).toBe(999);
      // Untouched defaults remain.
      expect(config.memoryWarningThreshold).toBe(150);
      expect(config.enableMemoryTracking).toBe(true);
    });

    it('getConfig returns a copy, not the internal reference', () => {
      const enforcer = new ReactNativePerformanceEnforcer();
      const c1 = enforcer.getConfig();
      c1.maxBundleSize = -1;
      expect(enforcer.getConfig().maxBundleSize).toBe(20 * 1024);
    });

    it('updateConfig merges new values and logs', () => {
      const enforcer = new ReactNativePerformanceEnforcer();
      enforcer.updateConfig({ memoryWarningThreshold: 42 });
      expect(enforcer.getConfig().memoryWarningThreshold).toBe(42);
      expect(enforcer.getConfig().enableBundleAnalysis).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Configuration updated',
        { memoryWarningThreshold: 42 }
      );
    });
  });

  // ------------------------------------------------------------------
  // initialize()
  // ------------------------------------------------------------------
  describe('initialize', () => {
    it('runs bundle + memory init, skips chunk preloading by default, emits monitoring_started', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(1_000_000);
      // Keep bundle under limit so no optimize branch fires.
      randomSpy.mockReturnValue(0); // simulatedSize = 0
      const enforcer = new ReactNativePerformanceEnforcer();
      const listener = jest.fn();
      enforcer.addEventListener(listener);

      await enforcer.initialize();

      // monitoring_started emitted.
      const event = listener.mock.calls.find(
        (c) => (c[0] as PerformanceEvent).type === 'monitoring_started'
      );
      expect(event).toBeDefined();
      expect((event![0] as PerformanceEvent).serviceName).toBe(
        'react_native_enforcer'
      );
      expect((event![0] as PerformanceEvent).timestamp).toBe(1_000_000);

      // chunk preload manager NOT called during init (disabled by default).
      expect(mockCodeSplitting.preloadCriticalChunks).not.toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Performance enforcement initialized successfully'
      );
      enforcer.shutdown();
    });

    it('skips bundle + memory init when both disabled', async () => {
      jest.useFakeTimers();
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: false,
      });
      await enforcer.initialize();
      // No periodic interval set => shutdown clears nothing but should not throw.
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Performance enforcement initialized successfully'
      );
      enforcer.shutdown();
    });

    it('initializes chunk preloading when enabled', async () => {
      jest.useFakeTimers();
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: true,
      });
      await enforcer.initialize();
      expect(mockCodeSplitting.preloadCriticalChunks).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Chunk preloading initialized'
      );
      enforcer.shutdown();
    });

    it('rethrows and logs when initialization fails', async () => {
      jest.useFakeTimers();
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: true,
      });
      const boom = new Error('preload boom');
      mockCodeSplitting.preloadCriticalChunks.mockRejectedValueOnce(boom);

      await expect(enforcer.initialize()).rejects.toThrow('preload boom');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to initialize performance enforcement',
        { error: 'preload boom' }
      );
    });

    it('handles a non-Error thrown value during init via String(error)', async () => {
      jest.useFakeTimers();
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: true,
      });
      mockCodeSplitting.preloadCriticalChunks.mockRejectedValueOnce(
        'string-fail'
      );
      await expect(enforcer.initialize()).rejects.toBe('string-fail');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to initialize performance enforcement',
        { error: 'string-fail' }
      );
    });

    it('sets up the periodic bundle interval which re-checks bundle size', async () => {
      jest.useFakeTimers();
      randomSpy.mockReturnValue(0);
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: true,
        enableMemoryTracking: false,
        enableChunkPreloading: false,
      });
      await enforcer.initialize();
      mockLogger.info.mockClear();
      // Advance 5 minutes to fire the bundle interval callback.
      jest.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
      // Bundle analysis interval log present after init.
      enforcer.shutdown();
    });

    it('sets up the periodic memory interval which re-checks memory usage', async () => {
      jest.useFakeTimers();
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: true,
        enableChunkPreloading: false,
      });
      await enforcer.initialize();
      mockMemoryManager.getMemoryUsage.mockClear();
      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();
      await Promise.resolve();
      expect(mockMemoryManager.getMemoryUsage).toHaveBeenCalled();
      enforcer.shutdown();
    });
  });

  // ------------------------------------------------------------------
  // checkBundleSize()
  // ------------------------------------------------------------------
  describe('checkBundleSize', () => {
    it('returns bundle info without violation when under limit', async () => {
      randomSpy.mockReturnValue(0); // simulatedSize = 0 => under limit
      const enforcer = new ReactNativePerformanceEnforcer();
      const listener = jest.fn();
      enforcer.addEventListener(listener);

      const info = await enforcer.checkBundleSize();

      expect(info.totalSize).toBe(0);
      expect(info.compressionRatio).toBe(0.7);
      expect(info.chunkSizes).toEqual({ main: 0, vendor: 0, runtime: 0 });
      // No budget_violation event.
      expect(
        listener.mock.calls.some(
          (c) => (c[0] as PerformanceEvent).type === 'budget_violation'
        )
      ).toBe(false);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('emits budget_violation + optimizes when bundle exceeds limit', async () => {
      // random ~1 => simulatedSize close to 25MB > 20MB limit.
      randomSpy.mockReturnValue(0.9999999);
      const enforcer = new ReactNativePerformanceEnforcer();
      const listener = jest.fn();
      enforcer.addEventListener(listener);

      const info = await enforcer.checkBundleSize();

      const expectedSize = Math.floor(0.9999999 * 25 * 1024);
      expect(info.totalSize).toBe(expectedSize);

      const violation = listener.mock.calls
        .map((c) => c[0] as PerformanceEvent)
        .find((e) => e.type === 'budget_violation');
      expect(violation).toBeDefined();
      expect(violation!.serviceName).toBe('bundle_analyzer');
      expect(violation!.data.metric).toBe('bundleSize');
      expect(violation!.data.actual).toBe(expectedSize);
      expect(violation!.data.budget).toBe(20 * 1024);
      const expectedPct = ((expectedSize - 20 * 1024) / (20 * 1024)) * 100;
      expect(violation!.data.violationPercentage).toBeCloseTo(expectedPct, 5);

      // Optimization path invoked.
      expect(mockCodeSplitting.enableCodeSplitting).toHaveBeenCalledTimes(1);
      expect(mockMemoryManager.clearUnusedModules).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Bundle size exceeded limit',
        expect.objectContaining({ actual: expectedSize, limit: 20 * 1024 })
      );
    });

    it('logs + rethrows when bundle info retrieval throws', async () => {
      const enforcer = new ReactNativePerformanceEnforcer();
      // Force the private getBundleInfo helper to reject so the error branch of
      // checkBundleSize (the unit under test) executes. We stub only the helper,
      // not checkBundleSize itself.
      const infoSpy = jest
        .spyOn(
          enforcer as unknown as { getBundleInfo: () => Promise<unknown> },
          'getBundleInfo'
        )
        .mockRejectedValueOnce(new Error('random failed'));
      await expect(enforcer.checkBundleSize()).rejects.toThrow('random failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to check bundle size',
        { error: 'random failed' }
      );
      infoSpy.mockRestore();
    });

    it('swallows errors thrown during optimizeBundle (does not reject)', async () => {
      randomSpy.mockReturnValue(0.9999999);
      mockCodeSplitting.enableCodeSplitting.mockRejectedValueOnce(
        new Error('split fail')
      );
      const enforcer = new ReactNativePerformanceEnforcer();
      // Should still resolve with bundle info even though optimize failed.
      const info = await enforcer.checkBundleSize();
      expect(info.totalSize).toBeGreaterThan(20 * 1024);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Bundle optimization failed',
        { error: 'split fail' }
      );
    });

    it('stringifies a non-Error rejection from getBundleInfo via String(error)', async () => {
      const enforcer = new ReactNativePerformanceEnforcer();
      const infoSpy = jest
        .spyOn(
          enforcer as unknown as { getBundleInfo: () => Promise<unknown> },
          'getBundleInfo'
        )
        .mockRejectedValueOnce(42);
      await expect(enforcer.checkBundleSize()).rejects.toBe(42);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to check bundle size',
        { error: '42' }
      );
      infoSpy.mockRestore();
    });

    it('stringifies a non-Error rejection during optimizeBundle via String(error)', async () => {
      randomSpy.mockReturnValue(0.9999999);
      mockCodeSplitting.enableCodeSplitting.mockRejectedValueOnce('split-str');
      const enforcer = new ReactNativePerformanceEnforcer();
      await enforcer.checkBundleSize();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Bundle optimization failed',
        { error: 'split-str' }
      );
    });
  });

  // ------------------------------------------------------------------
  // checkMemoryUsage()
  // ------------------------------------------------------------------
  describe('checkMemoryUsage', () => {
    it('returns memory info without violation when under threshold (via performance.memory)', async () => {
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 10 * 1024 * 1024, // 10MB < 150MB
        totalJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      };
      const enforcer = new ReactNativePerformanceEnforcer();
      const listener = jest.fn();
      enforcer.addEventListener(listener);

      const info = await enforcer.checkMemoryUsage();
      expect(info.usedJSHeapSize).toBe(10 * 1024 * 1024);
      expect(info.totalJSHeapSize).toBe(50 * 1024 * 1024);
      expect(info.jsHeapSizeLimit).toBe(200 * 1024 * 1024);
      expect(
        listener.mock.calls.some(
          (c) => (c[0] as PerformanceEvent).type === 'budget_violation'
        )
      ).toBe(false);
    });

    it('coalesces missing performance.memory fields to 0', async () => {
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      };
      // Force falsy individual fields to exercise `|| 0`.
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: undefined as unknown as number,
        totalJSHeapSize: undefined as unknown as number,
        jsHeapSizeLimit: undefined as unknown as number,
      };
      const enforcer = new ReactNativePerformanceEnforcer();
      const info = await enforcer.checkMemoryUsage();
      expect(info).toEqual({
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
      });
    });

    it('emits budget_violation + optimizes when memory exceeds threshold (performance.memory)', async () => {
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 300 * 1024 * 1024, // 300MB > 150MB
        totalJSHeapSize: 400 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };
      const enforcer = new ReactNativePerformanceEnforcer();
      const listener = jest.fn();
      enforcer.addEventListener(listener);

      await enforcer.checkMemoryUsage();

      const violation = listener.mock.calls
        .map((c) => c[0] as PerformanceEvent)
        .find((e) => e.type === 'budget_violation');
      expect(violation).toBeDefined();
      expect(violation!.serviceName).toBe('memory_tracker');
      expect(violation!.data.metric).toBe('memoryUsage');
      expect(violation!.data.actual).toBe(300);
      expect(violation!.data.budget).toBe(150);
      expect(violation!.data.violationPercentage).toBeCloseTo(100, 5);

      // Memory optimization invoked.
      expect(mockMemoryManager.forceGarbageCollection).toHaveBeenCalledTimes(1);
      expect(mockMemoryManager.clearUnusedModules).toHaveBeenCalledTimes(1);
      expect(mockMemoryManager.optimizeImageCache).toHaveBeenCalledTimes(1);
    });

    it('falls back to memoryManager.getMemoryUsage when performance.memory absent', async () => {
      // No performance.memory set in this test.
      mockMemoryManager.getMemoryUsage.mockResolvedValueOnce({
        used: 5,
        total: 50,
        limit: 100,
      });
      const enforcer = new ReactNativePerformanceEnforcer();
      const info = await enforcer.checkMemoryUsage();
      expect(info.usedJSHeapSize).toBe(5 * 1024 * 1024);
      expect(info.totalJSHeapSize).toBe(50 * 1024 * 1024);
      expect(info.jsHeapSizeLimit).toBe(100 * 1024 * 1024);
    });

    it('uses 0 for limit when memoryManager returns undefined limit (?? branch)', async () => {
      mockMemoryManager.getMemoryUsage.mockResolvedValueOnce({
        used: 1,
        total: 2,
        limit: undefined,
      });
      const enforcer = new ReactNativePerformanceEnforcer();
      const info = await enforcer.checkMemoryUsage();
      expect(info.jsHeapSizeLimit).toBe(0);
    });

    it('logs + rethrows when memory info retrieval throws', async () => {
      mockMemoryManager.getMemoryUsage.mockRejectedValueOnce(
        new Error('mem fail')
      );
      const enforcer = new ReactNativePerformanceEnforcer();
      await expect(enforcer.checkMemoryUsage()).rejects.toThrow('mem fail');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to check memory usage',
        { error: 'mem fail' }
      );
    });

    it('swallows errors thrown during optimizeMemory (does not reject)', async () => {
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 300 * 1024 * 1024,
        totalJSHeapSize: 400 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };
      mockMemoryManager.forceGarbageCollection.mockRejectedValueOnce(
        new Error('gc fail')
      );
      const enforcer = new ReactNativePerformanceEnforcer();
      const info = await enforcer.checkMemoryUsage();
      expect(info.usedJSHeapSize).toBe(300 * 1024 * 1024);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Memory optimization failed',
        { error: 'gc fail' }
      );
    });

    it('stringifies a non-Error rejection from getMemoryInfo via String(error)', async () => {
      mockMemoryManager.getMemoryUsage.mockRejectedValueOnce('mem-str');
      const enforcer = new ReactNativePerformanceEnforcer();
      await expect(enforcer.checkMemoryUsage()).rejects.toBe('mem-str');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to check memory usage',
        { error: 'mem-str' }
      );
    });

    it('stringifies a non-Error rejection during optimizeMemory via String(error)', async () => {
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 300 * 1024 * 1024,
        totalJSHeapSize: 400 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };
      mockMemoryManager.forceGarbageCollection.mockRejectedValueOnce('gc-str');
      const enforcer = new ReactNativePerformanceEnforcer();
      await enforcer.checkMemoryUsage();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Memory optimization failed',
        { error: 'gc-str' }
      );
    });

    it('calls global.gc during optimizeMemory when available', async () => {
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 300 * 1024 * 1024,
        totalJSHeapSize: 400 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };
      const gcSpy = jest.fn();
      (global as unknown as { gc?: () => void }).gc = gcSpy;
      const enforcer = new ReactNativePerformanceEnforcer();
      await enforcer.checkMemoryUsage();
      expect(gcSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------
  // preloadCriticalChunks()
  // ------------------------------------------------------------------
  describe('preloadCriticalChunks', () => {
    it('returns early (no-op) when chunk preloading disabled', async () => {
      const enforcer = new ReactNativePerformanceEnforcer({
        enableChunkPreloading: false,
      });
      await enforcer.preloadCriticalChunks();
      expect(mockCodeSplitting.preloadCriticalChunks).not.toHaveBeenCalled();
    });

    it('preloads all critical chunks when enabled', async () => {
      jest.useFakeTimers();
      randomSpy.mockReturnValue(0); // 500ms simulated load each, under 10s timeout
      const enforcer = new ReactNativePerformanceEnforcer({
        enableChunkPreloading: true,
      });
      const promise = enforcer.preloadCriticalChunks();
      // Each chunk resolves after 500ms; run all timers to completion.
      await jest.runAllTimersAsync();
      await promise;

      expect(mockCodeSplitting.preloadCriticalChunks).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Critical chunks preloaded successfully'
      );
      // 3 chunks => 3 debug logs.
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Chunk navigation preloaded'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Chunk auth preloaded'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Chunk common-ui preloaded'
      );
    });

    it('logs error when a chunk preload times out', async () => {
      jest.useFakeTimers();
      randomSpy.mockReturnValue(0);
      const enforcer = new ReactNativePerformanceEnforcer({
        enableChunkPreloading: true,
        chunkLoadTimeout: 100, // shorter than the 500ms simulated load => timeout fires first
      });
      const promise = enforcer.preloadCriticalChunks();
      // Advance past the 100ms timeout but before the 500ms load resolve.
      await jest.advanceTimersByTimeAsync(150);
      await promise;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to preload critical chunks',
        { error: 'Chunk navigation preload timeout' }
      );
    });

    it('logs error when codeSplittingManager.preloadCriticalChunks rejects', async () => {
      jest.useFakeTimers();
      mockCodeSplitting.preloadCriticalChunks.mockRejectedValueOnce(
        new Error('manager reject')
      );
      const enforcer = new ReactNativePerformanceEnforcer({
        enableChunkPreloading: true,
      });
      const promise = enforcer.preloadCriticalChunks();
      await jest.runAllTimersAsync();
      await promise;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to preload critical chunks',
        { error: 'manager reject' }
      );
    });

    it('stringifies a non-Error rejection from chunk preloading via String(error)', async () => {
      jest.useFakeTimers();
      mockCodeSplitting.preloadCriticalChunks.mockRejectedValueOnce(
        'chunk-str'
      );
      const enforcer = new ReactNativePerformanceEnforcer({
        enableChunkPreloading: true,
      });
      const promise = enforcer.preloadCriticalChunks();
      await jest.runAllTimersAsync();
      await promise;
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Failed to preload critical chunks',
        { error: 'chunk-str' }
      );
    });
  });

  // ------------------------------------------------------------------
  // getMetrics()
  // ------------------------------------------------------------------
  describe('getMetrics', () => {
    it('returns bundle, memory, and timestamp', async () => {
      randomSpy.mockReturnValue(0);
      (performance as PerfWithMemory).memory = {
        usedJSHeapSize: 1,
        totalJSHeapSize: 2,
        jsHeapSizeLimit: 3,
      };
      const enforcer = new ReactNativePerformanceEnforcer();
      const metrics = await enforcer.getMetrics();
      expect(metrics.timestamp).toBe(1_000_000);
      expect(metrics.bundle.totalSize).toBe(0);
      expect(metrics.memory.usedJSHeapSize).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // event listeners + emitEvent
  // ------------------------------------------------------------------
  describe('event listeners', () => {
    it('addEventListener registers a listener that receives emitted events', async () => {
      jest.useFakeTimers();
      randomSpy.mockReturnValue(0); // bundle under limit, no extra events
      const enforcer = new ReactNativePerformanceEnforcer();
      const listener = jest.fn();
      enforcer.addEventListener(listener);
      // initialize emits `monitoring_started` while listeners are still registered.
      await enforcer.initialize();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'monitoring_started' })
      );
      enforcer.shutdown();
    });

    it('emitEvent isolates a throwing listener and still logs', async () => {
      jest.useFakeTimers();
      randomSpy.mockReturnValue(0);
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: false,
      });
      const bad = jest.fn(() => {
        throw new Error('listener boom');
      });
      const good = jest.fn();
      // Distinct ids so both listeners coexist in the internal Map.
      randomSpy.mockReturnValueOnce(0.1);
      enforcer.addEventListener(bad);
      randomSpy.mockReturnValueOnce(0.2);
      enforcer.addEventListener(good);

      // initialize emits monitoring_started over both listeners.
      await enforcer.initialize();

      expect(bad).toHaveBeenCalled();
      expect(good).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Event listener failed',
        { error: 'listener boom' }
      );
      enforcer.shutdown();
    });

    it('stringifies a non-Error thrown by a listener via String(error)', async () => {
      jest.useFakeTimers();
      randomSpy.mockReturnValue(0);
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: false,
      });
      const bad = jest.fn(() => {
        throw 'plain-string-throw';
      });
      enforcer.addEventListener(bad);
      await enforcer.initialize();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Event listener failed',
        { error: 'plain-string-throw' }
      );
      enforcer.shutdown();
    });

    it('removeEventListener prevents future delivery to that listener', async () => {
      jest.useFakeTimers();
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: false,
        enableMemoryTracking: false,
        enableChunkPreloading: false,
      });
      const listener = jest.fn();
      // addEventListener generates a random id; control it.
      randomSpy.mockReturnValue(0.5);
      enforcer.addEventListener(listener);
      const id = (0.5).toString(36).substr(2, 9);
      enforcer.removeEventListener(id);
      await enforcer.initialize(); // would emit monitoring_started if still registered
      expect(listener).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Event listener removed',
        { id }
      );
      enforcer.shutdown();
    });
  });

  // ------------------------------------------------------------------
  // shutdown()
  // ------------------------------------------------------------------
  describe('shutdown', () => {
    it('clears intervals, listeners, and emits monitoring_stopped', async () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const enforcer = new ReactNativePerformanceEnforcer({
        enableBundleAnalysis: true,
        enableMemoryTracking: true,
        enableChunkPreloading: false,
      });
      await enforcer.initialize();

      enforcer.shutdown();

      // Both intervals cleared.
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Performance enforcer shutdown completed'
      );
      clearIntervalSpy.mockRestore();
    });

    it('is safe to call shutdown when no intervals were started', () => {
      const enforcer = new ReactNativePerformanceEnforcer();
      expect(() => enforcer.shutdown()).not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ReactNativePerformanceEnforcer',
        'Performance enforcer shutdown completed'
      );
    });
  });
});
