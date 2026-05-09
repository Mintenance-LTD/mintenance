import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { AdaptiveUpdateEngine } from './AdaptiveUpdateEngine';
import { buildPredictiveMemoryConfig } from './predictive/memory-config';
import {
  predictDelayRisk,
  predictDisputeRisk,
  predictNoShowRisk,
} from './predictive/risk-predictors';
import {
  learnFromOutcome as runLearnFromOutcome,
  type RiskType,
} from './predictive/outcome-learning';
import { persistPrediction } from './predictive/persist-prediction';
import type { JobForRisk } from './predictive/types';
import type { AgentResult, AgentContext, RiskPrediction } from './types';

/**
 * Predictive agent — predicts job risks and applies preventive actions.
 *
 * Refactored 2026-05-09: memory config, risk predictors, outcome
 * learning, and prediction persistence extracted into `./predictive/*`.
 * This file owns the agent's per-process state (memory init flag,
 * prediction history cache, adaptive engine) and exposes the public
 * API. All real work delegates to the helpers.
 *
 * Implements:
 * - 3-level continuum risk memory (current/recent/long-term)
 * - Continual learning from prediction outcomes
 * - Self-improving risk models
 */
export class PredictiveAgent {
  private static memorySystemInitialized = false;
  private static readonly AGENT_NAME = 'predictive';
  private static predictionHistory: Map<
    string,
    { prediction: RiskPrediction; timestamp: Date }
  > = new Map();
  private static adaptiveEngine: AdaptiveUpdateEngine | null = null;

  private static async initializeAdaptiveEngine(): Promise<void> {
    if (!this.adaptiveEngine) {
      this.adaptiveEngine = new AdaptiveUpdateEngine({
        agentName: this.AGENT_NAME,
      });
    }
  }

  private static async triggerSelfModification(
    accuracyDrop: number
  ): Promise<void> {
    await this.initializeAdaptiveEngine();
    logger.info('PredictiveAgent self-modification triggered', {
      agentName: this.AGENT_NAME,
      accuracyDrop,
    });
    if (this.adaptiveEngine) {
      await this.adaptiveEngine.recordPerformance(1 - accuracyDrop);
    }
  }

  private static async initializeMemorySystem(): Promise<void> {
    if (this.memorySystemInitialized) return;
    await this.initializeAdaptiveEngine();
    try {
      const config = buildPredictiveMemoryConfig(this.AGENT_NAME);
      await memoryManager.getOrCreateMemorySystem(config);
      this.memorySystemInitialized = true;
      logger.info('PredictiveAgent memory system initialized', {
        agentName: this.AGENT_NAME,
        levels: config.levels.length,
      });
    } catch (error) {
      logger.error('Failed to initialize memory system', error, {
        service: 'PredictiveAgent',
      });
    }
  }

  /**
   * Analyze a job for potential risks. Runs the no-show, dispute, and
   * delay predictors in sequence and returns the persisted predictions.
   */
  static async analyzeJob(
    jobId: string,
    _context?: AgentContext
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    try {
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select(
          'id, status, contractor_id, homeowner_id, scheduled_start_date, budget, category, created_at'
        )
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error('Failed to fetch job for risk analysis', {
          service: 'PredictiveAgent',
          jobId,
          error: error?.message,
        });
        return [{ success: false, error: 'Failed to fetch job' }];
      }

      await this.initializeMemorySystem();

      if (job.status === 'assigned' && job.contractor_id) {
        const inputs = await predictNoShowRisk(
          this.AGENT_NAME,
          jobId,
          job.contractor_id
        );
        if (inputs) {
          results.push(
            await persistPrediction(
              this.AGENT_NAME,
              this.predictionHistory,
              jobId,
              'no-show',
              inputs
            )
          );
        }
      }

      const disputeInputs = await predictDisputeRisk(
        this.AGENT_NAME,
        jobId,
        job as JobForRisk
      );
      if (disputeInputs) {
        results.push(
          await persistPrediction(
            this.AGENT_NAME,
            this.predictionHistory,
            jobId,
            'dispute',
            disputeInputs
          )
        );
      }

      if (job.status === 'assigned' || job.status === 'in_progress') {
        const delayInputs = await predictDelayRisk(jobId, job as JobForRisk);
        if (delayInputs) {
          results.push(
            await persistPrediction(
              this.AGENT_NAME,
              this.predictionHistory,
              jobId,
              'delay',
              delayInputs
            )
          );
        }
      }

      return results;
    } catch (error) {
      logger.error('Error analyzing job risks', error, {
        service: 'PredictiveAgent',
        jobId,
      });
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }
  }

  /**
   * Learn from prediction outcome — feed the actual result back into
   * the memory system and trigger self-modification if accuracy drops.
   */
  static async learnFromOutcome(
    predictionId: string,
    outcomeOccurred: boolean,
    riskType: RiskType
  ): Promise<void> {
    await this.initializeMemorySystem();
    const result = await runLearnFromOutcome(
      this.AGENT_NAME,
      predictionId,
      outcomeOccurred,
      riskType
    );
    if (result.shouldSelfModify && result.predictionAccuracy !== null) {
      await this.triggerSelfModification(1 - result.predictionAccuracy);
    }
  }
}
