import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import type { AgentDecision, RiskPrediction } from './types';

/**
 * Service for logging agent decisions and tracking performance
 */
export class AgentLogger {
  /**
   * Log an agent decision
   */
  static async logDecision(decision: AgentDecision): Promise<string | null> {
    try {
      const { data, error } = await serverSupabase
        .from('agent_decisions')
        .insert({
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
        })
        .select('id')
        .single();

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
   * Log a risk prediction
   */
  static async logRiskPrediction(prediction: RiskPrediction): Promise<string | null> {
    try {
      const { data, error } = await serverSupabase
        .from('risk_predictions')
        .insert({
          job_id: prediction.jobId,
          user_id: prediction.userId || null,
          risk_type: prediction.riskType,
          probability: prediction.probability,
          severity: prediction.severity,
          preventive_action: prediction.preventiveAction || null,
          applied: prediction.applied || false,
          outcome_occurred: prediction.outcomeOccurred ?? null,
          created_at: prediction.createdAt || new Date().toISOString(),
        })
        .select('id')
        .single();

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

