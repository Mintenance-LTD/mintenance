/**
 * Online Learning Service
 * 
 * Implements incremental updates without full retraining
 * Processes new data points incrementally
 * Updates only affected memory levels based on frequency
 * Avoids catastrophic forgetting through multi-level updates
 */

import { logger } from '@mintenance/shared';
import { memoryManager } from './MemoryManager';
import type { ContextFlow } from './types';

/**
 * Online learning configuration
 */
export interface OnlineLearningConfig {
  agentName: string;
  batchSize?: number; // Process updates in batches (default: 10)
  updateThreshold?: number; // Minimum data points before update (default: 1)
  enableIncremental?: boolean; // Enable incremental updates (default: true)
}

/**
 * Online Learning Service
 * 
 * Handles incremental model updates without full retraining
 */
export class OnlineLearningService {
  private updateQueue: Map<string, ContextFlow[]> = new Map();
  private config: OnlineLearningConfig;

  constructor(config: OnlineLearningConfig) {
    this.config = {
      batchSize: 10,
      updateThreshold: 1,
      enableIncremental: true,
      ...config,
    };
  }

  /**
   * Add new data point for online learning
   */
  async addDataPoint(
    keys: number[],
    values: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enableIncremental) {
      logger.debug('Online learning disabled, skipping data point', {
        service: 'OnlineLearningService',
        agentName: this.config.agentName,
      });
      return;
    }

    const flow: ContextFlow = {
      keys,
      values,
      timestamp: new Date(),
      metadata,
    };

    // Add to queue
    const queue = this.updateQueue.get(this.config.agentName) || [];
    queue.push(flow);
    this.updateQueue.set(this.config.agentName, queue);

    // Check if update threshold reached
    if (queue.length >= (this.config.updateThreshold || 1)) {
      await this.processQueue();
    }
  }

  /**
   * Process update queue
   */
  private async processQueue(): Promise<void> {
    const queue = this.updateQueue.get(this.config.agentName) || [];
    if (queue.length === 0) return;

    // Process in batches
    const batchSize = this.config.batchSize || 10;
    const batches: ContextFlow[][] = [];
    
    for (let i = 0; i < queue.length; i += batchSize) {
      batches.push(queue.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      try {
        // Add context flows to memory manager
        // Each level will update at its own frequency
        for (const flow of batch) {
          for (let level = 0; level < 3; level++) {
            try {
              await memoryManager.addContextFlow(
                this.config.agentName,
                flow.keys,
                flow.values,
                level
              );
            } catch (error) {
              logger.warn('Failed to add context flow in online learning', {
                service: 'OnlineLearningService',
                agentName: this.config.agentName,
                level,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }

        logger.info('Processed online learning batch', {
          service: 'OnlineLearningService',
          agentName: this.config.agentName,
          batchSize: batch.length,
          totalQueued: queue.length,
        });
      } catch (error) {
        logger.error('Error processing online learning batch', error, {
          service: 'OnlineLearningService',
          agentName: this.config.agentName,
        });
      }
    }

    // Clear processed items from queue
    this.updateQueue.set(this.config.agentName, []);
  }

  /**
   * Force immediate processing of queue
   */
  async flushQueue(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.updateQueue.get(this.config.agentName)?.length || 0;
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.updateQueue.set(this.config.agentName, []);
  }
}

