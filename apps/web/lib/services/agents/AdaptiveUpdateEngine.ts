/**
 * Adaptive Update Engine
 * 
 * Learns optimal update frequencies based on performance
 * Adjusts chunk sizes (C^(ℓ)) dynamically
 * Monitors prediction accuracy and adapts memory update rules
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import type { MemoryLevel } from '../ml-engine/memory/types';

/**
 * Adaptive update configuration
 */
export interface AdaptiveUpdateConfig {
  agentName: string;
  minChunkSize?: number; // Minimum chunk size (default: 1)
  maxChunkSize?: number; // Maximum chunk size (default: 10000)
  adaptationRate?: number; // Rate of adaptation (default: 0.1)
  performanceWindow?: number; // Performance window size (default: 50)
}

/**
 * Performance analysis result
 */
export interface PerformanceAnalysis {
  averageAccuracy: number;
  accuracyTrend: 'improving' | 'stable' | 'degrading';
  optimalFrequency: number;
  recommendedChunkSize: number;
  confidence: number;
}

/**
 * Adaptive Update Engine
 * 
 * Learns optimal update frequencies and chunk sizes based on performance
 */
export class AdaptiveUpdateEngine {
  private config: AdaptiveUpdateConfig;
  private performanceHistory: Array<{ accuracy: number; timestamp: Date }> = [];

  constructor(config: AdaptiveUpdateConfig) {
    this.config = {
      minChunkSize: 1,
      maxChunkSize: 10000,
      adaptationRate: 0.1,
      performanceWindow: 50,
      ...config,
    };
  }

  /**
   * Record performance metric
   */
  async recordPerformance(accuracy: number): Promise<void> {
    this.performanceHistory.push({
      accuracy,
      timestamp: new Date(),
    });

    // Keep only recent history
    const windowSize = this.config.performanceWindow || 50;
    if (this.performanceHistory.length > windowSize) {
      this.performanceHistory.shift();
    }

    // Analyze and adapt if needed
    if (this.performanceHistory.length >= 10) {
      await this.analyzeAndAdapt();
    }
  }

  /**
   * Analyze performance and adapt update frequencies
   */
  private async analyzeAndAdapt(): Promise<void> {
    try {
      const analysis = this.analyzePerformance();
      
      if (analysis.confidence > 0.7) {
        // High confidence, apply adaptation
        await this.adaptMemoryLevels(analysis);
      }
    } catch (error) {
      logger.error('Error in adaptive update', error, {
        service: 'AdaptiveUpdateEngine',
        agentName: this.config.agentName,
      });
    }
  }

  /**
   * Analyze performance to determine optimal update frequency
   */
  private analyzePerformance(): PerformanceAnalysis {
    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-20, -10);

    if (older.length === 0) {
      return {
        averageAccuracy: recent.reduce((sum, p) => sum + p.accuracy, 0) / recent.length,
        accuracyTrend: 'stable',
        optimalFrequency: 1,
        recommendedChunkSize: 10,
        confidence: 0.5,
      };
    }

    const recentAvg = recent.reduce((sum, p) => sum + p.accuracy, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.accuracy, 0) / older.length;

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentAvg > olderAvg + 0.05) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 0.05) {
      trend = 'degrading';
    }

    // Determine optimal frequency based on trend
    let optimalFrequency = 1;
    let recommendedChunkSize = 10;

    if (trend === 'degrading') {
      // Performance degrading - increase update frequency (smaller chunk size)
      optimalFrequency = 1;
      recommendedChunkSize = Math.max(
        this.config.minChunkSize || 1,
        Math.floor(10 * (1 - this.config.adaptationRate || 0.1))
      );
    } else if (trend === 'improving') {
      // Performance improving - can decrease update frequency (larger chunk size)
      optimalFrequency = 16;
      recommendedChunkSize = Math.min(
        this.config.maxChunkSize || 10000,
        Math.floor(10 * (1 + this.config.adaptationRate || 0.1))
      );
    }

    const confidence = Math.min(1, this.performanceHistory.length / 20);

    return {
      averageAccuracy: recentAvg,
      accuracyTrend: trend,
      optimalFrequency,
      recommendedChunkSize,
      confidence,
    };
  }

  /**
   * Adapt memory levels based on performance analysis
   */
  private async adaptMemoryLevels(analysis: PerformanceAnalysis): Promise<void> {
    try {
      const levels = memoryManager.getMemoryLevels(this.config.agentName);

      for (const level of levels) {
        // Adjust chunk size based on analysis
        const adaptation = this.config.adaptationRate || 0.1;
        const currentChunkSize = level.chunkSize;
        
        let newChunkSize = currentChunkSize;
        if (analysis.accuracyTrend === 'degrading') {
          // Decrease chunk size (update more frequently)
          newChunkSize = Math.max(
            this.config.minChunkSize || 1,
            Math.floor(currentChunkSize * (1 - adaptation))
          );
        } else if (analysis.accuracyTrend === 'improving') {
          // Increase chunk size (update less frequently)
          newChunkSize = Math.min(
            this.config.maxChunkSize || 10000,
            Math.floor(currentChunkSize * (1 + adaptation))
          );
        }

        if (newChunkSize !== currentChunkSize) {
          // Update chunk size in database
          await this.updateChunkSize(level.level, newChunkSize);

          logger.info('Adapted memory level chunk size', {
            service: 'AdaptiveUpdateEngine',
            agentName: this.config.agentName,
            level: level.level,
            oldChunkSize: currentChunkSize,
            newChunkSize,
            reason: analysis.accuracyTrend,
          });
        }
      }
    } catch (error) {
      logger.error('Error adapting memory levels', error, {
        service: 'AdaptiveUpdateEngine',
        agentName: this.config.agentName,
      });
    }
  }

  /**
   * Update chunk size in database
   */
  private async updateChunkSize(level: number, newChunkSize: number): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('continuum_memory_states')
        .update({
          chunk_size: newChunkSize,
          updated_at: new Date().toISOString(),
        })
        .eq('agent_name', this.config.agentName)
        .eq('memory_level', level);

      if (error) {
        logger.error('Failed to update chunk size', {
          service: 'AdaptiveUpdateEngine',
          error: error.message,
        });
      }
    } catch (error) {
      logger.error('Error updating chunk size', error, {
        service: 'AdaptiveUpdateEngine',
      });
    }
  }

  /**
   * Get performance analysis
   */
  getPerformanceAnalysis(): PerformanceAnalysis {
    return this.analyzePerformance();
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.performanceHistory = [];
  }
}

