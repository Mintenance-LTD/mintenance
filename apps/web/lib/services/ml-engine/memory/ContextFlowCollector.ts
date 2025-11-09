/**
 * Context Flow Collector
 * 
 * Collects and queues context flow data from agent decisions
 * Extracts keys/values from agent operations
 * Queues updates for appropriate memory levels
 * Batches updates based on frequency requirements
 */

import { logger } from '@mintenance/shared';
import { OnlineLearningService } from './OnlineLearningService';
import type { ContextFlow } from '../../web/lib/services/ml-engine/memory/types';

/**
 * Context flow collector configuration
 */
export interface ContextFlowCollectorConfig {
  agentName: string;
  batchSize?: number;
  flushInterval?: number; // Auto-flush interval in ms (default: 60000 = 1 minute)
}

/**
 * Context Flow Collector
 * 
 * Collects context flow data from agent operations and queues for memory updates
 */
export class ContextFlowCollector {
  private onlineLearningService: OnlineLearningService;
  private config: ContextFlowCollectorConfig;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: ContextFlowCollectorConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 60000, // 1 minute
      ...config,
    };

    this.onlineLearningService = new OnlineLearningService({
      agentName: config.agentName,
      batchSize: this.config.batchSize,
      enableIncremental: true,
    });

    this.startAutoFlush();
  }

  /**
   * Collect context flow from agent decision
   */
  async collect(
    keys: number[],
    values: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.onlineLearningService.addDataPoint(keys, values, metadata);

      logger.debug('Context flow collected', {
        service: 'ContextFlowCollector',
        agentName: this.config.agentName,
        keysLength: keys.length,
        valuesLength: values.length,
      });
    } catch (error) {
      logger.error('Error collecting context flow', error, {
        service: 'ContextFlowCollector',
        agentName: this.config.agentName,
      });
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.config.flushInterval && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.onlineLearningService.flushQueue().catch((error) => {
          logger.error('Auto-flush failed', error, {
            service: 'ContextFlowCollector',
            agentName: this.config.agentName,
          });
        });
      }, this.config.flushInterval);
    }
  }

  /**
   * Stop auto-flush timer
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Force flush queue
   */
  async flush(): Promise<void> {
    await this.onlineLearningService.flushQueue();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.onlineLearningService.getQueueSize();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopAutoFlush();
    this.onlineLearningService.clearQueue();
  }
}

