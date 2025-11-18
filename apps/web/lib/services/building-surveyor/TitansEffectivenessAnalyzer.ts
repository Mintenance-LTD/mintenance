/**
 * Titans Effectiveness Analyzer
 * 
 * Analyzes the effectiveness of self-modifying Titans in improving assessment accuracy
 * Tracks self-modification events, projection changes, and performance impact
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SelfModificationEvent } from '../ml-engine/memory/types';

export interface TitansEffectivenessMetrics {
  totalModifications: number;
  modificationTypes: {
    frequency_adjustment: number;
    chunk_size_adjustment: number;
    learning_rate_adjustment: number;
    architecture_change: number;
  };
  averagePerformanceImpact: number;
  accuracyImprovement: number;
  projectionChangeMagnitude: number;
  contextMemoryUtilization: number;
}

export interface TitansAnalysisResult {
  agentName: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: TitansEffectivenessMetrics;
  recommendations: string[];
}

/**
 * Analyzes effectiveness of Self-Modifying Titans
 */
export class TitansEffectivenessAnalyzer {
  private static readonly TABLE_NAME = 'titans_states';
  private static readonly MODIFICATIONS_TABLE = 'self_modification_events';

  /**
   * Analyze Titans effectiveness for an agent
   */
  static async analyze(
    agentName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TitansAnalysisResult> {
    try {
      // Get Titans state history
      const stateHistory = await this.getStateHistory(agentName, startDate, endDate);
      
      // Get self-modification events
      const modifications = await this.getModifications(agentName, startDate, endDate);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(stateHistory, modifications);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, modifications);
      
      return {
        agentName,
        period: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days
          end: endDate || new Date(),
        },
        metrics,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to analyze Titans effectiveness', error, {
        service: 'TitansEffectivenessAnalyzer',
        agentName,
      });
      throw error;
    }
  }

  /**
   * Get Titans state history
   */
  private static async getStateHistory(
    agentName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    let query = serverSupabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('agent_name', agentName)
      .order('last_updated', { ascending: true });

    if (startDate) {
      query = query.gte('last_updated', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('last_updated', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch Titans state history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get self-modification events
   */
  private static async getModifications(
    agentName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SelfModificationEvent[]> {
    let query = serverSupabase
      .from(this.MODIFICATIONS_TABLE)
      .select('*')
      .eq('agent_name', agentName)
      .order('timestamp', { ascending: true });

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet, return empty array
      logger.warn('Modifications table not found, returning empty array', {
        service: 'TitansEffectivenessAnalyzer',
      });
      return [];
    }

    return (data || []) as SelfModificationEvent[];
  }

  /**
   * Calculate effectiveness metrics
   */
  private static calculateMetrics(
    stateHistory: any[],
    modifications: SelfModificationEvent[]
  ): TitansEffectivenessMetrics {
    const totalModifications = modifications.length;

    // Count modification types
    const modificationTypes = {
      frequency_adjustment: 0,
      chunk_size_adjustment: 0,
      learning_rate_adjustment: 0,
      architecture_change: 0,
    };

    for (const mod of modifications) {
      if (mod.modificationType in modificationTypes) {
        modificationTypes[mod.modificationType as keyof typeof modificationTypes]++;
      }
    }

    // Calculate average performance impact
    const performanceImpacts = modifications
      .map(m => m.performanceImpact)
      .filter(p => p !== undefined && p !== null);
    const averagePerformanceImpact = performanceImpacts.length > 0
      ? performanceImpacts.reduce((a, b) => a + b, 0) / performanceImpacts.length
      : 0;

    // Calculate projection change magnitude
    let projectionChangeMagnitude = 0;
    if (stateHistory.length >= 2) {
      const firstState = stateHistory[0];
      const lastState = stateHistory[stateHistory.length - 1];
      
      const firstProjections = firstState.projections_jsonb || {};
      const lastProjections = lastState.projections_jsonb || {};
      
      // Calculate L2 norm of difference
      projectionChangeMagnitude = this.calculateProjectionDifference(
        firstProjections,
        lastProjections
      );
    }

    // Calculate context memory utilization
    const contextMemoryUtilization = stateHistory.length > 0
      ? stateHistory.reduce((sum, state) => {
          const memory = state.context_memory_jsonb || [];
          return sum + (Array.isArray(memory) ? memory.length : 0);
        }, 0) / stateHistory.length
      : 0;

    // Accuracy improvement (would need to compare with baseline)
    // For now, use performance impact as proxy
    const accuracyImprovement = averagePerformanceImpact;

    return {
      totalModifications,
      modificationTypes,
      averagePerformanceImpact,
      accuracyImprovement,
      projectionChangeMagnitude,
      contextMemoryUtilization,
    };
  }

  /**
   * Calculate L2 norm of projection matrix differences
   */
  private static calculateProjectionDifference(
    projections1: any,
    projections2: any
  ): number {
    let totalDiff = 0;
    let totalElements = 0;

    const matrices = ['W_k', 'W_v', 'W_q', 'W_o'] as const;
    
    for (const matrixName of matrices) {
      const matrix1 = projections1[matrixName] as number[][] | undefined;
      const matrix2 = projections2[matrixName] as number[][] | undefined;
      
      if (!matrix1 || !matrix2) continue;
      
      for (let i = 0; i < Math.min(matrix1.length, matrix2.length); i++) {
        for (let j = 0; j < Math.min(matrix1[i]?.length || 0, matrix2[i]?.length || 0); j++) {
          const diff = (matrix1[i]?.[j] || 0) - (matrix2[i]?.[j] || 0);
          totalDiff += diff * diff;
          totalElements++;
        }
      }
    }

    return totalElements > 0 ? Math.sqrt(totalDiff / totalElements) : 0;
  }

  /**
   * Generate recommendations based on analysis
   */
  private static generateRecommendations(
    metrics: TitansEffectivenessMetrics,
    modifications: SelfModificationEvent[]
  ): string[] {
    const recommendations: string[] = [];

    // Check modification frequency
    if (metrics.totalModifications === 0) {
      recommendations.push(
        'No self-modifications detected. Consider enabling Titans or checking if surprise signals are being generated.'
      );
    } else if (metrics.totalModifications > 100) {
      recommendations.push(
        'High modification frequency detected. Consider increasing learning rate stability or adding regularization.'
      );
    }

    // Check performance impact
    if (metrics.averagePerformanceImpact < 0) {
      recommendations.push(
        'Negative performance impact detected. Review modification logic and consider reverting recent changes.'
      );
    } else if (metrics.averagePerformanceImpact > 0.1) {
      recommendations.push(
        'Strong positive performance impact. Consider increasing modification frequency or learning rate.'
      );
    }

    // Check projection changes
    if (metrics.projectionChangeMagnitude > 1.0) {
      recommendations.push(
        'Large projection changes detected. Consider adding gradient clipping or reducing learning rate.'
      );
    } else if (metrics.projectionChangeMagnitude < 0.01) {
      recommendations.push(
        'Minimal projection changes detected. Consider increasing learning rate or surprise signal sensitivity.'
      );
    }

    // Check context memory utilization
    if (metrics.contextMemoryUtilization < 10) {
      recommendations.push(
        'Low context memory utilization. Consider increasing memory size or reducing update frequency.'
      );
    } else if (metrics.contextMemoryUtilization > 90) {
      recommendations.push(
        'High context memory utilization. Consider increasing memory size or implementing memory compression.'
      );
    }

    // Check modification type distribution
    const totalTypeMods = Object.values(metrics.modificationTypes).reduce((a, b) => a + b, 0);
    if (totalTypeMods > 0) {
      const frequencyRatio = metrics.modificationTypes.frequency_adjustment / totalTypeMods;
      if (frequencyRatio > 0.5) {
        recommendations.push(
          'Frequency adjustments dominate modifications. Consider balancing modification types or reviewing frequency update logic.'
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Titans system is operating within expected parameters.');
    }

    return recommendations;
  }

  /**
   * Compare Titans vs non-Titans performance
   */
  static async compareWithBaseline(
    agentName: string,
    period: { start: Date; end: Date }
  ): Promise<{
    withTitans: TitansEffectivenessMetrics;
    withoutTitans: { averageAccuracy: number; totalAssessments: number };
    improvement: number;
  }> {
    // This would compare assessments with Titans enabled vs disabled
    // For now, return placeholder structure
    const withTitans = await this.analyze(agentName, period.start, period.end);
    
    return {
      withTitans: withTitans.metrics,
      withoutTitans: {
        averageAccuracy: 0.75, // Would be fetched from baseline data
        totalAssessments: 0,
      },
      improvement: withTitans.metrics.accuracyImprovement,
    };
  }
}

