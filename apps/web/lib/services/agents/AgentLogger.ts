import { createHash } from 'crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { AgentDecision, RiskPrediction } from './types';

/**
 * Sprint 7 (2.3): build a deterministic UUIDv5-style key for cron-retry
 * dedup. Callers pass a semantic tuple like (agentName, contextId,
 * dayBucket) and this returns a stable UUID that's safe to store in
 * the idempotency_key column (partial unique index on non-null keys).
 *
 * Cron authors: prefer hashing (agent, jobId, ISO date) so the same
 * logical decision on the same day collapses even if the cron ticked
 * twice. For per-hour dedup, include the hour.
 */
export function buildIdempotencyKey(...parts: (string | number)[]): string {
  const joined = parts.map((p) => String(p)).join('|');
  const hex = createHash('sha256').update(joined).digest('hex');
  // Shape as UUIDv4-style (version + variant nibbles) so Postgres accepts it.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) +
      hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Service for logging agent decisions and tracking performance
 */
export class AgentLogger {
  /**
   * Log an agent decision. If `decision.idempotencyKey` is provided,
   * uses upsert with onConflict:idempotency_key so a retried cron tick
   * will not create a duplicate row; the existing row's id is returned.
   */
  static async logDecision(decision: AgentDecision): Promise<string | null> {
    try {
      const payload = {
        job_id: decision.jobId || null,
        user_id: decision.userId || null,
        agent_name: decision.agentName,
        decision_type: decision.decisionType,
        action_taken: decision.actionTaken || null,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        metadata: decision.metadata || {},
        user_feedback: decision.userFeedback || null,
        outcome_success: decision.outcomeSuccess ?? null,
        created_at: decision.createdAt || new Date().toISOString(),
        idempotency_key: decision.idempotencyKey ?? null,
      };

      const query = decision.idempotencyKey
        ? serverSupabase
            .from('agent_decisions')
            .upsert(payload, {
              onConflict: 'idempotency_key',
              ignoreDuplicates: false,
            })
            .select('id')
            .single()
        : serverSupabase
            .from('agent_decisions')
            .insert(payload)
            .select('id')
            .single();

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to log agent decision', {
          service: 'AgentLogger',
          error: error.message,
          decision,
        });
        return null;
      }

      return data?.id || null;
    } catch (error) {
      logger.error('Error logging agent decision', error, {
        service: 'AgentLogger',
        decision,
      });
      return null;
    }
  }

  /**
   * Log a risk prediction. Honors `prediction.idempotencyKey` in the
   * same way as logDecision — idempotent upsert when provided.
   */
  static async logRiskPrediction(
    prediction: RiskPrediction
  ): Promise<string | null> {
    try {
      const payload = {
        job_id: prediction.jobId,
        user_id: prediction.userId || null,
        risk_type: prediction.riskType,
        probability: prediction.probability,
        severity: prediction.severity,
        preventive_action: prediction.preventiveAction || null,
        applied: prediction.applied || false,
        outcome_occurred: prediction.outcomeOccurred ?? null,
        created_at: prediction.createdAt || new Date().toISOString(),
        idempotency_key: prediction.idempotencyKey ?? null,
      };

      const query = prediction.idempotencyKey
        ? serverSupabase
            .from('risk_predictions')
            .upsert(payload, {
              onConflict: 'idempotency_key',
              ignoreDuplicates: false,
            })
            .select('id')
            .single()
        : serverSupabase
            .from('risk_predictions')
            .insert(payload)
            .select('id')
            .single();

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to log risk prediction', {
          service: 'AgentLogger',
          error: error.message,
          prediction,
        });
        return null;
      }

      return data?.id || null;
    } catch (error) {
      logger.error('Error logging risk prediction', error, {
        service: 'AgentLogger',
        prediction,
      });
      return null;
    }
  }

  /**
   * Update decision outcome
   */
  static async updateDecisionOutcome(
    decisionId: string,
    outcomeSuccess: boolean
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('agent_decisions')
        .update({
          outcome_success: outcomeSuccess,
        })
        .eq('id', decisionId);

      if (error) {
        logger.error('Failed to update decision outcome', {
          service: 'AgentLogger',
          error: error.message,
          decisionId,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating decision outcome', error, {
        service: 'AgentLogger',
        decisionId,
      });
      return false;
    }
  }

  /**
   * Update risk prediction outcome
   */
  static async updateRiskOutcome(
    predictionId: string,
    outcomeOccurred: boolean
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('risk_predictions')
        .update({
          outcome_occurred: outcomeOccurred,
        })
        .eq('id', predictionId);

      if (error) {
        logger.error('Failed to update risk outcome', {
          service: 'AgentLogger',
          error: error.message,
          predictionId,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating risk outcome', error, {
        service: 'AgentLogger',
        predictionId,
      });
      return false;
    }
  }

  /**
   * Get agent performance metrics
   */
  static async getAgentPerformance(
    agentName: string,
    days: number = 30
  ): Promise<{
    totalDecisions: number;
    successRate: number;
    averageConfidence: number;
  } | null> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await serverSupabase
        .from('agent_decisions')
        .select('confidence, outcome_success')
        .eq('agent_name', agentName)
        .gte('created_at', cutoffDate.toISOString())
        .not('outcome_success', 'is', null);

      if (error) {
        logger.error('Failed to get agent performance', {
          service: 'AgentLogger',
          error: error.message,
          agentName,
        });
        return null;
      }

      if (!data || data.length === 0) {
        return {
          totalDecisions: 0,
          successRate: 0,
          averageConfidence: 0,
        };
      }

      const successful = data.filter((d) => d.outcome_success === true).length;
      const successRate = (successful / data.length) * 100;
      const averageConfidence =
        data.reduce((sum, d) => sum + (d.confidence || 0), 0) / data.length;

      return {
        totalDecisions: data.length,
        successRate: Math.round(successRate * 100) / 100,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting agent performance', error, {
        service: 'AgentLogger',
        agentName,
      });
      return null;
    }
  }
}
