import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AgentLogger } from './AgentLogger';
import type { AgentResult, AgentContext } from './types';

/**
 * Orchestrates multiple agents and coordinates their actions
 */
export class AgentOrchestrator {
  /**
   * Process a job through all relevant agents
   */
  static async processJobLifecycle(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    try {
      // Process through agents in order
      // Note: Individual agents will be implemented in subsequent phases
      // This is the orchestration layer that coordinates them

      logger.info('Processing job through agents', {
        service: 'AgentOrchestrator',
        jobId,
      });

      // Agents will be added here as they are implemented
      // Example structure:
      // const predictiveResult = await PredictiveAgent.analyzeJob(jobId, context);
      // results.push(predictiveResult);

      return results;
    } catch (error) {
      logger.error('Error processing job lifecycle', error, {
        service: 'AgentOrchestrator',
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
   * Execute an agent action with error handling and logging
   */
  static async executeAgentAction(
    agentName: string,
    action: () => Promise<AgentResult>,
    context?: AgentContext
  ): Promise<AgentResult> {
    try {
      const result = await action();

      // Log the decision if it exists
      if (result.decision) {
        await AgentLogger.logDecision(result.decision);
      }

      return result;
    } catch (error) {
      logger.error('Error executing agent action', error, {
        service: 'AgentOrchestrator',
        agentName,
        context,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if automation is enabled for a user
   */
  static async isAutomationEnabled(
    userId: string,
    automationType: string
  ): Promise<boolean> {
    try {
      const { data, error } = await serverSupabase
        .from('automation_preferences')
        .select(automationType)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Default to false if preferences don't exist
        return false;
      }

      return (data as unknown as Record<string, boolean>)[automationType] === true;
    } catch (error) {
      logger.error('Error checking automation preference', error, {
        service: 'AgentOrchestrator',
        userId,
        automationType,
      });
      return false;
    }
  }
}

