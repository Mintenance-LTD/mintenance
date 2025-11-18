import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { AutomationPreferencesService } from './AutomationPreferencesService';
import { validateStatusTransition, type JobStatus } from '@/lib/job-state-machine';
import type { AgentResult, AgentContext } from './types';

/**
 * Agent for automated job status transitions
 */
export class JobStatusAgent {
  /**
   * Evaluate and potentially auto-complete a job
   */
  static async evaluateAutoComplete(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult | null> {
    try {
      // Get job details
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select('id, status, contractor_id, homeowner_id, scheduled_start_date')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error('Failed to fetch job for auto-complete evaluation', {
          service: 'JobStatusAgent',
          jobId,
          error: error?.message,
        });
        return null;
      }

      // Only evaluate in_progress jobs
      if (job.status !== 'in_progress') {
        return null;
      }

      // Check if homeowner has auto-complete enabled
      const autoCompleteEnabled = await AutomationPreferencesService.isEnabled(
        job.homeowner_id,
        'autoCompleteJobs'
      );

      if (!autoCompleteEnabled) {
        return null;
      }

      // Get recent messages to detect completion signals
      // Query messages using 'content' column (schema uses 'content', not 'message_text')
      const { data: messages, error: messagesError } = await serverSupabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messagesError || !messages || messages.length === 0) {
        return null;
      }

      // Look for completion signals in messages
      const completionKeywords = [
        'completed',
        'finished',
        'done',
        'all set',
        'complete',
        'ready',
        'finished the work',
      ];

      const contractorMessages = messages.filter(
        (m) => m.sender_id === job.contractor_id
      );

      const hasCompletionSignal = contractorMessages.some((message: any) => {
        const content = (message.content || '').toLowerCase();
        return completionKeywords.some((keyword) => content.includes(keyword));
      });

      // Check if homeowner has confirmed
      const homeownerMessages = messages.filter(
        (m) => m.sender_id === job.homeowner_id
      );
      const confirmationKeywords = ['thanks', 'thank you', 'looks good', 'perfect', 'great'];
      const hasConfirmation = homeownerMessages.some((message: any) => {
        const content = (message.content || '').toLowerCase();
        return confirmationKeywords.some((keyword) => content.includes(keyword));
      });

      // Auto-complete if contractor signaled completion AND homeowner confirmed
      if (hasCompletionSignal && hasConfirmation) {
        return await this.transitionJobStatus(
          jobId,
          job.status as JobStatus,
          'completed',
          'Auto-completed: Contractor signaled completion and homeowner confirmed',
          job.homeowner_id
        );
      }

      return null;
    } catch (error) {
      logger.error('Error evaluating auto-complete', error, {
        service: 'JobStatusAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Auto-cancel jobs with no bids after 7 days
   */
  static async evaluateAutoCancel(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult | null> {
    try {
      // Get job details
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select('id, status, created_at, homeowner_id')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error('Failed to fetch job for auto-cancel evaluation', {
          service: 'JobStatusAgent',
          jobId,
          error: error?.message,
        });
        return null;
      }

      // Only evaluate posted jobs
      if (job.status !== 'posted') {
        return null;
      }

      // Check if job is older than 7 days
      const jobCreatedAt = new Date(job.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (jobCreatedAt > sevenDaysAgo) {
        return null;
      }

      // Check if job has any bids
      const { data: bids, error: bidsError } = await serverSupabase
        .from('bids')
        .select('id')
        .eq('job_id', jobId)
        .limit(1);

      if (bidsError) {
        logger.error('Failed to check bids for auto-cancel', {
          service: 'JobStatusAgent',
          jobId,
          error: bidsError.message,
        });
        return null;
      }

      // Auto-cancel if no bids
      if (!bids || bids.length === 0) {
        // Notify homeowner before canceling
        await serverSupabase.from('notifications').insert({
          user_id: job.homeowner_id,
          title: 'Job Auto-Canceled',
          message: `Your job has been automatically canceled as no bids were received within 7 days.`,
          type: 'job_cancelled',
          read: false,
          action_url: `/jobs/${jobId}`,
          created_at: new Date().toISOString(),
        });

        return await this.transitionJobStatus(
          jobId,
          'posted',
          'cancelled',
          'Auto-canceled: No bids received within 7 days',
          job.homeowner_id
        );
      }

      return null;
    } catch (error) {
      logger.error('Error evaluating auto-cancel', error, {
        service: 'JobStatusAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Transition job status with validation and logging
   */
  private static async transitionJobStatus(
    jobId: string,
    currentStatus: JobStatus,
    newStatus: JobStatus,
    reasoning: string,
    userId: string
  ): Promise<AgentResult> {
    try {
      // Validate status transition
      try {
        validateStatusTransition(currentStatus, newStatus);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid status transition',
        };
      }

      // Update job status
      const { error: updateError } = await serverSupabase
        .from('jobs')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (updateError) {
        logger.error('Failed to update job status', {
          service: 'JobStatusAgent',
          jobId,
          error: updateError.message,
        });
        return {
          success: false,
          error: 'Failed to update job status',
        };
      }

      // Log the decision
      const decision = {
        jobId,
        userId,
        agentName: 'job-status' as const,
        decisionType: 'status-transition' as const,
        actionTaken: 'status-changed' as const,
        confidence: 85, // High confidence for rule-based transitions
        reasoning,
        metadata: {
          currentStatus,
          newStatus,
        },
      };

      await AgentLogger.logDecision(decision);

      logger.info('Job status transitioned by agent', {
        service: 'JobStatusAgent',
        jobId,
        currentStatus,
        newStatus,
      });

      return {
        success: true,
        decision,
        metadata: {
          currentStatus,
          newStatus,
        },
      };
    } catch (error) {
      logger.error('Error transitioning job status', error, {
        service: 'JobStatusAgent',
        jobId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process all eligible jobs for status automation
   */
  static async processEligibleJobs(): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    try {
      // Get jobs eligible for auto-complete (in_progress)
      const { data: inProgressJobs } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('status', 'in_progress');

      if (inProgressJobs) {
        for (const job of inProgressJobs.slice(0, 50)) {
          // Limit to 50 jobs per run
          const result = await this.evaluateAutoComplete(job.id);
          if (result) {
            results.push(result);
          }
        }
      }

      // Get jobs eligible for auto-cancel (posted, older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: oldPostedJobs } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('status', 'posted')
        .lte('created_at', sevenDaysAgo.toISOString());

      if (oldPostedJobs) {
        for (const job of oldPostedJobs.slice(0, 50)) {
          // Limit to 50 jobs per run
          const result = await this.evaluateAutoCancel(job.id);
          if (result) {
            results.push(result);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Error processing eligible jobs', error, {
        service: 'JobStatusAgent',
      });

      return [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }
  }
}

