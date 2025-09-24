/**
 * MEMORY MANAGEMENT & CLEANUP
 * Advanced memory management for React Native applications
 */

import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from './logger';

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
  componentCounts: Record<string, number>;
  listenerCounts: Record<string, number>;
}

export interface MemoryCleanupOptions {
  aggressive: boolean;
  clearCaches: boolean;
  removeListeners: boolean;
  gcSuggest: boolean;
}

export interface ComponentMemoryTracker {
  componentName: string;
  mountCount: number;
  unmountCount: number;
  currentInstances: number;
  memoryLeaks: number;
  lastCleanup: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryHistory: MemoryUsage[] = [];
  private componentTrackers = new Map<string, ComponentMemoryTracker>();
  private cleanupCallbacks = new Set<() => void>();
  private memoryWarningCallbacks = new Set<(usage: MemoryUsage) => void>();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  // Memory thresholds
  private readonly WARNING_THRESHOLD = 150 * 1024 * 1024; // 150MB
  private readonly CRITICAL_THRESHOLD = 300 * 1024 * 1024; // 300MB
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private readonly HISTORY_LIMIT = 100;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private constructor() {
    this.setupAppStateListener();
    this.startMemoryMonitoring();
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.CLEANUP_INTERVAL);

    logger.debug('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.debug('Memory monitoring stopped');
  }

  /**
   * Get current memory usage
   */
  async getCurrentMemoryUsage(): Promise<MemoryUsage> {
    try {
      // In a real React Native app, you'd use a native module to get actual memory usage
      // For now, we'll simulate memory usage
      const simulatedUsage = this.simulateMemoryUsage();

      const usage: MemoryUsage = {
        used: simulatedUsage.used,
        total: simulatedUsage.total,
        percentage: (simulatedUsage.used / simulatedUsage.total) * 100,
        timestamp: Date.now(),
        componentCounts: this.getComponentCounts(),
        listenerCounts: this.getListenerCounts(),
      };

      // Store in history
      this.memoryHistory.push(usage);
      if (this.memoryHistory.length > this.HISTORY_LIMIT) {
        this.memoryHistory.shift();
      }

      return usage;
    } catch (error) {
      logger.error('Failed to get memory usage:', error as Error);
      throw error;
    }
  }

  /**
   * Simulate memory usage (replace with native module in production)
   */
  private simulateMemoryUsage(): { used: number; total: number } {
    const baseUsage = 80 * 1024 * 1024; // 80MB base
    const variableUsage = Math.random() * 100 * 1024 * 1024; // Random up to 100MB
    const totalMemory = 2 * 1024 * 1024 * 1024; // 2GB total

    return {
      used: Math.floor(baseUsage + variableUsage),
      total: totalMemory,
    };
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private async checkMemoryUsage(): Promise<void> {
    try {
      const usage = await this.getCurrentMemoryUsage();

      logger.performance('Memory check', 0, {
        used: `${Math.round(usage.used / 1024 / 1024)}MB`,
        percentage: `${usage.percentage.toFixed(1)}%`,
      });

      // Trigger warnings
      if (usage.used > this.CRITICAL_THRESHOLD) {
        logger.error(
          'Critical memory usage detected',
          new Error('Memory usage critical'),
          {
            used: usage.used,
            percentage: usage.percentage,
          }
        );
        await this.performAggressiveCleanup();
      } else if (usage.used > this.WARNING_THRESHOLD) {
        logger.warn('High memory usage detected', {
          used: usage.used,
          percentage: usage.percentage,
        });
        this.notifyMemoryWarning(usage);
        await this.performCleanup();
      }
    } catch (error) {
      logger.error('Memory check failed:', error as Error);
    }
  }

  /**
   * Perform standard cleanup
   */
  async performCleanup(
    options: Partial<MemoryCleanupOptions> = {}
  ): Promise<void> {
    const cleanupOptions: MemoryCleanupOptions = {
      aggressive: false,
      clearCaches: true,
      removeListeners: false,
      gcSuggest: true,
      ...options,
    };

    logger.debug('Starting memory cleanup', { options: cleanupOptions });
    const startTime = performance.now();

    try {
      // Clear image caches
      if (cleanupOptions.clearCaches) {
        await this.clearImageCaches();
      }

      // Remove stale listeners
      if (cleanupOptions.removeListeners) {
        this.removeStaleListeners();
      }

      // Run registered cleanup callbacks
      this.runCleanupCallbacks();

      // Suggest garbage collection
      if (cleanupOptions.gcSuggest && global.gc) {
        global.gc();
        logger.debug('Garbage collection suggested');
      }

      const cleanupTime = performance.now() - startTime;
      logger.performance('Memory cleanup', cleanupTime, {
        type: cleanupOptions.aggressive ? 'aggressive' : 'standard',
      });
    } catch (error) {
      logger.error('Memory cleanup failed:', error as Error);
    }
  }

  /**
   * Perform aggressive cleanup for critical memory situations
   */
  private async performAggressiveCleanup(): Promise<void> {
    await this.performCleanup({
      aggressive: true,
      clearCaches: true,
      removeListeners: true,
      gcSuggest: true,
    });

    // Additional aggressive measures
    this.clearComponentTrackers();
    this.trimMemoryHistory();
  }

  /**
   * Clear image caches
   */
  private async clearImageCaches(): Promise<void> {
    try {
      // In a real app, you'd clear React Native image caches
      // This is a placeholder for the actual implementation
      logger.debug('Image caches cleared');
    } catch (error) {
      logger.warn('Failed to clear image caches:', { data: error });
    }
  }

  /**
   * Remove stale event listeners
   */
  private removeStaleListeners(): void {
    try {
      // Track and remove stale listeners
      // This would integrate with your event system
      logger.debug('Stale listeners removed');
    } catch (error) {
      logger.warn('Failed to remove stale listeners:', { data: error });
    }
  }

  /**
   * Run all registered cleanup callbacks
   */
  private runCleanupCallbacks(): void {
    let callbackCount = 0;
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
        callbackCount++;
      } catch (error) {
        logger.warn('Cleanup callback failed:', { data: error });
      }
    });

    logger.debug(`Executed ${callbackCount} cleanup callbacks`);
  }

  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);

    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Register memory warning callback
   */
  registerMemoryWarningCallback(
    callback: (usage: MemoryUsage) => void
  ): () => void {
    this.memoryWarningCallbacks.add(callback);

    return () => {
      this.memoryWarningCallbacks.delete(callback);
    };
  }

  /**
   * Track component mounting/unmounting
   */
  trackComponent(componentName: string, action: 'mount' | 'unmount'): void {
    let tracker = this.componentTrackers.get(componentName);

    if (!tracker) {
      tracker = {
        componentName,
        mountCount: 0,
        unmountCount: 0,
        currentInstances: 0,
        memoryLeaks: 0,
        lastCleanup: Date.now(),
      };
      this.componentTrackers.set(componentName, tracker);
    }

    if (action === 'mount') {
      tracker.mountCount++;
      tracker.currentInstances++;
    } else {
      tracker.unmountCount++;
      tracker.currentInstances--;
    }

    // Detect potential memory leaks
    if (tracker.currentInstances < 0) {
      tracker.memoryLeaks++;
      tracker.currentInstances = 0;
      logger.warn(`Potential memory leak detected in ${componentName}`, {
        mountCount: tracker.mountCount,
        unmountCount: tracker.unmountCount,
      });
    }
  }

  /**
   * Get component memory report
   */
  getComponentMemoryReport(): ComponentMemoryTracker[] {
    return Array.from(this.componentTrackers.values()).sort(
      (a, b) => b.currentInstances - a.currentInstances
    );
  }

  /**
   * Clear component trackers
   */
  private clearComponentTrackers(): void {
    this.componentTrackers.clear();
    logger.debug('Component trackers cleared');
  }

  /**
   * Trim memory history to save space
   */
  private trimMemoryHistory(): void {
    const keepCount = Math.floor(this.HISTORY_LIMIT / 2);
    this.memoryHistory = this.memoryHistory.slice(-keepCount);
    logger.debug(`Memory history trimmed to ${keepCount} entries`);
  }

  /**
   * Get component counts for tracking
   */
  private getComponentCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.componentTrackers.forEach((tracker, name) => {
      counts[name] = tracker.currentInstances;
    });
    return counts;
  }

  /**
   * Get listener counts (placeholder)
   */
  private getListenerCounts(): Record<string, number> {
    // In a real app, this would track actual event listeners
    return {
      navigation: 5,
      network: 3,
      keyboard: 2,
    };
  }

  /**
   * Notify memory warning callbacks
   */
  private notifyMemoryWarning(usage: MemoryUsage): void {
    this.memoryWarningCallbacks.forEach((callback) => {
      try {
        callback(usage);
      } catch (error) {
        logger.warn('Memory warning callback failed:', { data: error });
      }
    });
  }

  /**
   * Setup app state listener for cleanup on background
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        logger.debug('App moved to background, performing cleanup');
        this.performCleanup();
      }
    });
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * Generate memory usage report
   */
  generateMemoryReport(): {
    current: MemoryUsage | null;
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    issues: string[];
  } {
    if (this.memoryHistory.length === 0) {
      return {
        current: null,
        average: 0,
        peak: 0,
        trend: 'stable',
        issues: ['No memory data available'],
      };
    }

    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const average =
      this.memoryHistory.reduce((sum, usage) => sum + usage.used, 0) /
      this.memoryHistory.length;
    const peak = Math.max(...this.memoryHistory.map((usage) => usage.used));

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.memoryHistory.length >= 5) {
      const recent = this.memoryHistory.slice(-5);
      const firstHalf =
        recent.slice(0, 2).reduce((sum, usage) => sum + usage.used, 0) / 2;
      const secondHalf =
        recent.slice(-2).reduce((sum, usage) => sum + usage.used, 0) / 2;

      const change = ((secondHalf - firstHalf) / firstHalf) * 100;
      if (change > 10) trend = 'increasing';
      else if (change < -10) trend = 'decreasing';
    }

    // Identify issues
    const issues: string[] = [];
    if (current.percentage > 90) {
      issues.push('Critical memory usage detected');
    }
    if (trend === 'increasing') {
      issues.push('Memory usage is trending upward');
    }

    const leakyComponents = Array.from(this.componentTrackers.values()).filter(
      (tracker) => tracker.memoryLeaks > 0
    );
    if (leakyComponents.length > 0) {
      issues.push(
        `Potential memory leaks in ${leakyComponents.length} components`
      );
    }

    return {
      current,
      average,
      peak,
      trend,
      issues,
    };
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// React hook for memory management
export const useMemoryCleanup = (cleanupFn?: () => void) => {
  React.useEffect(() => {
    const unregister = cleanupFn
      ? memoryManager.registerCleanupCallback(cleanupFn)
      : null;

    return () => {
      if (unregister) {
        unregister();
      }
    };
  }, [cleanupFn]);
};

// Higher-order component for memory tracking
export const withMemoryTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const React = require('react') as typeof import('react');
  const name =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Unknown';

  return React.forwardRef((props: any, ref: any) => {
    React.useEffect(() => {
      memoryManager.trackComponent(name, 'mount');

      return () => {
        memoryManager.trackComponent(name, 'unmount');
      };
    }, []);

    return React.createElement(WrappedComponent, { ...props, ref });
  });
};
