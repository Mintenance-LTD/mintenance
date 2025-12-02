/**
 * Memory Manager
 * 
 * Singleton service that coordinates continuum memory systems across all agents
 * Manages memory updates, ensures frequency compliance, and provides unified interface
 * 
 * Implements Equation 31 update logic: θ_{i+1} = θ_i - Ση_t f(θ_i; x_t) when i ≡ 0 (mod C^(ℓ))
 */

import { logger } from '@mintenance/shared';
import { ContinuumMemorySystem } from './ContinuumMemorySystem';
import type {
  ContinuumMemoryConfig,
  MemoryLevel,
  ContextFlow,
  MemoryUpdateResult,
  MemoryQueryResult,
  MemoryPerformanceMetrics,
} from './types';

/**
 * Memory Manager
 * 
 * Singleton that manages all continuum memory instances
 * Coordinates updates across frequency levels
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private memorySystems: Map<string, ContinuumMemorySystem> = new Map();
  private initialized = false;
  private updateScheduler: NodeJS.Timeout | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Initialize memory manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing MemoryManager');

      // Start update scheduler for periodic memory consolidation
      this.startUpdateScheduler();

      this.initialized = true;
      logger.info('MemoryManager initialized');
    } catch (error) {
      logger.error('Failed to initialize MemoryManager', error, {
        service: 'MemoryManager',
      });
      throw error;
    }
  }

  /**
   * Register or get memory system for an agent
   */
  public async getOrCreateMemorySystem(
    config: ContinuumMemoryConfig
  ): Promise<ContinuumMemorySystem> {
    await this.initialize();

    const existing = this.memorySystems.get(config.agentName);
    if (existing) {
      return existing;
    }

    // Create new memory system
    const memorySystem = new ContinuumMemorySystem(config);
    this.memorySystems.set(config.agentName, memorySystem);

    logger.info('Memory system created', {
      agentName: config.agentName,
      levels: config.levels.length,
    });

    return memorySystem;
  }

  /**
   * Get memory system for an agent
   */
  public getMemorySystem(agentName: string): ContinuumMemorySystem | undefined {
    return this.memorySystems.get(agentName);
  }

  /**
   * Process input through agent's memory system
   */
  public async process(
    agentName: string,
    input: number[]
  ): Promise<number[]> {
    const memorySystem = this.getMemorySystem(agentName);
    if (!memorySystem) {
      throw new Error(`Memory system not found for agent: ${agentName}`);
    }

    const result = await memorySystem.process(input);
    memorySystem.incrementStep();
    return result;
  }

  /**
   * Query memory with keys
   */
  public async query(
    agentName: string,
    keys: number[],
    level?: number
  ): Promise<MemoryQueryResult> {
    const memorySystem = this.getMemorySystem(agentName);
    if (!memorySystem) {
      throw new Error(`Memory system not found for agent: ${agentName}`);
    }

    return memorySystem.query(keys, level);
  }

  /**
   * Add context flow data for memory updates
   */
  public async addContextFlow(
    agentName: string,
    keys: number[],
    values: number[],
    level?: number
  ): Promise<void> {
    const memorySystem = this.getMemorySystem(agentName);
    if (!memorySystem) {
      throw new Error(`Memory system not found for agent: ${agentName}`);
    }

    await memorySystem.addContextFlow(keys, values, level);
  }

  /**
   * Trigger memory update for a specific level
   */
  public async updateMemoryLevel(
    agentName: string,
    level: number
  ): Promise<MemoryUpdateResult> {
    const memorySystem = this.getMemorySystem(agentName);
    if (!memorySystem) {
      throw new Error(`Memory system not found for agent: ${agentName}`);
    }

    return memorySystem.updateMemoryLevel(level);
  }

  /**
   * Get all memory levels for an agent
   */
  public getMemoryLevels(agentName: string): MemoryLevel[] {
    const memorySystem = this.getMemorySystem(agentName);
    if (!memorySystem) {
      return [];
    }

    return memorySystem.getMemoryLevels();
  }

  /**
   * Get performance metrics for memory system
   */
  public async getPerformanceMetrics(
    agentName: string
  ): Promise<MemoryPerformanceMetrics[]> {
    const memorySystem = this.getMemorySystem(agentName);
    if (!memorySystem) {
      return [];
    }

    const levels = memorySystem.getMemoryLevels();
    const metrics: MemoryPerformanceMetrics[] = [];

    for (const level of levels) {
      const levelMetrics = await this.calculateLevelMetrics(agentName, level);
      metrics.push(levelMetrics);
    }

    return metrics;
  }

  /**
   * Consolidate memory for all agents
   * Triggers updates for levels that are due
   */
  public async consolidateAll(): Promise<void> {
    logger.info('Starting memory consolidation for all agents');

    const consolidationPromises: Promise<void>[] = [];

    for (const [agentName, memorySystem] of this.memorySystems.entries()) {
      const levels = memorySystem.getMemoryLevels();
      const currentStep = memorySystem.getCurrentStep();

      for (const level of levels) {
        const stepsSinceUpdate = currentStep - level.lastUpdateStep;
        if (stepsSinceUpdate >= level.chunkSize) {
          consolidationPromises.push(
            memorySystem
              .updateMemoryLevel(level.level)
              .then(() => {
                logger.debug('Memory level consolidated', {
                  agentName,
                  level: level.level,
                });
              })
              .catch((error) => {
                logger.error('Failed to consolidate memory level', error, {
                  agentName,
                  level: level.level,
                });
              })
          );
        }
      }
    }

    await Promise.allSettled(consolidationPromises);

    logger.info('Memory consolidation completed', {
      agentsProcessed: this.memorySystems.size,
    });
  }

  /**
   * Start update scheduler for periodic consolidation
   */
  private startUpdateScheduler(): void {
    // Run consolidation every hour
    const intervalMs = 60 * 60 * 1000; // 1 hour

    this.updateScheduler = setInterval(() => {
      this.consolidateAll().catch((error) => {
        logger.error('Scheduled memory consolidation failed', error, {
          service: 'MemoryManager',
        });
      });
    }, intervalMs);

    logger.info('Memory update scheduler started', {
      intervalMs,
    });
  }

  /**
   * Stop update scheduler
   */
  public stopUpdateScheduler(): void {
    if (this.updateScheduler) {
      clearInterval(this.updateScheduler);
      this.updateScheduler = null;
      logger.info('Memory update scheduler stopped');
    }
  }

  /**
   * Calculate performance metrics for a memory level
   */
  private async calculateLevelMetrics(
    agentName: string,
    level: MemoryLevel
  ): Promise<MemoryPerformanceMetrics> {
    // Use relative path for tsx compatibility (when running scripts from root)
    const { serverSupabase } = await import('../../../api/supabaseServer');

    // Get memory state ID
    const memoryStateId = await this.getMemoryStateId(agentName, level.level);

    // Get update history for compliance calculation
    const { data: updateHistory } = await serverSupabase
      .from('memory_update_history')
      .select('*')
      .eq('memory_state_id', memoryStateId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Define type for update history records
    interface UpdateHistoryRecord {
      frequency_compliance: number | null;
      error_reduction: number | null;
      update_duration_ms: number | null;
    }

    // Calculate update frequency compliance
    const expectedUpdates = updateHistory?.filter(
      (uh: UpdateHistoryRecord) => uh.frequency_compliance !== null
    ).length || 0;
    const compliantUpdates = updateHistory?.filter(
      (uh: UpdateHistoryRecord) => uh.frequency_compliance && uh.frequency_compliance >= 95
    ).length || 0;
    const compliance = expectedUpdates > 0
      ? (compliantUpdates / expectedUpdates) * 100
      : 100;

    // Calculate average error reduction
    const errorReductions = updateHistory?.map((uh: UpdateHistoryRecord) => uh.error_reduction || 0) || [];
    const avgErrorReduction = errorReductions.length > 0
      ? errorReductions.reduce((a: number, b: number) => a + b, 0) / errorReductions.length
      : 0;

    // Calculate average update latency
    const latencies = updateHistory?.map((uh: UpdateHistoryRecord) => uh.update_duration_ms || 0) || [];
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length
      : 0;

    // Estimate compression ratio (simplified)
    const compressionRatio = this.estimateCompressionRatio(level);

    return {
      memoryStateId,
      level: level.level,
      updateFrequencyCompliance: compliance,
      compressionRatio,
      queryLatency: 0, // Would be tracked separately
      updateLatency: avgLatency,
      errorReduction: avgErrorReduction,
      lastCalculated: new Date(),
    };
  }

  /**
   * Estimate compression ratio
   * Ratio of context flows to compressed parameters
   */
  private estimateCompressionRatio(level: MemoryLevel): number {
    // Simplified estimation
    // In practice, would compare size of context flows vs parameter size
    const parameterSize = level.parameters.metadata.totalParameters;
    const estimatedContextFlowSize = level.updateCount * 100; // Estimate

    if (estimatedContextFlowSize === 0) return 1.0;
    return parameterSize / estimatedContextFlowSize;
  }

  /**
   * Get memory state ID from database
   */
  private async getMemoryStateId(
    agentName: string,
    level: number
  ): Promise<string> {
    // Use relative path for tsx compatibility (when running scripts from root)
    const { serverSupabase } = await import('../../../api/supabaseServer');

    const { data } = await serverSupabase
      .from('continuum_memory_states')
      .select('id')
      .eq('agent_name', agentName)
      .eq('memory_level', level)
      .single();

    return data?.id || '';
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopUpdateScheduler();
    this.memorySystems.clear();
    this.initialized = false;
    logger.info('MemoryManager disposed');
  }

  /**
   * Get all registered agent names
   */
  public getRegisteredAgents(): string[] {
    return Array.from(this.memorySystems.keys());
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

