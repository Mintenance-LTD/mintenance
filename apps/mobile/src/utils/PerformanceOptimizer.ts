/**
 * Performance Optimizer
 * 
 * Advanced performance optimization utilities for React Native.
 */

import { InteractionManager } from 'react-native';
import React from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceOptimizerService {
  private metrics: Map<string, PerformanceMetric> = new Map();

  /**
   * Track performance metric
   */
  public startMetric(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
    });
  }

  public endMetric(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    if (metric.duration > 100) {
      logger.warn(`🐌 Slow operation: ${name} took ${metric.duration}ms`);
    }

    this.metrics.delete(name);
    return metric.duration;
  }

  /**
   * Debounce function calls
   */
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function calls
   */
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Run after interactions for smooth UX
   */
  public runAfterInteractions(callback: () => void): void {
    InteractionManager.runAfterInteractions(callback);
  }

  /**
   * Batch multiple operations
   */
  public batchOperations(operations: Array<() => void>): void {
    InteractionManager.runAfterInteractions(() => {
      operations.forEach(op => op());
    });
  }
}

export const PerformanceOptimizer = new PerformanceOptimizerService();

/**
 * Performance hooks
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttledCallback = React.useMemo(
    () => PerformanceOptimizer.throttle(callback, delay),
    [callback, delay]
  );

  return throttledCallback as T;
}

export default PerformanceOptimizer;
