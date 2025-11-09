/**
 * Memory Analytics Service
 * 
 * Tracks memory performance, update frequency compliance, and compression effectiveness
 * Provides analytics and reporting for nested learning memory systems
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { memoryManager } from './MemoryManager';
import type { MemoryPerformanceMetrics } from './types';

/**
 * Analytics configuration
 */
export interface MemoryAnalyticsConfig {
  agentName?: string; // Optional: filter by agent
  lookbackDays?: number; // Days to look back (default: 7)
}

/**
 * Memory Analytics Service
 * 
 * Provides analytics for memory performance and effectiveness
 */
export class MemoryAnalytics {
  /**
   * Get performance metrics for memory system
   */
  static async getPerformanceMetrics(
    config: MemoryAnalyticsConfig = {}
  ): Promise<MemoryPerformanceMetrics[]> {
    try {
      const { agentName, lookbackDays = 7 } = config;

      // Get memory states
      let query = serverSupabase
        .from('continuum_memory_states')
        .select('id, agent_name, memory_level');

      if (agentName) {
        query = query.eq('agent_name', agentName);
      }

      const { data: memoryStates, error } = await query;

      if (error) {
        logger.error('Failed to fetch memory states for analytics', {
          service: 'MemoryAnalytics',
          error: error.message,
        });
        return [];
      }

      if (!memoryStates || memoryStates.length === 0) {
        return [];
      }

      // Get performance metrics for each memory state
      const metrics: MemoryPerformanceMetrics[] = [];

      for (const state of memoryStates) {
        const stateMetrics = await this.calculateMetricsForState(
          state.id,
          state.agent_name,
          state.memory_level,
          lookbackDays
        );
        if (stateMetrics) {
          metrics.push(stateMetrics);
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics', error, {
        service: 'MemoryAnalytics',
      });
      return [];
    }
  }

  /**
   * Calculate metrics for a specific memory state
   */
  private static async calculateMetricsForState(
    memoryStateId: string,
    agentName: string,
    level: number,
    lookbackDays: number
  ): Promise<MemoryPerformanceMetrics | null> {
    try {
      // Get update history
      const { data: updateHistory } = await serverSupabase
        .from('memory_update_history')
        .select('*')
        .eq('memory_state_id', memoryStateId)
        .gte('created_at', new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!updateHistory || updateHistory.length === 0) {
        return null;
      }

      // Calculate update frequency compliance
      const compliantUpdates = updateHistory.filter(
        (uh: any) => uh.frequency_compliance && uh.frequency_compliance >= 95
      ).length;
      const compliance = updateHistory.length > 0
        ? (compliantUpdates / updateHistory.length) * 100
        : 100;

      // Calculate average error reduction
      const errorReductions = updateHistory
        .map((uh: any) => uh.error_reduction || 0)
        .filter((er: number) => er > 0);
      const avgErrorReduction = errorReductions.length > 0
        ? errorReductions.reduce((a: number, b: number) => a + b, 0) / errorReductions.length
        : 0;

      // Calculate average update latency
      const latencies = updateHistory
        .map((uh: any) => uh.update_duration_ms || 0)
        .filter((l: number) => l > 0);
      const avgLatency = latencies.length > 0
        ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length
        : 0;

      // Get memory state for compression ratio calculation
      const { data: memoryState } = await serverSupabase
        .from('continuum_memory_states')
        .select('parameters_jsonb, update_count')
        .eq('id', memoryStateId)
        .single();

      // Estimate compression ratio
      const compressionRatio = this.estimateCompressionRatio(
        memoryState?.parameters_jsonb,
        memoryState?.update_count || 0
      );

      // Calculate efficiency score
      const efficiencyScore = this.calculateEfficiencyScore(
        compliance,
        compressionRatio,
        avgLatency
      );

      return {
        memoryStateId,
        level,
        updateFrequencyCompliance: compliance,
        compressionRatio,
        queryLatency: 0, // Would be tracked separately
        updateLatency: avgLatency,
        errorReduction: avgErrorReduction,
        lastCalculated: new Date(),
      };
    } catch (error) {
      logger.error('Error calculating metrics for memory state', error, {
        service: 'MemoryAnalytics',
        memoryStateId,
      });
      return null;
    }
  }

  /**
   * Estimate compression ratio
   */
  private static estimateCompressionRatio(
    parameters: any,
    updateCount: number
  ): number {
    if (!parameters || updateCount === 0) {
      return 1.0;
    }

    // Estimate parameter size (simplified)
    const parameterSize = JSON.stringify(parameters).length;
    const estimatedContextFlowSize = updateCount * 100; // Estimate per flow

    if (estimatedContextFlowSize === 0) return 1.0;
    return parameterSize / estimatedContextFlowSize;
  }

  /**
   * Calculate efficiency score
   */
  private static calculateEfficiencyScore(
    compliance: number,
    compressionRatio: number,
    latency: number
  ): number {
    // Weighted combination: Compliance 40%, Compression 30%, Latency 30%
    const complianceScore = compliance * 0.4;
    const compressionScore = Math.min(compressionRatio, 10.0) / 10.0 * 100 * 0.3;
    const latencyScore = Math.max(0, 100 - latency / 10) * 0.3;

    return Math.min(100, Math.max(0, complianceScore + compressionScore + latencyScore));
  }

  /**
   * Get update frequency compliance report
   */
  static async getComplianceReport(
    agentName: string,
    lookbackDays: number = 7
  ): Promise<{
    agentName: string;
    levels: Array<{
      level: number;
      compliance: number;
      expectedUpdates: number;
      actualUpdates: number;
    }>;
    overallCompliance: number;
  }> {
    try {
      const levels = memoryManager.getMemoryLevels(agentName);
      const levelReports = [];

      for (const level of levels) {
        const { data: updateHistory } = await serverSupabase
          .from('memory_update_history')
          .select('frequency_compliance, update_count')
          .eq('memory_state_id', await this.getMemoryStateId(agentName, level.level))
          .gte('created_at', new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString());

        const compliant = updateHistory?.filter(
          (uh: any) => uh.frequency_compliance && uh.frequency_compliance >= 95
        ).length || 0;
        const total = updateHistory?.length || 0;
        const compliance = total > 0 ? (compliant / total) * 100 : 100;

        levelReports.push({
          level: level.level,
          compliance,
          expectedUpdates: total,
          actualUpdates: compliant,
        });
      }

      const overallCompliance = levelReports.length > 0
        ? levelReports.reduce((sum, r) => sum + r.compliance, 0) / levelReports.length
        : 100;

      return {
        agentName,
        levels: levelReports,
        overallCompliance,
      };
    } catch (error) {
      logger.error('Error getting compliance report', error, {
        service: 'MemoryAnalytics',
        agentName,
      });
      return {
        agentName,
        levels: [],
        overallCompliance: 0,
      };
    }
  }

  /**
   * Get memory state ID
   */
  private static async getMemoryStateId(
    agentName: string,
    level: number
  ): Promise<string> {
    const { data } = await serverSupabase
      .from('continuum_memory_states')
      .select('id')
      .eq('agent_name', agentName)
      .eq('memory_level', level)
      .single();

    return data?.id || '';
  }

  /**
   * Store performance metrics in database
   */
  static async storePerformanceMetrics(
    metrics: MemoryPerformanceMetrics
  ): Promise<void> {
    try {
      const efficiencyScore = this.calculateEfficiencyScore(
        metrics.updateFrequencyCompliance,
        metrics.compressionRatio,
        metrics.updateLatency
      );

      await serverSupabase
        .from('memory_performance_metrics')
        .insert({
          memory_state_id: metrics.memoryStateId,
          update_frequency_compliance: metrics.updateFrequencyCompliance,
          compression_ratio: metrics.compressionRatio,
          query_latency_ms: metrics.queryLatency,
          update_latency_ms: metrics.updateLatency,
          error_reduction: metrics.errorReduction,
          efficiency_score: efficiencyScore,
          calculated_at: metrics.lastCalculated.toISOString(),
        });
    } catch (error) {
      logger.error('Error storing performance metrics', error, {
        service: 'MemoryAnalytics',
      });
    }
  }
}

