/**
 * CODE SPLITTING & LAZY LOADING UTILITIES
 * React Native code splitting with performance monitoring
 */

import React from 'react';
import { logger } from './logger';
import { memoryManager } from './memoryManager';

export interface LazyLoadOptions {
  timeout?: number;
  retryAttempts?: number;
  fallback?: React.ComponentType;
  preload?: boolean;
  chunkName?: string;
}

export interface ChunkMetrics {
  chunkName: string;
  loadTime: number;
  size: number;
  success: boolean;
  error?: Error;
  timestamp: number;
}

export interface SplittingStrategy {
  type: 'route' | 'feature' | 'vendor' | 'lazy';
  threshold: number; // KB
  priority: 'high' | 'medium' | 'low';
}

class CodeSplittingManager {
  private static instance: CodeSplittingManager;
  private chunkCache = new Map<string, any>();
  private loadingChunks = new Map<string, Promise<any>>();
  private chunkMetrics: ChunkMetrics[] = [];
  private preloadQueue: string[] = [];

  static getInstance(): CodeSplittingManager {
    if (!CodeSplittingManager.instance) {
      CodeSplittingManager.instance = new CodeSplittingManager();
    }
    return CodeSplittingManager.instance;
  }

  /**
   * Create a lazy-loaded component with performance tracking
   */
  createLazyComponent<P extends object>(
    importFn: () => Promise<{ default: React.ComponentType<P> }>,
    options: LazyLoadOptions = {}
  ): React.ComponentType<P> {
    const {
      timeout = 10000,
      retryAttempts = 3,
      fallback: Fallback,
      preload = false,
      chunkName = 'unknown',
    } = options;

    if (preload) {
      this.preloadQueue.push(chunkName);
    }

    return React.lazy(() => {
      return this.loadChunkWithRetry(
        importFn,
        chunkName,
        retryAttempts,
        timeout
      );
    });
  }

  /**
   * Load chunk with retry logic and performance tracking
   */
  private async loadChunkWithRetry<T>(
    importFn: () => Promise<T>,
    chunkName: string,
    retryAttempts: number,
    timeout: number
  ): Promise<T> {
    const cacheKey = chunkName;

    // Return from cache if available
    if (this.chunkCache.has(cacheKey)) {
      logger.debug(`Chunk ${chunkName} loaded from cache`);
      return this.chunkCache.get(cacheKey);
    }

    // Return existing promise if already loading
    if (this.loadingChunks.has(cacheKey)) {
      return this.loadingChunks.get(cacheKey)!;
    }

    const loadPromise = this.performChunkLoad(
      importFn,
      chunkName,
      retryAttempts,
      timeout
    );
    this.loadingChunks.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      this.chunkCache.set(cacheKey, result);
      return result;
    } finally {
      this.loadingChunks.delete(cacheKey);
    }
  }

  /**
   * Perform actual chunk loading with metrics
   */
  private async performChunkLoad<T>(
    importFn: () => Promise<T>,
    chunkName: string,
    retryAttempts: number,
    timeout: number
  ): Promise<T> {
    const startTime = performance.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        logger.debug(`Loading chunk ${chunkName} (attempt ${attempt + 1})`);

        const result = await Promise.race([
          importFn(),
          this.createTimeoutPromise<T>(timeout, chunkName),
        ]);

        const loadTime = performance.now() - startTime;

        // Track successful load
        this.trackChunkMetrics({
          chunkName,
          loadTime,
          size: this.estimateChunkSize(result),
          success: true,
          timestamp: Date.now(),
        });

        logger.performance(`Chunk ${chunkName} loaded`, loadTime, {
          attempt: attempt + 1,
          cached: false,
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `Chunk ${chunkName} load failed (attempt ${attempt + 1}):`,
          {
            data: error,
          }
        );

        if (attempt < retryAttempts) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // Track failed load
    const loadTime = performance.now() - startTime;
    this.trackChunkMetrics({
      chunkName,
      loadTime,
      size: 0,
      success: false,
      error: lastError,
      timestamp: Date.now(),
    });

    logger.error(
      `Chunk ${chunkName} failed to load after ${retryAttempts + 1} attempts`,
      lastError!
    );
    throw lastError || new Error(`Failed to load chunk ${chunkName}`);
  }

  /**
   * Create timeout promise for chunk loading
   */
  private createTimeoutPromise<T>(
    timeout: number,
    chunkName: string
  ): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Chunk ${chunkName} load timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Estimate chunk size (placeholder implementation)
   */
  private estimateChunkSize(chunk: any): number {
    try {
      // In a real implementation, you'd get actual bundle size
      // For now, estimate based on component complexity
      const stringified = JSON.stringify(chunk, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        return value;
      });
      return stringified.length;
    } catch {
      return 0;
    }
  }

  /**
   * Track chunk loading metrics
   */
  private trackChunkMetrics(metrics: ChunkMetrics): void {
    this.chunkMetrics.push(metrics);

    // Keep only last 100 entries
    if (this.chunkMetrics.length > 100) {
      this.chunkMetrics.shift();
    }

    // Register memory cleanup for failed chunks
    if (!metrics.success) {
      memoryManager.registerCleanupCallback(() => {
        this.clearChunkCache(metrics.chunkName);
      });
    }
  }

  /**
   * Preload chunks for better performance
   */
  async preloadChunks(chunkNames?: string[]): Promise<void> {
    const chunksToPreload = chunkNames || this.preloadQueue;

    logger.debug(`Preloading ${chunksToPreload.length} chunks`);

    const preloadPromises = chunksToPreload.map(async (chunkName) => {
      try {
        // This would need to be implemented based on your specific chunk structure
        logger.debug(`Preloaded chunk: ${chunkName}`);
      } catch (error) {
        logger.warn(`Failed to preload chunk ${chunkName}:`, { data: error });
      }
    });

    await Promise.allSettled(preloadPromises);
    this.preloadQueue.length = 0;
  }

  /**
   * Clear chunk cache for memory management
   */
  clearChunkCache(chunkName?: string): void {
    if (chunkName) {
      this.chunkCache.delete(chunkName);
      logger.debug(`Cleared cache for chunk: ${chunkName}`);
    } else {
      this.chunkCache.clear();
      logger.debug('Cleared all chunk cache');
    }
  }

  /**
   * Get chunk loading metrics
   */
  getChunkMetrics(): ChunkMetrics[] {
    return [...this.chunkMetrics];
  }

  /**
   * Get chunk loading performance report
   */
  getPerformanceReport(): {
    totalChunks: number;
    successRate: number;
    averageLoadTime: number;
    slowestChunks: ChunkMetrics[];
    failedChunks: ChunkMetrics[];
  } {
    const total = this.chunkMetrics.length;
    if (total === 0) {
      return {
        totalChunks: 0,
        successRate: 0,
        averageLoadTime: 0,
        slowestChunks: [],
        failedChunks: [],
      };
    }

    const successful = this.chunkMetrics.filter((m) => m.success);
    const failed = this.chunkMetrics.filter((m) => !m.success);
    const successRate = (successful.length / total) * 100;
    const averageLoadTime =
      successful.reduce((sum, m) => sum + m.loadTime, 0) / successful.length;

    const slowestChunks = [...this.chunkMetrics]
      .filter((m) => m.success)
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 5);

    return {
      totalChunks: total,
      successRate,
      averageLoadTime,
      slowestChunks,
      failedChunks: failed,
    };
  }

  /**
   * Enable code splitting (stub for compatibility)
   */
  async enableCodeSplitting(): Promise<void> {
    logger.info('CodeSplittingManager', 'Code splitting enabled');
    // Implementation would go here
  }

  /**
   * Preload critical chunks (stub for compatibility)
   */
  async preloadCriticalChunks(): Promise<void> {
    logger.info('CodeSplittingManager', 'Preloading critical chunks');
    // Implementation would go here
  }
}

// Export singleton instance
export const codeSplittingManager = CodeSplittingManager.getInstance();

// Utility function to create lazy components
export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options?: LazyLoadOptions
): React.ComponentType<P> => {
  return codeSplittingManager.createLazyComponent(importFn, options);
};

// Route-based code splitting helper
export const createLazyScreen = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  screenName: string
): React.ComponentType<P> => {
  return createLazyComponent(importFn, {
    chunkName: `screen-${screenName}`,
    timeout: 15000,
    retryAttempts: 2,
    preload: false,
  });
};

// Feature-based code splitting helper
export const createLazyFeature = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  featureName: string
): React.ComponentType<P> => {
  return createLazyComponent(importFn, {
    chunkName: `feature-${featureName}`,
    timeout: 10000,
    retryAttempts: 3,
    preload: true,
  });
};

// React hook for preloading chunks
export const useChunkPreloader = (chunkNames: string[]) => {
  const React = require('react');

  React.useEffect(() => {
    const preload = async () => {
      try {
        await codeSplittingManager.preloadChunks(chunkNames);
      } catch (error) {
        logger.warn('Chunk preloading failed:', { data: error });
      }
    };

    preload();
  }, [chunkNames]);
};

// Performance monitoring hook
export const useChunkPerformance = () => {
  const [metrics, setMetrics] = React.useState<ChunkMetrics[]>([]);

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(codeSplittingManager.getChunkMetrics());
    };

    // Update every 5 seconds when component is mounted
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial load

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    report: codeSplittingManager.getPerformanceReport(),
    clearCache: codeSplittingManager.clearChunkCache,
  };
};
