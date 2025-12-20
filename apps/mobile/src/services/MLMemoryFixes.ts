/**
 * ML Memory Leak Fixes
 * Comprehensive memory management for ML training components
 */

import * as tf from '@tensorflow/tfjs';
import { logger } from '../utils/logger';
import { memoryManager } from '../utils/memoryManager';

export interface MLMemoryTracker {
  component: string;
  tensors: tf.Tensor[];
  intervals: NodeJS.Timeout[];
  timeouts: NodeJS.Timeout[];
  eventListeners: Array<{
    element: any;
    event: string;
    handler: Function;
  }>;
  models: Map<string, tf.LayersModel>;
  startTime: number;
  memoryUsage: number;
}

/**
 * ML Memory Manager
 * Handles memory leaks specific to ML training components
 */
export class MLMemoryManager {
  private static instance: MLMemoryManager;
  private componentTrackers = new Map<string, MLMemoryTracker>();
  private globalCleanupTasks: Array<() => Promise<void>> = [];
  private memoryCheckInterval?: NodeJS.Timeout;
  private tensorCountThreshold = 50;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB

  static getInstance(): MLMemoryManager {
    if (!this.instance) {
      this.instance = new MLMemoryManager();
      this.instance.initialize();
    }
    return this.instance;
  }

  /**
   * Initialize ML memory management
   */
  private initialize(): void {
    logger.info('MLMemoryManager', 'Initializing ML memory management');

    // Start periodic memory checks
    this.startMemoryMonitoring();

    // Register global cleanup
    this.registerGlobalCleanup();

    logger.info('MLMemoryManager', 'ML memory management initialized');
  }

  /**
   * Register ML component for memory tracking
   */
  registerComponent(componentName: string): string {
    const tracker: MLMemoryTracker = {
      component: componentName,
      tensors: [],
      intervals: [],
      timeouts: [],
      eventListeners: [],
      models: new Map(),
      startTime: Date.now(),
      memoryUsage: this.getCurrentMemoryUsage()
    };

    this.componentTrackers.set(componentName, tracker);

    logger.debug('MLMemoryManager', 'Registered ML component', {
      component: componentName,
      initialMemory: tracker.memoryUsage
    });

    return componentName;
  }

  /**
   * Track tensor creation
   */
  trackTensor(componentName: string, tensor: tf.Tensor, description?: string): tf.Tensor {
    const tracker = this.componentTrackers.get(componentName);
    if (tracker) {
      tracker.tensors.push(tensor);

      logger.debug('MLMemoryManager', 'Tracked tensor', {
        component: componentName,
        tensorShape: tensor.shape,
        totalTensors: tracker.tensors.length,
        description
      });

      // Check for tensor leak
      if (tracker.tensors.length > this.tensorCountThreshold) {
        logger.warn('MLMemoryManager', 'Potential tensor leak detected', {
          component: componentName,
          tensorCount: tracker.tensors.length,
          threshold: this.tensorCountThreshold
        });
      }
    }

    return tensor;
  }

  /**
   * Track model creation
   */
  trackModel(componentName: string, modelName: string, model: tf.LayersModel): tf.LayersModel {
    const tracker = this.componentTrackers.get(componentName);
    if (tracker) {
      // Dispose previous model if exists
      const existingModel = tracker.models.get(modelName);
      if (existingModel) {
        existingModel.dispose();
        logger.debug('MLMemoryManager', 'Disposed previous model', {
          component: componentName,
          modelName
        });
      }

      tracker.models.set(modelName, model);

      logger.debug('MLMemoryManager', 'Tracked model', {
        component: componentName,
        modelName,
        totalModels: tracker.models.size
      });
    }

    return model;
  }

  /**
   * Track interval for cleanup
   */
  trackInterval(componentName: string, interval: NodeJS.Timeout): NodeJS.Timeout {
    const tracker = this.componentTrackers.get(componentName);
    if (tracker) {
      tracker.intervals.push(interval);

      logger.debug('MLMemoryManager', 'Tracked interval', {
        component: componentName,
        totalIntervals: tracker.intervals.length
      });
    }

    return interval;
  }

  /**
   * Track timeout for cleanup
   */
  trackTimeout(componentName: string, timeout: NodeJS.Timeout): NodeJS.Timeout {
    const tracker = this.componentTrackers.get(componentName);
    if (tracker) {
      tracker.timeouts.push(timeout);

      logger.debug('MLMemoryManager', 'Tracked timeout', {
        component: componentName,
        totalTimeouts: tracker.timeouts.length
      });
    }

    return timeout;
  }

  /**
   * Track event listener for cleanup
   */
  trackEventListener(
    componentName: string,
    element: any,
    event: string,
    handler: Function
  ): void {
    const tracker = this.componentTrackers.get(componentName);
    if (tracker) {
      tracker.eventListeners.push({ element, event, handler });

      logger.debug('MLMemoryManager', 'Tracked event listener', {
        component: componentName,
        event,
        totalListeners: tracker.eventListeners.length
      });
    }
  }

  /**
   * Dispose tensors for component
   */
  disposeTensors(componentName: string): void {
    const tracker = this.componentTrackers.get(componentName);
    if (!tracker) return;

    let disposedCount = 0;
    tracker.tensors.forEach(tensor => {
      if (!tensor.isDisposed) {
        tensor.dispose();
        disposedCount++;
      }
    });

    tracker.tensors = [];

    logger.info('MLMemoryManager', 'Disposed tensors', {
      component: componentName,
      count: disposedCount
    });
  }

  /**
   * Dispose models for component
   */
  disposeModels(componentName: string): void {
    const tracker = this.componentTrackers.get(componentName);
    if (!tracker) return;

    let disposedCount = 0;
    tracker.models.forEach((model, modelName) => {
      model.dispose();
      disposedCount++;
      logger.debug('MLMemoryManager', 'Disposed model', {
        component: componentName,
        modelName
      });
    });

    tracker.models.clear();

    logger.info('MLMemoryManager', 'Disposed models', {
      component: componentName,
      count: disposedCount
    });
  }

  /**
   * Clear intervals for component
   */
  clearIntervals(componentName: string): void {
    const tracker = this.componentTrackers.get(componentName);
    if (!tracker) return;

    tracker.intervals.forEach(interval => {
      clearInterval(interval);
    });

    const count = tracker.intervals.length;
    tracker.intervals = [];

    logger.info('MLMemoryManager', 'Cleared intervals', {
      component: componentName,
      count
    });
  }

  /**
   * Clear timeouts for component
   */
  clearTimeouts(componentName: string): void {
    const tracker = this.componentTrackers.get(componentName);
    if (!tracker) return;

    tracker.timeouts.forEach(timeout => {
      clearTimeout(timeout);
    });

    const count = tracker.timeouts.length;
    tracker.timeouts = [];

    logger.info('MLMemoryManager', 'Cleared timeouts', {
      component: componentName,
      count
    });
  }

  /**
   * Remove event listeners for component
   */
  removeEventListeners(componentName: string): void {
    const tracker = this.componentTrackers.get(componentName);
    if (!tracker) return;

    tracker.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });

    const count = tracker.eventListeners.length;
    tracker.eventListeners = [];

    logger.info('MLMemoryManager', 'Removed event listeners', {
      component: componentName,
      count
    });
  }

  /**
   * Cleanup all resources for component
   */
  cleanupComponent(componentName: string): void {
    logger.info('MLMemoryManager', 'Starting component cleanup', { component: componentName });

    const startMemory = this.getCurrentMemoryUsage();

    // Dispose tensors
    this.disposeTensors(componentName);

    // Dispose models
    this.disposeModels(componentName);

    // Clear intervals
    this.clearIntervals(componentName);

    // Clear timeouts
    this.clearTimeouts(componentName);

    // Remove event listeners
    this.removeEventListeners(componentName);

    // Remove tracker
    this.componentTrackers.delete(componentName);

    const endMemory = this.getCurrentMemoryUsage();
    const memoryFreed = startMemory - endMemory;

    logger.info('MLMemoryManager', 'Component cleanup completed', {
      component: componentName,
      memoryFreed: this.formatBytes(memoryFreed),
      remainingComponents: this.componentTrackers.size
    });
  }

  /**
   * Cleanup all ML components
   */
  cleanupAllComponents(): void {
    logger.info('MLMemoryManager', 'Starting cleanup of all ML components');

    const componentNames = Array.from(this.componentTrackers.keys());
    componentNames.forEach(componentName => {
      this.cleanupComponent(componentName);
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.debug('MLMemoryManager', 'Forced garbage collection');
    }

    logger.info('MLMemoryManager', 'All ML components cleaned up');
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds

    // Register for cleanup
    this.globalCleanupTasks.push(async () => {
      if (this.memoryCheckInterval) {
        clearInterval(this.memoryCheckInterval);
        this.memoryCheckInterval = undefined;
      }
    });
  }

  /**
   * Check memory usage and detect leaks
   */
  private checkMemoryUsage(): void {
    const totalMemory = this.getCurrentMemoryUsage();
    const tensorCount = tf.memory().numTensors;

    // Check each component
    this.componentTrackers.forEach((tracker, componentName) => {
      const componentMemory = this.getCurrentMemoryUsage() - tracker.memoryUsage;
      const tensorLeakDetected = tracker.tensors.length > this.tensorCountThreshold;
      const memoryLeakDetected = componentMemory > this.memoryThreshold;

      if (tensorLeakDetected || memoryLeakDetected) {
        logger.warn('MLMemoryManager', 'Memory leak detected', {
          component: componentName,
          tensorCount: tracker.tensors.length,
          memoryUsage: this.formatBytes(componentMemory),
          tensorLeak: tensorLeakDetected,
          memoryLeak: memoryLeakDetected
        });

        // Perform automatic cleanup for leaked resources
        this.performAutomaticCleanup(componentName);
      }
    });

    logger.debug('MLMemoryManager', 'Memory check completed', {
      totalMemory: this.formatBytes(totalMemory),
      tensorCount,
      componentsTracked: this.componentTrackers.size
    });
  }

  /**
   * Perform automatic cleanup for leaked resources
   */
  private performAutomaticCleanup(componentName: string): void {
    const tracker = this.componentTrackers.get(componentName);
    if (!tracker) return;

    logger.info('MLMemoryManager', 'Performing automatic cleanup', { component: componentName });

    // Dispose old tensors (keep only recent ones)
    const recentTensorCount = Math.min(20, tracker.tensors.length);
    const tensorsToDispose = tracker.tensors.slice(0, -recentTensorCount);

    tensorsToDispose.forEach(tensor => {
      if (!tensor.isDisposed) {
        tensor.dispose();
      }
    });

    tracker.tensors = tracker.tensors.slice(-recentTensorCount);

    logger.info('MLMemoryManager', 'Automatic cleanup completed', {
      component: componentName,
      tensorsDisposed: tensorsToDispose.length,
      remainingTensors: tracker.tensors.length
    });
  }

  /**
   * Register global cleanup
   */
  private registerGlobalCleanup(): void {
    const cleanup = async () => {
      logger.info('MLMemoryManager', 'Performing global ML cleanup');

      // Execute all cleanup tasks
      for (const task of this.globalCleanupTasks) {
        try {
          await task();
        } catch (error) {
          logger.error('MLMemoryManager', 'Cleanup task failed', error as Error);
        }
      }

      // Cleanup all components
      this.cleanupAllComponents();
    };

    // Register with memory manager
    memoryManager.registerCleanupCallback(cleanup);

    // Register process handlers
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  }

  /**
   * Get component statistics
   */
  getComponentStats(): Map<string, {
    tensors: number;
    models: number;
    intervals: number;
    timeouts: number;
    listeners: number;
    uptime: number;
    memoryUsage: number;
  }> {
    const stats = new Map();

    this.componentTrackers.forEach((tracker, componentName) => {
      stats.set(componentName, {
        tensors: tracker.tensors.length,
        models: tracker.models.size,
        intervals: tracker.intervals.length,
        timeouts: tracker.timeouts.length,
        listeners: tracker.eventListeners.length,
        uptime: Date.now() - tracker.startTime,
        memoryUsage: this.getCurrentMemoryUsage() - tracker.memoryUsage
      });
    });

    return stats;
  }

  /**
   * Generate memory report
   */
  generateMemoryReport(): string {
    const stats = this.getComponentStats();
    const totalMemory = this.getCurrentMemoryUsage();
    const tensorInfo = tf.memory();

    let report = `# ML Memory Usage Report

## Overview
- **Total Memory**: ${this.formatBytes(totalMemory)}
- **TensorFlow Tensors**: ${tensorInfo.numTensors}
- **Tracked Components**: ${this.componentTrackers.size}

## Component Breakdown
`;

    if (stats.size === 0) {
      report += 'No ML components currently tracked.\n';
    } else {
      stats.forEach((componentStats, componentName) => {
        const leakIndicators = [];
        if (componentStats.tensors > this.tensorCountThreshold) {
          leakIndicators.push('🔴 Tensor Leak');
        }
        if (componentStats.memoryUsage > this.memoryThreshold) {
          leakIndicators.push('🔴 Memory Leak');
        }

        report += `
### ${componentName} ${leakIndicators.length > 0 ? leakIndicators.join(' ') : '✅'}
- **Tensors**: ${componentStats.tensors}
- **Models**: ${componentStats.models}
- **Intervals**: ${componentStats.intervals}
- **Timeouts**: ${componentStats.timeouts}
- **Event Listeners**: ${componentStats.listeners}
- **Uptime**: ${Math.round(componentStats.uptime / 1000)}s
- **Memory Usage**: ${this.formatBytes(componentStats.memoryUsage)}
`;
      });
    }

    report += `
## Recommendations
`;

    if (tensorInfo.numTensors > 100) {
      report += '- High tensor count detected. Consider using tf.tidy() for automatic cleanup.\n';
    }

    if (totalMemory > 200 * 1024 * 1024) {
      report += '- High memory usage detected. Consider running cleanup operations.\n';
    }

    const hasLeaks = Array.from(stats.values()).some(stat =>
      stat.tensors > this.tensorCountThreshold || stat.memoryUsage > this.memoryThreshold
    );

    if (hasLeaks) {
      report += '- Memory leaks detected. Run automatic cleanup or restart affected components.\n';
    }

    if (!hasLeaks && tensorInfo.numTensors < 50 && totalMemory < 100 * 1024 * 1024) {
      report += '✅ All memory usage is within acceptable limits.\n';
    }

    report += `
---
*Generated at: ${new Date().toLocaleString()}*
`;

    return report;
  }
}

// Export singleton instance
export const mlMemoryManager = MLMemoryManager.getInstance();