/**
 * React Native Performance Enforcer
 * Platform-specific performance enforcement for React Native apps
 */

import { logger } from '../logger';
import { memoryManager } from '../memoryManager';
import { codeSplittingManager } from '../codeSplitting';
import {
  ReactNativePerformanceConfig,
  BundleInfo,
  MemoryInfo,
  PerformanceEvent,
} from './types';

export class ReactNativePerformanceEnforcer {
  private config: ReactNativePerformanceConfig;
  private bundleCheckInterval?: NodeJS.Timeout;
  private memoryCheckInterval?: NodeJS.Timeout;
  private eventListeners = new Map<string, (event: PerformanceEvent) => void>();

  constructor(config: ReactNativePerformanceConfig = {}) {
    this.config = {
      enableBundleAnalysis: true,
      enableMemoryTracking: true,
      enableChunkPreloading: false,
      maxBundleSize: 20 * 1024, // 20MB
      memoryWarningThreshold: 150, // 150MB
      chunkLoadTimeout: 10000, // 10 seconds
      ...config,
    };
  }

  /**
   * Initialize React Native performance enforcement
   */
  async initialize(): Promise<void> {
    logger.info('ReactNativePerformanceEnforcer', 'Initializing performance enforcement', this.config);

    try {
      // Bundle analysis
      if (this.config.enableBundleAnalysis) {
        await this.initializeBundleAnalysis();
      }

      // Memory tracking
      if (this.config.enableMemoryTracking) {
        await this.initializeMemoryTracking();
      }

      // Chunk preloading
      if (this.config.enableChunkPreloading) {
        await this.initializeChunkPreloading();
      }

      this.emitEvent({
        type: 'monitoring_started',
        serviceName: 'react_native_enforcer',
        timestamp: Date.now(),
        data: { config: this.config },
      });

      logger.info('ReactNativePerformanceEnforcer', 'Performance enforcement initialized successfully');
    } catch (error) {
      logger.error('ReactNativePerformanceEnforcer', 'Failed to initialize performance enforcement', error);
      throw error;
    }
  }

  /**
   * Initialize bundle analysis
   */
  private async initializeBundleAnalysis(): Promise<void> {
    await this.checkBundleSize();

    // Check bundle size periodically
    this.bundleCheckInterval = setInterval(
      async () => {
        await this.checkBundleSize();
      },
      5 * 60 * 1000 // Every 5 minutes
    );

    logger.info('ReactNativePerformanceEnforcer', 'Bundle analysis initialized');
  }

  /**
   * Initialize memory tracking
   */
  private async initializeMemoryTracking(): Promise<void> {
    await this.checkMemoryUsage();

    // Check memory usage periodically
    this.memoryCheckInterval = setInterval(
      async () => {
        await this.checkMemoryUsage();
      },
      30 * 1000 // Every 30 seconds
    );

    logger.info('ReactNativePerformanceEnforcer', 'Memory tracking initialized');
  }

  /**
   * Initialize chunk preloading
   */
  private async initializeChunkPreloading(): Promise<void> {
    if (codeSplittingManager) {
      await codeSplittingManager.preloadCriticalChunks();
      logger.info('ReactNativePerformanceEnforcer', 'Chunk preloading initialized');
    }
  }

  /**
   * Check bundle size and enforce limits
   */
  async checkBundleSize(): Promise<BundleInfo> {
    try {
      const bundleInfo = await this.getBundleInfo();

      if (bundleInfo.totalSize > this.config.maxBundleSize!) {
        const violationPercentage = ((bundleInfo.totalSize - this.config.maxBundleSize!) / this.config.maxBundleSize!) * 100;

        logger.warn('ReactNativePerformanceEnforcer', 'Bundle size exceeded limit', {
          actual: bundleInfo.totalSize,
          limit: this.config.maxBundleSize,
          violationPercentage: violationPercentage.toFixed(1),
        });

        this.emitEvent({
          type: 'budget_violation',
          serviceName: 'bundle_analyzer',
          timestamp: Date.now(),
          data: {
            metric: 'bundleSize',
            actual: bundleInfo.totalSize,
            budget: this.config.maxBundleSize,
            violationPercentage,
          },
        });

        // Attempt automatic optimization
        await this.optimizeBundle();
      }

      return bundleInfo;
    } catch (error) {
      logger.error('ReactNativePerformanceEnforcer', 'Failed to check bundle size', error);
      throw error;
    }
  }

  /**
   * Get bundle information
   */
  private async getBundleInfo(): Promise<BundleInfo> {
    // In a real implementation, this would analyze the actual bundle
    // For now, we'll simulate bundle analysis

    const simulatedSize = Math.floor(Math.random() * 25 * 1024); // 0-25MB
    const chunkSizes = {
      'main': Math.floor(simulatedSize * 0.6),
      'vendor': Math.floor(simulatedSize * 0.3),
      'runtime': Math.floor(simulatedSize * 0.1),
    };

    return {
      size: simulatedSize,
      chunkSizes,
      totalSize: simulatedSize,
      compressionRatio: 0.7, // Simulated compression ratio
    };
  }

  /**
   * Optimize bundle when size limits are exceeded
   */
  private async optimizeBundle(): Promise<void> {
    logger.info('ReactNativePerformanceEnforcer', 'Attempting bundle optimization');

    try {
      // Enable code splitting if available
      if (codeSplittingManager) {
        await codeSplittingManager.enableCodeSplitting();
      }

      // Clear unused modules from memory
      if (memoryManager) {
        await memoryManager.clearUnusedModules();
      }

      // Additional optimization strategies can be added here
      logger.info('ReactNativePerformanceEnforcer', 'Bundle optimization completed');
    } catch (error) {
      logger.error('ReactNativePerformanceEnforcer', 'Bundle optimization failed', error);
    }
  }

  /**
   * Check memory usage and enforce limits
   */
  async checkMemoryUsage(): Promise<MemoryInfo> {
    try {
      const memoryInfo = await this.getMemoryInfo();
      const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024);

      if (memoryUsageMB > this.config.memoryWarningThreshold!) {
        const violationPercentage = ((memoryUsageMB - this.config.memoryWarningThreshold!) / this.config.memoryWarningThreshold!) * 100;

        logger.warn('ReactNativePerformanceEnforcer', 'Memory usage exceeded threshold', {
          actual: memoryUsageMB.toFixed(2),
          threshold: this.config.memoryWarningThreshold,
          violationPercentage: violationPercentage.toFixed(1),
        });

        this.emitEvent({
          type: 'budget_violation',
          serviceName: 'memory_tracker',
          timestamp: Date.now(),
          data: {
            metric: 'memoryUsage',
            actual: memoryUsageMB,
            budget: this.config.memoryWarningThreshold,
            violationPercentage,
          },
        });

        // Attempt memory cleanup
        await this.optimizeMemory();
      }

      return memoryInfo;
    } catch (error) {
      logger.error('ReactNativePerformanceEnforcer', 'Failed to check memory usage', error);
      throw error;
    }
  }

  /**
   * Get current memory information
   */
  private async getMemoryInfo(): Promise<MemoryInfo> {
    // Try React Native specific memory APIs first
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize || 0,
        totalJSHeapSize: memory.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
      };
    }

    // Fallback to memory manager
    if (memoryManager) {
      const usage = await memoryManager.getMemoryUsage();
      return {
        usedJSHeapSize: usage.used * 1024 * 1024, // Convert MB to bytes
        totalJSHeapSize: usage.total * 1024 * 1024,
        jsHeapSizeLimit: usage.limit * 1024 * 1024,
      };
    }

    // Default fallback
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemory(): Promise<void> {
    logger.info('ReactNativePerformanceEnforcer', 'Attempting memory optimization');

    try {
      // Use memory manager if available
      if (memoryManager) {
        await memoryManager.forceGarbageCollection();
        await memoryManager.clearUnusedModules();
        await memoryManager.optimizeImageCache();
      }

      // Force garbage collection if available
      if (typeof global !== 'undefined' && (global as any).gc) {
        (global as any).gc();
      }

      logger.info('ReactNativePerformanceEnforcer', 'Memory optimization completed');
    } catch (error) {
      logger.error('ReactNativePerformanceEnforcer', 'Memory optimization failed', error);
    }
  }

  /**
   * Preload critical chunks
   */
  async preloadCriticalChunks(): Promise<void> {
    if (!this.config.enableChunkPreloading) {
      return;
    }

    try {
      logger.info('ReactNativePerformanceEnforcer', 'Preloading critical chunks');

      if (codeSplittingManager) {
        await codeSplittingManager.preloadCriticalChunks();
      }

      // Simulate chunk preloading
      const criticalChunks = ['navigation', 'auth', 'common-ui'];

      for (const chunk of criticalChunks) {
        await this.preloadChunk(chunk);
      }

      logger.info('ReactNativePerformanceEnforcer', 'Critical chunks preloaded successfully');
    } catch (error) {
      logger.error('ReactNativePerformanceEnforcer', 'Failed to preload critical chunks', error);
    }
  }

  /**
   * Preload a specific chunk
   */
  private async preloadChunk(chunkName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Chunk ${chunkName} preload timeout`));
      }, this.config.chunkLoadTimeout);

      // Simulate chunk loading
      setTimeout(() => {
        clearTimeout(timeout);
        logger.debug('ReactNativePerformanceEnforcer', `Chunk ${chunkName} preloaded`);
        resolve();
      }, Math.random() * 1000 + 500); // 500-1500ms simulation
    });
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<{
    bundle: BundleInfo;
    memory: MemoryInfo;
    timestamp: number;
  }> {
    const bundle = await this.getBundleInfo();
    const memory = await this.getMemoryInfo();

    return {
      bundle,
      memory,
      timestamp: Date.now(),
    };
  }

  /**
   * Emit performance event
   */
  private emitEvent(event: PerformanceEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error('ReactNativePerformanceEnforcer', 'Event listener failed', error);
      }
    });

    logger.info('ReactNativePerformanceEnforcer', 'Performance event emitted', {
      type: event.type,
      serviceName: event.serviceName,
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: PerformanceEvent) => void): void {
    const id = Math.random().toString(36).substr(2, 9);
    this.eventListeners.set(id, listener);
    logger.info('ReactNativePerformanceEnforcer', 'Event listener added', { id });
  }

  /**
   * Remove event listener
   */
  removeEventListener(id: string): void {
    this.eventListeners.delete(id);
    logger.info('ReactNativePerformanceEnforcer', 'Event listener removed', { id });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ReactNativePerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('ReactNativePerformanceEnforcer', 'Configuration updated', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): ReactNativePerformanceConfig {
    return { ...this.config };
  }

  /**
   * Shutdown performance enforcer
   */
  shutdown(): void {
    if (this.bundleCheckInterval) {
      clearInterval(this.bundleCheckInterval);
      this.bundleCheckInterval = undefined;
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }

    this.eventListeners.clear();

    this.emitEvent({
      type: 'monitoring_stopped',
      serviceName: 'react_native_enforcer',
      timestamp: Date.now(),
      data: {},
    });

    logger.info('ReactNativePerformanceEnforcer', 'Performance enforcer shutdown completed');
  }
}