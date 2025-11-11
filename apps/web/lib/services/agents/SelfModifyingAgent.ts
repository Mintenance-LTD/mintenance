/**
 * Self-Modifying Agent Base Class
 * 
 * Base class for agents that learn to modify their own update rules
 * Implements dynamic key/value/query projections based on context
 * 
 * Reference: Paper "Self-Modifying Titans" section
 * Learn update algorithm: W_{t+1} = W_t(I - x_t x_t^T) - η_{t+1}∇L
 */

import { logger } from '@mintenance/shared';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import type { ContextFlow, MemoryQueryResult } from '../ml-engine/memory/types';

/**
 * Self-modification configuration
 */
export interface SelfModificationConfig {
  agentName: string;
  enableSelfModification?: boolean;
  modificationThreshold?: number; // Performance threshold to trigger modification
  adaptationRate?: number; // Rate of adaptation (default: 0.01)
}

/**
 * Performance metrics for self-modification
 */
export interface PerformanceMetrics {
  accuracy: number;
  errorRate: number;
  latency: number;
  timestamp: Date;
}

/**
 * Self-Modifying Agent Base Class
 * 
 * Provides foundation for agents that can modify their own update rules
 */
export abstract class SelfModifyingAgent {
  protected config: SelfModificationConfig;
  protected performanceHistory: PerformanceMetrics[] = [];
  protected modificationCount: number = 0;

  constructor(config: SelfModificationConfig) {
    this.config = {
      enableSelfModification: true,
      modificationThreshold: 0.1, // 10% performance drop triggers modification
      adaptationRate: 0.01,
      ...config,
    };
  }

  /**
   * Query memory with dynamic key/value/query projections
   * Can be overridden by subclasses to implement custom projections
   */
  protected async queryMemory(
    keys: number[],
    level?: number
  ): Promise<MemoryQueryResult> {
    return memoryManager.query(this.config.agentName, keys, level);
  }

  /**
   * Add context flow with dynamic projections
   */
  protected async addContextFlow(
    keys: number[],
    values: number[],
    level?: number
  ): Promise<void> {
    // Apply dynamic key/value projections if needed
    const projectedKeys = this.projectKeys(keys);
    const projectedValues = this.projectValues(values);

    await memoryManager.addContextFlow(
      this.config.agentName,
      projectedKeys,
      projectedValues,
      level
    );
  }

  /**
   * Project keys dynamically based on context
   * Override in subclasses for custom projection logic
   */
  protected projectKeys(keys: number[]): number[] {
    // Default: no projection
    return keys;
  }

  /**
   * Project values dynamically based on context
   * Override in subclasses for custom projection logic
   */
  protected projectValues(values: number[]): number[] {
    // Default: no projection
    return values;
  }

  /**
   * Record performance metrics
   */
  protected recordPerformance(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);

    // Keep only recent history (last 100 entries)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    // Check if self-modification is needed
    if (this.config.enableSelfModification) {
      this.checkAndModify();
    }
  }

  /**
   * Check if self-modification is needed based on performance
   */
  private checkAndModify(): void {
    if (this.performanceHistory.length < 10) {
      // Not enough data to make decisions
      return;
    }

    // Calculate recent performance trend
    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);

    if (older.length === 0) return;

    const recentAvgAccuracy = recent.reduce((sum, m) => sum + m.accuracy, 0) / recent.length;
    const olderAvgAccuracy = older.reduce((sum, m) => sum + m.accuracy, 0) / older.length;

    const performanceDrop = olderAvgAccuracy - recentAvgAccuracy;
    const threshold = this.config.modificationThreshold || 0.1;

    if (performanceDrop > threshold) {
      // Performance degraded, trigger self-modification
      this.triggerSelfModification(performanceDrop);
    }
  }

  /**
   * Trigger self-modification
   * Override in subclasses to implement specific modification logic
   */
  protected abstract triggerSelfModification(performanceDrop: number): Promise<void>;

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Get modification count
   */
  getModificationCount(): number {
    return this.modificationCount;
  }

  /**
   * Increment modification count
   */
  protected incrementModificationCount(): void {
    this.modificationCount += 1;
    logger.info('Self-modification triggered', {
      agentName: this.config.agentName,
      modificationCount: this.modificationCount,
    });
  }
}

