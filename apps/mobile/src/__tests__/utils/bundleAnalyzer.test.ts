import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BundleAnalyzer,
  DynamicImportManager,
  dynamicImportManager,
  BundleMetrics,
  BundleAsset,
  BundleChunk,
  OptimizationRecommendation,
} from '../../utils/bundleAnalyzer';
import { logger } from '../../utils/logger';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
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

// Mock performance.now
const mockPerformanceNow = jest.spyOn(performance, 'now');

describe('BundleAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('analyzeBundle', () => {
    it('should analyze bundle and return metrics and recommendations', async () => {
      const result = await BundleAnalyzer.analyzeBundle();

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('recommendations');
      expect(result.metrics).toHaveProperty('totalSize');
      expect(result.metrics).toHaveProperty('compressedSize');
      expect(result.metrics).toHaveProperty('assets');
      expect(result.metrics).toHaveProperty('chunks');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should log performance metrics', async () => {
      await BundleAnalyzer.analyzeBundle();

      expect(logger.performance).toHaveBeenCalledWith(
        'Bundle analysis',
        0,
        { phase: 'start' }
      );
      expect(logger.performance).toHaveBeenCalledWith(
        'Bundle analysis',
        expect.any(Number),
        expect.objectContaining({
          totalSize: expect.any(Number),
          recommendations: expect.any(Number),
        })
      );
    });

    it('should store bundle metrics', async () => {
      await BundleAnalyzer.analyzeBundle();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@mintenance/bundle_metrics',
        expect.any(String)
      );
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Analysis failed');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

      await BundleAnalyzer.analyzeBundle();
      expect(logger.warn).toHaveBeenCalledWith('Failed to store bundle metrics:', { data: error });
    });
  });

  describe('collectBundleMetrics', () => {
    it('should return valid bundle metrics structure', async () => {
      const result = await BundleAnalyzer.analyzeBundle();
      const metrics = result.metrics;

      expect(metrics.totalSize).toBe(15 * 1024 * 1024); // 15MB
      expect(metrics.compressedSize).toBe(5 * 1024 * 1024); // 5MB
      expect(metrics.assets).toHaveLength(3);
      expect(metrics.chunks).toHaveLength(2);
      expect(metrics.duplicateModules).toContain('lodash');
      expect(metrics.duplicateModules).toContain('moment');
      expect(metrics.unusedExports).toHaveLength(2);
      expect(metrics.treeShakingOpportunities).toHaveLength(2);
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should identify largest assets', async () => {
      const result = await BundleAnalyzer.analyzeBundle();
      const metrics = result.metrics;

      expect(metrics.largestAssets).toBeDefined();
      expect(metrics.largestAssets.length).toBeGreaterThan(0);
      expect(metrics.largestAssets[0].size).toBeGreaterThanOrEqual(
        metrics.largestAssets[1]?.size || 0
      );
    });

    it('should categorize assets correctly', async () => {
      const result = await BundleAnalyzer.analyzeBundle();
      const jsAssets = result.metrics.assets.filter(a => a.type === 'js');
      const imageAssets = result.metrics.assets.filter(a => a.type === 'image');

      expect(jsAssets).toHaveLength(2);
      expect(imageAssets).toHaveLength(1);
      expect(jsAssets[0].critical).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend code splitting for large bundles', async () => {
      // Mock large bundle
      const mockMetrics: BundleMetrics = {
        totalSize: 25 * 1024 * 1024, // 25MB
        compressedSize: 10 * 1024 * 1024,
        assets: [],
        chunks: [],
        largestAssets: [],
        duplicateModules: [],
        unusedExports: [],
        treeShakingOpportunities: [],
        timestamp: Date.now(),
      };

      const collectSpy = jest
        .spyOn(BundleAnalyzer as any, 'collectBundleMetrics')
        .mockResolvedValue(mockMetrics);

      const result = await BundleAnalyzer.analyzeBundle();
      const codeSplittingRec = result.recommendations.find(
        r => r.type === 'code-splitting'
      );

      expect(codeSplittingRec).toBeDefined();
      expect(codeSplittingRec?.priority).toBe('high');
      expect(codeSplittingRec?.estimatedSavings).toBe(5 * 1024);
      collectSpy.mockRestore();
    });

    it('should recommend lazy loading for large assets', async () => {
      const result = await BundleAnalyzer.analyzeBundle();
      const lazyLoadingRec = result.recommendations.find(
        r => r.type === 'lazy-loading'
      );

      expect(lazyLoadingRec).toBeDefined();
      expect(lazyLoadingRec?.priority).toBe('medium');
      expect(lazyLoadingRec?.description).toContain('assets larger than 1MB');
    });

    it('should recommend tree shaking for duplicate modules', async () => {
      const result = await BundleAnalyzer.analyzeBundle();
      const treeShakingRecs = result.recommendations.filter(
        r => r.type === 'tree-shaking'
      );

      expect(treeShakingRecs.length).toBeGreaterThan(0);
      const duplicateRec = treeShakingRecs.find(r =>
        r.description.includes('duplicate modules')
      );
      expect(duplicateRec?.description).toContain('lodash');
      expect(duplicateRec?.description).toContain('moment');
    });

    it('should recommend compression optimization for poor compression', async () => {
      const mockMetrics: BundleMetrics = {
        totalSize: 10 * 1024 * 1024, // 10MB
        compressedSize: 8 * 1024 * 1024, // 8MB (80% = poor compression)
        assets: [],
        chunks: [],
        largestAssets: [],
        duplicateModules: [],
        unusedExports: [],
        treeShakingOpportunities: [],
        timestamp: Date.now(),
      };

      const collectSpy = jest
        .spyOn(BundleAnalyzer as any, 'collectBundleMetrics')
        .mockResolvedValue(mockMetrics);

      const result = await BundleAnalyzer.analyzeBundle();
      const compressionRec = result.recommendations.find(
        r => r.type === 'compression'
      );

      expect(compressionRec).toBeDefined();
      expect(compressionRec?.priority).toBe('medium');
      expect(compressionRec?.estimatedSavings).toBe(3 * 1024);
      collectSpy.mockRestore();
    });

    it('should sort recommendations by priority', async () => {
      const result = await BundleAnalyzer.analyzeBundle();

      for (let i = 0; i < result.recommendations.length - 1; i++) {
        const current = result.recommendations[i];
        const next = result.recommendations[i + 1];
        const priorityOrder = { high: 3, medium: 2, low: 1 };

        expect(priorityOrder[current.priority]).toBeGreaterThanOrEqual(
          priorityOrder[next.priority]
        );
      }
    });
  });

  describe('storeBundleMetrics', () => {
    it('should store metrics in AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      await BundleAnalyzer.analyzeBundle();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@mintenance/bundle_metrics',
        expect.stringContaining('"totalSize":')
      );
    });

    it('should maintain history limit of 30 entries', async () => {
      const existingHistory = new Array(30).fill(null).map((_, i) => ({
        totalSize: 1000 + i,
        compressedSize: 500,
        assets: [],
        chunks: [],
        largestAssets: [],
        duplicateModules: [],
        unusedExports: [],
        treeShakingOpportunities: [],
        timestamp: Date.now() - i * 1000,
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(existingHistory)
      );

      await BundleAnalyzer.analyzeBundle();

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedHistory = JSON.parse(savedData);

      expect(savedHistory).toHaveLength(30);
      expect(savedHistory[0].totalSize).not.toBe(1000); // First old entry removed
    });

    it('should handle storage errors gracefully', async () => {
      const error = new Error('Storage error');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

      await BundleAnalyzer.analyzeBundle();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to store bundle metrics:',
        { data: error }
      );
    });
  });

  describe('getBundleHistory', () => {
    it('should retrieve bundle history from storage', async () => {
      const mockHistory = [
        { totalSize: 1000, timestamp: Date.now() },
        { totalSize: 2000, timestamp: Date.now() + 1000 },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const history = await BundleAnalyzer.getBundleHistory();

      expect(history).toEqual(mockHistory);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@mintenance/bundle_metrics');
    });

    it('should return empty array when no history exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const history = await BundleAnalyzer.getBundleHistory();

      expect(history).toEqual([]);
    });

    it('should handle retrieval errors gracefully', async () => {
      const error = new Error('Retrieval error');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

      const history = await BundleAnalyzer.getBundleHistory();

      expect(history).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to retrieve bundle history:',
        { data: error }
      );
    });
  });

  describe('shouldRunAnalysis', () => {
    it('should return true when no history exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const shouldRun = await BundleAnalyzer.shouldRunAnalysis();

      expect(shouldRun).toBe(true);
    });

    it('should return true when last analysis is older than 24 hours', async () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const mockHistory = [{ timestamp: oldTimestamp }];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const shouldRun = await BundleAnalyzer.shouldRunAnalysis();

      expect(shouldRun).toBe(true);
    });

    it('should return false when last analysis is recent', async () => {
      const recentTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const mockHistory = [{ timestamp: recentTimestamp }];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const shouldRun = await BundleAnalyzer.shouldRunAnalysis();

      expect(shouldRun).toBe(false);
    });

    it('should return true on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Error'));

      const shouldRun = await BundleAnalyzer.shouldRunAnalysis();

      expect(shouldRun).toBe(true);
    });
  });

  describe('generateTrendReport', () => {
    it('should return stable trend with insufficient data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ totalSize: 1000, timestamp: Date.now() }])
      );

      const report = await BundleAnalyzer.generateTrendReport();

      expect(report.trend).toBe('stable');
      expect(report.recommendations).toContain('Insufficient data for trend analysis');
    });

    it('should detect increasing trend', async () => {
      const mockHistory = [
        { totalSize: 10 * 1024 * 1024, timestamp: Date.now() - 1000 },
        { totalSize: 12 * 1024 * 1024, timestamp: Date.now() }, // 20% increase
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const report = await BundleAnalyzer.generateTrendReport();

      expect(report.trend).toBe('increasing');
      expect(report.sizeChange).toBe(2 * 1024 * 1024);
      expect(report.recommendations).toContain(
        'Bundle size increased significantly. Review recent changes.'
      );
    });

    it('should detect decreasing trend', async () => {
      const mockHistory = [
        { totalSize: 12 * 1024 * 1024, timestamp: Date.now() - 1000 },
        { totalSize: 10 * 1024 * 1024, timestamp: Date.now() }, // ~17% decrease
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const report = await BundleAnalyzer.generateTrendReport();

      expect(report.trend).toBe('decreasing');
      expect(report.sizeChange).toBe(-2 * 1024 * 1024);
    });

    it('should detect stable trend for small changes', async () => {
      const mockHistory = [
        { totalSize: 10 * 1024 * 1024, timestamp: Date.now() - 1000 },
        { totalSize: 10.3 * 1024 * 1024, timestamp: Date.now() }, // 3% increase
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const report = await BundleAnalyzer.generateTrendReport();

      expect(report.trend).toBe('stable');
    });

    it('should recommend aggressive splitting for very large bundles', async () => {
      const mockHistory = [
        { totalSize: 20 * 1024 * 1024, timestamp: Date.now() - 1000 },
        { totalSize: 26 * 1024 * 1024, timestamp: Date.now() }, // 26MB
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockHistory)
      );

      const report = await BundleAnalyzer.generateTrendReport();

      expect(report.recommendations).toContain(
        'Bundle size is very large. Implement aggressive code splitting.'
      );
    });
  });
});

describe('DynamicImportManager', () => {
  let manager: DynamicImportManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new DynamicImportManager();
  });

  describe('loadModule', () => {
    it('should load and cache module successfully', async () => {
      const mockModule = { test: 'module' };
      const importFn = jest.fn().mockResolvedValue(mockModule);

      const result = await manager.loadModule('testModule', importFn);

      expect(result).toEqual(mockModule);
      expect(importFn).toHaveBeenCalledTimes(1);
      expect(logger.performance).toHaveBeenCalledWith(
        'Module testModule loaded',
        expect.any(Number)
      );
    });

    it('should return cached module on subsequent calls', async () => {
      const mockModule = { test: 'module' };
      const importFn = jest.fn().mockResolvedValue(mockModule);

      const result1 = await manager.loadModule('testModule', importFn);
      const result2 = await manager.loadModule('testModule', importFn);

      expect(result1).toBe(result2);
      expect(importFn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle concurrent loading of same module', async () => {
      const mockModule = { test: 'module' };
      const importFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockModule), 100))
      );

      const promise1 = manager.loadModule('testModule', importFn);
      const promise2 = manager.loadModule('testModule', importFn);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(result2);
      expect(importFn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should use fallback on import error', async () => {
      const fallback = { default: 'fallback' };
      const importFn = jest.fn().mockRejectedValue(new Error('Import failed'));

      const result = await manager.loadModule('testModule', importFn, fallback);

      expect(result).toEqual(fallback);
      expect(logger.error).toHaveBeenCalledWith(
        'Module testModule loading failed after 0ms',
        expect.any(Error)
      );
    });

    it('should throw error when no fallback provided', async () => {
      const importFn = jest.fn().mockRejectedValue(new Error('Import failed'));

      await expect(
        manager.loadModule('testModule', importFn)
      ).rejects.toThrow('Import failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Dynamic import failed',
        expect.any(Error)
      );
    });

    it('should clean up loading promise on error', async () => {
      const importFn = jest.fn().mockRejectedValue(new Error('Import failed'));

      try {
        await manager.loadModule('testModule', importFn);
      } catch {}

      // Should be able to retry
      const mockModule = { test: 'module' };
      importFn.mockResolvedValue(mockModule);

      const result = await manager.loadModule('testModule', importFn);
      expect(result).toEqual(mockModule);
    });
  });

  describe('isModuleLoaded', () => {
    it('should return false for unloaded module', () => {
      expect(manager.isModuleLoaded('testModule')).toBe(false);
    });

    it('should return true for loaded module', async () => {
      const mockModule = { test: 'module' };
      const importFn = jest.fn().mockResolvedValue(mockModule);

      await manager.loadModule('testModule', importFn);

      expect(manager.isModuleLoaded('testModule')).toBe(true);
    });

    it('should return false for module that failed to load', async () => {
      const importFn = jest.fn().mockRejectedValue(new Error('Failed'));

      try {
        await manager.loadModule('testModule', importFn);
      } catch {}

      expect(manager.isModuleLoaded('testModule')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached modules', async () => {
      const mockModule1 = { test: 'module1' };
      const mockModule2 = { test: 'module2' };
      const importFn1 = jest.fn().mockResolvedValue(mockModule1);
      const importFn2 = jest.fn().mockResolvedValue(mockModule2);

      await manager.loadModule('module1', importFn1);
      await manager.loadModule('module2', importFn2);

      expect(manager.isModuleLoaded('module1')).toBe(true);
      expect(manager.isModuleLoaded('module2')).toBe(true);

      manager.clearCache();

      expect(manager.isModuleLoaded('module1')).toBe(false);
      expect(manager.isModuleLoaded('module2')).toBe(false);
    });

    it('should allow reloading after cache clear', async () => {
      const mockModule = { test: 'module', version: 1 };
      const importFn = jest.fn().mockResolvedValue(mockModule);

      await manager.loadModule('testModule', importFn);
      manager.clearCache();

      mockModule.version = 2;
      const result = await manager.loadModule('testModule', importFn);

      expect(result.version).toBe(2);
      expect(importFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(dynamicImportManager).toBeInstanceOf(DynamicImportManager);
    });

    it('should maintain state across imports', async () => {
      const mockModule = { test: 'module' };
      const importFn = jest.fn().mockResolvedValue(mockModule);

      await dynamicImportManager.loadModule('singletonTest', importFn);

      expect(dynamicImportManager.isModuleLoaded('singletonTest')).toBe(true);
    });
  });
});
