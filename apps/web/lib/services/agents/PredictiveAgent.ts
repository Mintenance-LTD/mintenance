import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { AutomationPreferencesService } from './AutomationPreferencesService';
import { NoShowReminderService } from '../notifications/NoShowReminderService';
import { DisputeWorkflowService } from '../disputes/DisputeWorkflowService';
import type { AgentResult, AgentContext, RiskPrediction } from './types';

/**
 * Predictive agent that predicts job risks and applies preventive actions
 */
export class PredictiveAgent {
  /**
   * Analyze a job for potential risks
   */
  static async analyzeJob(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    try {
      // Get job details
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
        return [
          {
            success: false,
            error: 'Failed to fetch job',
          },
        ];
      }

      // Predict no-show risk if job is assigned
      if (job.status === 'assigned' && job.contractor_id) {
        const noShowRisk = await this.predictNoShowRisk(jobId, job.contractor_id);
        if (noShowRisk) {
          results.push(noShowRisk);
        }
      }

      // Predict dispute risk
      const disputeRisk = await this.predictDisputeRisk(jobId, job);
      if (disputeRisk) {
        results.push(disputeRisk);
      }

      // Predict delay risk
      if (job.status === 'assigned' || job.status === 'in_progress') {
        const delayRisk = await this.predictDelayRisk(jobId, job);
        if (delayRisk) {
          results.push(delayRisk);
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
   * Predict no-show risk based on contractor history
   */
  private static async predictNoShowRisk(
    jobId: string,
    contractorId: string
  ): Promise<AgentResult | null> {
    try {
      // Get contractor's no-show history
      const { data: contractorJobs, error } = await serverSupabase
        .from('jobs')
        .select('id, status, scheduled_start_date')
        .eq('contractor_id', contractorId)
        .in('status', ['assigned', 'in_progress', 'completed', 'cancelled']);

      if (error) {
        logger.error('Failed to fetch contractor history', {
          service: 'PredictiveAgent',
          error: error.message,
        });
        return null;
      }

      // Calculate no-show rate
      const totalJobs = contractorJobs?.length || 0;
      if (totalJobs === 0) {
        // New contractor - moderate risk
        const probability = 40;
        return await this.createRiskPrediction(
          jobId,
          contractorId,
          'no-show',
          probability,
          'medium',
          'New contractor - no history available',
          jobId
        );
      }

      // Check for past no-shows (jobs that were cancelled or never started)
      const pastNoShows = contractorJobs?.filter((job) => {
        if (job.status === 'cancelled' && job.scheduled_start_date) {
          const scheduledDate = new Date(job.scheduled_start_date);
          const now = new Date();
          // Cancelled within 24 hours of scheduled start
          return scheduledDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
        }
        return false;
      }).length || 0;

      const noShowRate = (pastNoShows / totalJobs) * 100;
      let probability = 0;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (noShowRate > 30) {
        probability = 75;
        severity = 'high';
      } else if (noShowRate > 15) {
        probability = 50;
        severity = 'medium';
      } else if (noShowRate > 5) {
        probability = 30;
        severity = 'low';
      }

      if (probability > 0) {
        return await this.createRiskPrediction(
          jobId,
          contractorId,
          'no-show',
          probability,
          severity,
          `Contractor has ${noShowRate.toFixed(1)}% no-show rate`,
          jobId
        );
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
   * Predict dispute risk based on job characteristics
   */
  private static async predictDisputeRisk(
    jobId: string,
    job: any
  ): Promise<AgentResult | null> {
    try {
      let riskScore = 0;
      const factors: string[] = [];

      // High-value jobs have higher dispute risk
      if (job.budget && job.budget > 1000) {
        riskScore += 20;
        factors.push('High-value job (>£1000)');
      }

      // Get contractor's dispute history
      if (job.contractor_id) {
        const { data: contractorJobs, error } = await serverSupabase
          .from('jobs')
          .select('id, status')
          .eq('contractor_id', job.contractor_id)
          .eq('status', 'completed');

        if (!error && contractorJobs) {
          // Check for disputes (this would need to query escrow_payments or disputes table)
          // For now, we'll use a simple heuristic
          const totalCompleted = contractorJobs.length;
          if (totalCompleted > 0) {
            // Assume disputes are rare, but check if contractor has many completed jobs
            // More experience = lower risk (generally)
            if (totalCompleted < 5) {
              riskScore += 15;
              factors.push('Inexperienced contractor (<5 completed jobs)');
            }
          }
        }
      }

      // New homeowners have slightly higher risk
      const { data: homeownerJobs } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('homeowner_id', job.homeowner_id)
        .eq('status', 'completed');

      const homeownerExperience = homeownerJobs?.length || 0;
      if (homeownerExperience === 0) {
        riskScore += 10;
        factors.push('New homeowner (no completed jobs)');
      }

      if (riskScore >= 30) {
        const severity: 'low' | 'medium' | 'high' | 'critical' =
          riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

        return await this.createRiskPrediction(
          jobId,
          job.homeowner_id,
          'dispute',
          Math.min(riskScore, 100),
          severity,
          factors.join('; '),
          jobId
        );
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
   * Predict delay risk based on contractor workload
   */
  private static async predictDelayRisk(
    jobId: string,
    job: any
  ): Promise<AgentResult | null> {
    try {
      if (!job.contractor_id) {
        return null;
      }

      // Get contractor's active jobs
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
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // More active jobs = higher delay risk
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
        return await this.createRiskPrediction(
          jobId,
          job.contractor_id,
          'delay',
          probability,
          severity,
          `Contractor has ${activeJobCount} active job(s)`,
          jobId
        );
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

  /**
   * Create a risk prediction and apply preventive actions if enabled
   */
  private static async createRiskPrediction(
    jobId: string,
    userId: string,
    riskType: 'no-show' | 'dispute' | 'delay' | 'quality',
    probability: number,
    severity: 'low' | 'medium' | 'high' | 'critical',
    reasoning: string,
    contextJobId: string
  ): Promise<AgentResult> {
    try {
      // Check if user wants risk prevention actions
      const autoApply = await AutomationPreferencesService.isEnabled(
        userId,
        'autoApplyRiskPreventions'
      );

      let preventiveAction: string | undefined;
      let actionTaken: 'preventive-reminder' | 'milestone-payment' | undefined;

      if (autoApply && probability >= 50) {
        // Apply preventive actions for high-risk predictions
        if (riskType === 'no-show') {
          // Send enhanced reminder
          const job = await serverSupabase
            .from('jobs')
            .select('id, title, scheduled_start_date, contractor_id, homeowner_id')
            .eq('id', contextJobId)
            .single();

          if (job.data) {
            // Send reminder
            await NoShowReminderService.sendPreStartReminders();
            preventiveAction = 'Enhanced reminder sent';
            actionTaken = 'preventive-reminder';
          }
        } else if (riskType === 'dispute' && severity === 'high') {
          // Suggest milestone payments for high-value disputes
          preventiveAction = 'Consider milestone payments';
          // Note: Milestone payment logic would be implemented separately
        }
      }

      // Log the risk prediction
      const predictionId = await AgentLogger.logRiskPrediction({
        jobId: contextJobId,
        userId,
        riskType,
        probability,
        severity,
        preventiveAction,
        applied: preventiveAction !== undefined,
      });

      // Create agent decision log
      const decision = {
        jobId: contextJobId,
        userId,
        agentName: 'predictive' as const,
        decisionType: 'risk-prediction' as const,
        actionTaken,
        confidence: probability,
        reasoning: `${riskType} risk: ${reasoning}`,
        metadata: {
          riskType,
          severity,
          preventiveAction,
        },
      };

      await AgentLogger.logDecision(decision);

      return {
        success: true,
        decision,
        metadata: {
          predictionId,
          riskType,
          probability,
          severity,
          preventiveAction,
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
}

