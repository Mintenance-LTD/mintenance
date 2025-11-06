import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { DisputeWorkflowService } from '../disputes/DisputeWorkflowService';
import type { AgentResult, AgentContext } from './types';

/**
 * Agent for automated dispute resolution attempts
 */
export class DisputeResolutionAgent {
  /**
   * Attempt to auto-resolve a dispute
   */
  static async attemptAutoResolution(
    escrowId: string,
    jobId?: string,
    context?: AgentContext
  ): Promise<AgentResult | null> {
    try {
      // Get dispute/escrow details
      const { data: escrow, error } = await serverSupabase
        .from('escrow_payments')
        .select('id, job_id, amount, dispute_reason, status, homeowner_id, contractor_id')
        .eq('id', escrowId)
        .eq('status', 'disputed')
        .single();

      if (error || !escrow) {
        logger.error('Failed to fetch dispute for auto-resolution', {
          service: 'DisputeResolutionAgent',
          escrowId,
          error: error?.message,
        });
        return null;
      }

      // Get job details
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, budget, category')
        .eq('id', escrow.job_id)
        .single();

      if (!job) {
        return null;
      }

      // Get contractor rating
      const { data: reviews } = await serverSupabase
        .from('reviews')
        .select('rating')
        .eq('contractor_id', escrow.contractor_id);

      const averageRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0;

      // Auto-refund for low-value disputes with high-rated contractors
      const amount = escrow.amount || 0;
      const isLowValue = amount < 200; // Less than £200
      const isHighRated = averageRating >= 4.5;

      if (isLowValue && isHighRated) {
        // Auto-refund to homeowner
        const { error: refundError } = await serverSupabase
          .from('escrow_payments')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowId);

        if (refundError) {
          logger.error('Failed to auto-refund dispute', {
            service: 'DisputeResolutionAgent',
            escrowId,
            error: refundError.message,
          });
          return null;
        }

        // Create notifications
        await serverSupabase.from('notifications').insert([
          {
            user_id: escrow.homeowner_id,
            title: 'Dispute Auto-Resolved',
            message: `Your dispute has been automatically resolved with a full refund.`,
            type: 'dispute_resolved',
            read: false,
            action_url: `/jobs/${escrow.job_id}`,
            created_at: new Date().toISOString(),
          },
          {
            user_id: escrow.contractor_id,
            title: 'Dispute Resolved',
            message: `A dispute has been automatically resolved.`,
            type: 'dispute_resolved',
            read: false,
            action_url: `/contractor/jobs/${escrow.job_id}`,
            created_at: new Date().toISOString(),
          },
        ]);

        // Log the decision
        const decision = {
          jobId: escrow.job_id,
          userId: escrow.homeowner_id,
          agentName: 'dispute-resolution' as const,
          decisionType: 'auto-resolve' as const,
          actionTaken: 'dispute-resolved' as const,
          confidence: 80,
          reasoning: `Auto-refunded: Low-value dispute (£${amount}), high-rated contractor (${averageRating.toFixed(1)})`,
          metadata: {
            escrowId,
            amount,
            averageRating,
          },
        };

        await AgentLogger.logDecision(decision);

        return {
          success: true,
          decision,
          metadata: {
            escrowId,
            amount,
            resolution: 'auto-refund',
          },
        };
      }

      // For higher-value disputes or lower-rated contractors, escalate to human review
      await DisputeWorkflowService.setDisputePriority(escrowId, 'high');

      return null;
    } catch (error) {
      logger.error('Error attempting auto-resolution', error, {
        service: 'DisputeResolutionAgent',
        escrowId,
      });
      return null;
    }
  }
}

