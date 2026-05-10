import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from '../AgentLogger';
import { AutomationPreferencesService } from '../AutomationPreferencesService';
import { NoShowReminderService } from '../../notifications/NoShowReminderService';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { extractRiskKeys } from './riskKeys';
import type { RiskInputs } from './risk-predictors';
import type { RiskType } from './outcome-learning';
import type { AgentResult, RiskPrediction } from '../types';

/**
 * Persistence + side-effect path for a single risk prediction.
 *
 * Extracted from PredictiveAgent.ts on 2026-05-09 to keep the agent
 * file under the 300-line cap. The `predictionHistory` cache and
 * `agentName` are passed in so the helper has no hidden global state
 * — easier to unit-test and re-use from a future agent that wants
 * the same persist-and-react pipeline.
 */

export async function persistPrediction(
  agentName: string,
  predictionHistory: Map<
    string,
    { prediction: RiskPrediction; timestamp: Date }
  >,
  jobId: string,
  riskType: RiskType,
  inputs: RiskInputs
): Promise<AgentResult> {
  const { probability, severity, reasoning, userId } = inputs;
  try {
    const preventive = await maybeApplyPreventiveAction(
      userId,
      jobId,
      riskType,
      probability,
      severity
    );

    const predictionId = await AgentLogger.logRiskPrediction({
      jobId,
      userId,
      riskType,
      probability,
      severity,
      preventiveAction: preventive.preventiveAction,
      applied: preventive.preventiveAction !== undefined,
    });

    if (predictionId) {
      predictionHistory.set(predictionId, {
        prediction: {
          id: predictionId,
          jobId,
          userId,
          riskType,
          probability,
          severity,
          preventiveAction: preventive.preventiveAction,
          applied: preventive.preventiveAction !== undefined,
        },
        timestamp: new Date(),
      });
    }

    const decision = {
      jobId,
      userId,
      agentName: 'predictive' as const,
      decisionType: 'risk-prediction' as const,
      actionTaken: preventive.actionTaken,
      confidence: probability,
      reasoning: `${riskType} risk: ${reasoning}`,
      metadata: {
        predictionId,
        riskType,
        severity,
        preventiveAction: preventive.preventiveAction,
      },
    };
    await AgentLogger.logDecision(decision);

    try {
      const keys = await extractRiskKeys(jobId, userId, riskType);
      const predictedValues = [
        riskType === 'no-show' ? probability / 100 : 0,
        riskType === 'dispute' ? probability / 100 : 0,
        riskType === 'delay' ? probability / 100 : 0,
        riskType === 'quality' ? probability / 100 : 0,
      ];
      await memoryManager.addContextFlow(agentName, keys, predictedValues, 0);
    } catch (error) {
      logger.warn('Failed to add prediction context flow', {
        service: 'PredictiveAgent',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return {
      success: true,
      decision,
      metadata: {
        predictionId,
        riskType,
        probability,
        severity,
        preventiveAction: preventive.preventiveAction,
      },
    };
  } catch (error) {
    logger.error('Error creating risk prediction', error, {
      service: 'PredictiveAgent',
      jobId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

interface PreventiveResult {
  preventiveAction: string | undefined;
  actionTaken: 'preventive-reminder' | 'milestone-payment' | undefined;
}

async function maybeApplyPreventiveAction(
  userId: string,
  jobId: string,
  riskType: RiskType,
  probability: number,
  severity: RiskInputs['severity']
): Promise<PreventiveResult> {
  const autoApply = await AutomationPreferencesService.isEnabled(
    userId,
    'autoApplyRiskPreventions'
  );

  if (!autoApply || probability < 50) {
    return { preventiveAction: undefined, actionTaken: undefined };
  }

  if (riskType === 'no-show') {
    const job = await serverSupabase
      .from('jobs')
      .select('id, title, scheduled_start_date, contractor_id, homeowner_id')
      .eq('id', jobId)
      .single();

    if (job.data) {
      await NoShowReminderService.sendPreStartReminders();
      return {
        preventiveAction: 'Enhanced reminder sent',
        actionTaken: 'preventive-reminder',
      };
    }
  } else if (riskType === 'dispute' && severity === 'high') {
    return {
      preventiveAction: 'Consider milestone payments',
      actionTaken: undefined,
    };
  }

  return { preventiveAction: undefined, actionTaken: undefined };
}
