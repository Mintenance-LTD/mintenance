// ============================================================================
// METRICS COLLECTOR
// Performance metrics collection and component tracking
// ============================================================================

import { logger } from '../logger';
import {
  PerformanceMetric,
  ComponentPerformance,
  PerformanceViolation,
} from './types';

export class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: Map<string, ComponentPerformance> = new Map();
  private listeners: ((metric: PerformanceMetric) => void)[] = [];
  private maxMetrics = 1000; // Prevent memory leaks
  private isEnabled = __DEV__;

  constructor() {}

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  // ============================================================================
  // METRIC COLLECTION
  // ============================================================================

  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>,
    threshold?: number
  ): PerformanceMetric {
    if (!this.isEnabled) {
      return {
        name,
        value,
        timestamp: Date.now(),
        category,
        threshold,
        tags,
      };
    }

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      threshold,
      tags,
    };

    this.metrics.push(metric);
    this.notifyListeners(metric);

    // Prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }

    return metric;
  }

  // ============================================================================
  // TIMING UTILITIES
  // ============================================================================

  startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(name, duration, 'custom', tags);
    };
  }

  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category, { ...tags, status: 'error' });
      throw error;
    }
  }

  measureSync<T>(
    name: string,
    fn: () => T,
    category: PerformanceMetric['category'] = 'custom',
    tags?: Record<string, string>
  ): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category, { ...tags, status: 'error' });
      throw error;
    }
  }

  // ============================================================================
  // COMPONENT PERFORMANCE TRACKING
  // ============================================================================

  trackComponentRender(componentName: string, renderTime: number): void {
    if (!this.isEnabled) return;

    let component = this.componentMetrics.get(componentName);
    if (!component) {
      component = {
        componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        mountTime: Date.now(),
        updateTimes: [],
      };
      this.componentMetrics.set(componentName, component);
    }

    component.renderCount++;
    component.totalRenderTime += renderTime;
    component.averageRenderTime = component.totalRenderTime / component.renderCount;
    component.lastRenderTime = renderTime;
    component.updateTimes.push(renderTime);

    // Keep only last 10 render times
    if (component.updateTimes.length > 10) {
      component.updateTimes = component.updateTimes.slice(-10);
    }

    this.recordMetric(
      'component_render_time',
      renderTime,
      'render',
      { component: componentName }
    );
  }

  getComponentMetrics(componentName?: string): ComponentPerformance[] {
    if (componentName) {
      const component = this.componentMetrics.get(componentName);
      return component ? [component] : [];
    }
    return Array.from(this.componentMetrics.values());
  }

  // ============================================================================
  // MEMORY MONITORING
  // ============================================================================

  recordMemoryUsage(): void {
    if (!this.isEnabled || !(global.performance as any)?.memory) return;

    const memory = (global.performance as any).memory;

    this.recordMetric('js_heap_size_used', memory.usedJSHeapSize, 'custom');
    this.recordMetric('js_heap_size_total', memory.totalJSHeapSize, 'custom');
    this.recordMetric('js_heap_size_limit', memory.jsHeapSizeLimit, 'custom');
  }

  // ============================================================================
  // NETWORK PERFORMANCE
  // ============================================================================

  trackNetworkRequest(url: string, startTime: number, endTime: number, success: boolean): void {
    const duration = endTime - startTime;
    this.recordMetric(
      'api_response_time',
      duration,
      'network',
      {
        url: this.sanitizeUrl(url),
        success: success.toString(),
      }
    );
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return 'invalid_url';
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  onMetric(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(metric: PerformanceMetric): void {
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        logger.warn('Performance listener error', { data: error });
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  clearMetrics(): void {
    this.metrics = [];
    this.componentMetrics.clear();
  }

  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(m => m.category === category);
    }
    return [...this.metrics];
  }

  getMetricsInTimeRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }
}
