/**
 * Shadow Mode Logger for Building Surveyor Service
 * Logs decisions for shadow mode learning
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * Log decision for shadow mode learning
 */
export async function logDecisionForShadowMode(params: {
  assessmentId: string;
  decision: 'automate' | 'escalate';
  contextVector: number[];
  cpResult: { stratum: string; predictionSet: string[] };
  bayesianFusionResult: { mean: number; variance: number };
}): Promise<void> {
  try {
    // Check if ab_decisions table exists
    const { error } = await serverSupabase
      .from('ab_decisions')
      .insert({
        assessment_id: params.assessmentId,
        decision: params.decision,
        context_features: {
          fusion_confidence: params.bayesianFusionResult.mean,
          fusion_variance: params.bayesianFusionResult.variance,
          cp_set_size: params.cpResult.predictionSet.length,
          cp_stratum: params.cpResult.stratum,
        },
        created_at: new Date().toISOString(),
      });

    if (error) {
      logger.debug('Shadow mode logging failed (table may not exist)', {
        service: 'shadow-mode-logger',
        error: error.message,
      });
    }
  } catch (error) {
    // Silently fail - shadow mode logging is optional
    logger.debug('Shadow mode logging error', {
      service: 'shadow-mode-logger',
      error,
    });
  }
}

