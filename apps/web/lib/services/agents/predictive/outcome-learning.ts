import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from '../AgentLogger';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { extractRiskKeys } from './riskKeys';

/**
 * Outcome learning helpers extracted from PredictiveAgent.ts on
 * 2026-05-09. Feeds the actual outcome of a prediction back into the
 * 3-level continuum memory as a "surprise signal" (|actual - predicted|),
 * and computes whether the prediction was directionally correct so the
 * caller can decide whether to fire a self-modification cycle.
 */

export type RiskType = 'no-show' | 'dispute' | 'delay' | 'quality';

export interface LearnOutcomeResult {
  /** Directional accuracy (1.0 = correct, 0.0 = wrong, null = no data). */
  predictionAccuracy: number | null;
  /** True when the caller should trigger a self-modification cycle. */
  shouldSelfModify: boolean;
}

const ACCURACY_SELF_MOD_THRESHOLD = 0.7;

function buildSurpriseValues(
  riskType: RiskType,
  surpriseSignal: number
): number[] {
  return [
    riskType === 'no-show' ? surpriseSignal : 0,
    riskType === 'dispute' ? surpriseSignal : 0,
    riskType === 'delay' ? surpriseSignal : 0,
    riskType === 'quality' ? surpriseSignal : 0,
  ];
}

/**
 * Learn from a prediction outcome.
 *
 * - Looks up the prior risk_predictions row by id.
 * - Adds the surprise signal to all 3 memory levels for the original
 *   feature keys.
 * - Updates risk_predictions.outcome_occurred via AgentLogger.
 * - Returns predictionAccuracy + shouldSelfModify so the caller can
 *   decide whether to recordPerformance() / re-tune the agent.
 */
export async function learnFromOutcome(
  agentName: string,
  predictionId: string,
  outcomeOccurred: boolean,
  riskType: RiskType
): Promise<LearnOutcomeResult> {
  try {
    const { data: prediction } = await serverSupabase
      .from('risk_predictions')
      .select('*')
      .eq('id', predictionId)
      .single();

    if (!prediction) {
      logger.warn('Prediction not found for learning', {
        service: 'PredictiveAgent',
        predictionId,
      });
      return { predictionAccuracy: null, shouldSelfModify: false };
    }

    const keys = await extractRiskKeys(
      prediction.job_id,
      prediction.user_id || '',
      riskType
    );

    const predictedProb = prediction.probability / 100;
    const actualOutcome = outcomeOccurred ? 1.0 : 0.0;
    const surpriseSignal = Math.abs(actualOutcome - predictedProb);
    const values = buildSurpriseValues(riskType, surpriseSignal);

    for (let level = 0; level < 3; level++) {
      try {
        await memoryManager.addContextFlow(agentName, keys, values, level);
      } catch (error) {
        logger.warn('Failed to add context flow for outcome learning', {
          service: 'PredictiveAgent',
          level,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await AgentLogger.updateRiskOutcome(predictionId, outcomeOccurred);

    logger.info('Learned from prediction outcome', {
      service: 'PredictiveAgent',
      predictionId,
      riskType,
      outcomeOccurred,
      surpriseSignal,
    });

    const predictionAccuracy =
      outcomeOccurred === predictedProb > 0.5 ? 1.0 : 0.0;

    return {
      predictionAccuracy,
      shouldSelfModify: predictionAccuracy < ACCURACY_SELF_MOD_THRESHOLD,
    };
  } catch (error) {
    logger.error('Error learning from outcome', error, {
      service: 'PredictiveAgent',
      predictionId,
    });
    return { predictionAccuracy: null, shouldSelfModify: false };
  }
}
