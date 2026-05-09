import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import {
  calculateRuleBasedNoShowRisk,
  calculateRuleBasedDisputeRisk,
} from './ruleBasedRisk';
import { extractRiskKeys } from './riskKeys';
import type { JobForRisk } from './types';
import type { AgentResult } from '../types';

/**
 * Risk-prediction helpers extracted from PredictiveAgent.ts on 2026-05-09.
 *
 * These functions query the 3-level continuum memory for the relevant
 * risk type, combine the probabilities with empirically-tuned weights,
 * and fall back to the rule-based estimators when memory data is empty
 * (cold-start case for fresh installs / brand-new contractors).
 *
 * Each predictor returns the inputs needed by the caller's
 * `createRiskPrediction` factory (probability + severity + reasoning).
 * The caller is responsible for actually persisting the prediction.
 */

export interface RiskInputs {
  probability: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  /** id of the user the prediction is "about" (the contractor for
   *  no-show/delay, the homeowner for dispute risk). */
  userId: string;
}

const SEVERITY_THRESHOLDS = {
  high: 60,
  medium: 40,
  low: 20,
} as const;

function severityFor(probability: number): RiskInputs['severity'] {
  if (probability >= SEVERITY_THRESHOLDS.high) return 'high';
  if (probability >= SEVERITY_THRESHOLDS.medium) return 'medium';
  if (probability >= SEVERITY_THRESHOLDS.low) return 'low';
  return 'low';
}

async function queryMemoryProbabilities(
  agentName: string,
  keys: number[],
  riskIndex: 0 | 1 | 2 | 3,
  riskLabel: string
): Promise<number[]> {
  const probabilities: number[] = [];
  for (let level = 0; level < 3; level++) {
    try {
      const queryResult = await memoryManager.query(agentName, keys, level);
      const prob = (queryResult.values[riskIndex] || 0) * 100;
      probabilities.push(prob);
    } catch (error) {
      logger.warn(`Failed to query memory level for ${riskLabel} risk`, {
        service: 'PredictiveAgent',
        level,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      probabilities.push(0);
    }
  }
  return probabilities;
}

function combineProbabilities(memoryProbabilities: number[]): number {
  return (
    memoryProbabilities[0] * 0.3 +
    memoryProbabilities[1] * 0.4 +
    memoryProbabilities[2] * 0.3
  );
}

/**
 * Predict no-show risk based on contractor history.
 * Returns null when probability is 0 (no risk signal).
 */
export async function predictNoShowRisk(
  agentName: string,
  jobId: string,
  contractorId: string
): Promise<RiskInputs | null> {
  try {
    const { data: job } = await serverSupabase
      .from('jobs')
      .select('id, scheduled_start_date, contractor_id')
      .eq('id', jobId)
      .single();

    const keys = await extractRiskKeys(
      jobId,
      contractorId,
      'no-show',
      job as JobForRisk | null
    );
    const memoryProbabilities = await queryMemoryProbabilities(
      agentName,
      keys,
      0,
      'no-show'
    );

    let finalProbability = combineProbabilities(memoryProbabilities);
    let reasoning = 'Memory-based prediction';

    if (memoryProbabilities.every((prob) => prob === 0)) {
      const ruleBased = await calculateRuleBasedNoShowRisk(contractorId);
      finalProbability = ruleBased.probability;
      reasoning = ruleBased.reasoning;
    }

    if (finalProbability > 0) {
      return {
        probability: Math.round(finalProbability),
        severity: severityFor(finalProbability),
        reasoning,
        userId: contractorId,
      };
    }
    return null;
  } catch (error) {
    logger.error('Error predicting no-show risk', error, {
      service: 'PredictiveAgent',
      jobId,
    });
    return null;
  }
}

/**
 * Predict dispute risk based on job characteristics. Threshold of 30
 * prevents low-signal noise from being persisted as a "prediction".
 */
export async function predictDisputeRisk(
  agentName: string,
  jobId: string,
  job: JobForRisk
): Promise<RiskInputs | null> {
  try {
    const keys = await extractRiskKeys(
      jobId,
      job.contractor_id || '',
      'dispute',
      job
    );
    const memoryProbabilities = await queryMemoryProbabilities(
      agentName,
      keys,
      1,
      'dispute'
    );

    let finalProbability = combineProbabilities(memoryProbabilities);
    let factors: string[] = [];

    if (memoryProbabilities.every((prob) => prob === 0)) {
      const ruleBased = await calculateRuleBasedDisputeRisk(job);
      finalProbability = ruleBased.riskScore;
      factors = ruleBased.factors;
    }

    if (finalProbability >= 30) {
      const probability = Math.min(Math.round(finalProbability), 100);
      return {
        probability,
        severity: severityFor(probability),
        reasoning:
          factors.length > 0 ? factors.join('; ') : 'Memory-based prediction',
        userId: job.homeowner_id,
      };
    }
    return null;
  } catch (error) {
    logger.error('Error predicting dispute risk', error, {
      service: 'PredictiveAgent',
      jobId,
    });
    return null;
  }
}

/**
 * Predict delay risk from contractor workload (active job count).
 * Pure rule-based — no memory query, the workload signal is too noisy
 * for the memory tables to add value.
 */
export async function predictDelayRisk(
  jobId: string,
  job: JobForRisk
): Promise<RiskInputs | null> {
  try {
    if (!job.contractor_id) return null;

    const { data: activeJobs, error } = await serverSupabase
      .from('jobs')
      .select('id, status, scheduled_start_date')
      .eq('contractor_id', job.contractor_id)
      .in('status', ['assigned', 'in_progress']);

    if (error) {
      logger.error('Failed to fetch contractor workload', {
        service: 'PredictiveAgent',
        error: error.message,
      });
      return null;
    }

    const activeJobCount = activeJobs?.length || 0;
    let probability = 0;
    let severity: RiskInputs['severity'] = 'low';

    if (activeJobCount > 5) {
      probability = 60;
      severity = 'high';
    } else if (activeJobCount > 3) {
      probability = 40;
      severity = 'medium';
    } else if (activeJobCount > 1) {
      probability = 20;
      severity = 'low';
    }

    if (probability > 0) {
      return {
        probability,
        severity,
        reasoning: `Contractor has ${activeJobCount} active job(s)`,
        userId: job.contractor_id,
      };
    }
    return null;
  } catch (error) {
    logger.error('Error predicting delay risk', error, {
      service: 'PredictiveAgent',
      jobId,
    });
    return null;
  }
}
