import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getContractorRatingStats } from '@/lib/services/reviews/contractor-rating';
import { AgentLogger } from './AgentLogger';
import { DisputeWorkflowService } from '../disputes/DisputeWorkflowService';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
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
      // Get dispute/escrow details.
      // 2026-05-09: corrected column names — `escrow_transactions` does
      // not have `dispute_reason`, `homeowner_id`, or `contractor_id`.
      // The dispute reason lives on the `disputes` table; payer/payee
      // are the canonical principal columns on escrow.
      const { data: escrow, error } = await serverSupabase
        .from('escrow_transactions')
        .select('id, job_id, amount, status, payer_id, payee_id')
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

      // Get contractor (payee) rating (canonical helper — reviewee_id keyed).
      const ratingStats = await getContractorRatingStats(
        serverSupabase,
        escrow.payee_id
      );
      const averageRating = ratingStats.average;

      // Auto-refund for low-value disputes with high-rated contractors
      const amount = escrow.amount || 0;
      const isLowValue = amount < 200; // Less than £200
      const isHighRated = averageRating >= 4.5;

      if (isLowValue && isHighRated) {
        // Auto-refund to homeowner
        const { error: refundError } = await serverSupabase
          .from('escrow_transactions')
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
        await Promise.all([
          NotificationService.createNotification({
            userId: escrow.payer_id,
            title: 'Dispute Auto-Resolved',
            message: `Your dispute has been automatically resolved with a full refund.`,
            type: 'dispute_resolved',
            actionUrl: `/jobs/${escrow.job_id}`,
          }),
          NotificationService.createNotification({
            userId: escrow.payee_id,
            title: 'Dispute Resolved',
            message: `A dispute has been automatically resolved.`,
            type: 'dispute_resolved',
            actionUrl: `/contractor/jobs/${escrow.job_id}`,
          }),
        ]);

        // Log the decision
        const decision = {
          jobId: escrow.job_id,
          userId: escrow.payer_id,
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
