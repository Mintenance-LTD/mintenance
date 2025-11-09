import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { AutomationPreferencesService } from './AutomationPreferencesService';
import type { AgentResult, AgentContext } from './types';

/**
 * Agent for automated bid acceptance based on quality criteria
 */
export class BidAcceptanceAgent {
  /**
   * Evaluate if a bid should be auto-accepted
   */
  static async evaluateAutoAccept(
    bidId: string,
    jobId: string,
    homeownerId: string,
    context?: AgentContext
  ): Promise<AgentResult | null> {
    try {
      // Check if homeowner has auto-accept enabled
      const autoAcceptEnabled = await AutomationPreferencesService.isEnabled(
        homeownerId,
        'autoAcceptBids'
      );

      if (!autoAcceptEnabled) {
        return null;
      }

      // Get bid details
      const { data: bid, error: bidError } = await serverSupabase
        .from('bids')
        .select('id, contractor_id, amount, status, created_at')
        .eq('id', bidId)
        .single();

      if (bidError || !bid) {
        logger.error('Failed to fetch bid for auto-accept evaluation', {
          service: 'BidAcceptanceAgent',
          bidId,
          error: bidError?.message,
        });
        return null;
      }

      // Only evaluate pending bids
      if (bid.status !== 'pending') {
        return null;
      }

      // Get job details
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, budget, category, location, description')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        logger.error('Failed to fetch job for auto-accept evaluation', {
          service: 'BidAcceptanceAgent',
          jobId,
          error: jobError?.message,
        });
        return null;
      }

      // Get contractor profile
      const { data: contractor, error: contractorError } = await serverSupabase
        .from('users')
        .select('id, verified, background_check_status')
        .eq('id', bid.contractor_id)
        .single();

      if (contractorError || !contractor) {
        return null;
      }

      // Only auto-accept for verified contractors
      if (!contractor.verified || contractor.background_check_status !== 'passed') {
        return null;
      }

      // Get contractor rating
      const { data: reviews } = await serverSupabase
        .from('reviews')
        .select('rating')
        .eq('contractor_id', bid.contractor_id);

      const averageRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0;

      // Check if bid meets criteria
      const meetsCriteria = this.evaluateBidCriteria({
        bidAmount: bid.amount || 0,
        jobBudget: job.budget || 0,
        contractorRating: averageRating,
        reviewCount: reviews?.length || 0,
      });

      if (!meetsCriteria) {
        return null;
      }

      // Calculate match score (simplified approach - using contractor rating and review count)
      // Full implementation would use AIMatchingService with proper MatchingCriteria
      let matchScore = 0;
      
      // Base score from rating
      matchScore += averageRating * 10; // 0-50 points from rating
      
      // Bonus from review count
      if (reviews && reviews.length >= 10) {
        matchScore += 20;
      } else if (reviews && reviews.length >= 5) {
        matchScore += 10;
      }
      
      // Check if bid is within budget
      if (job.budget && bid.amount && bid.amount <= job.budget) {
        matchScore += 20;
      } else if (job.budget && bid.amount && bid.amount <= job.budget * 1.1) {
        matchScore += 10; // Allow 10% over budget
      }

      // Auto-accept if high match score and meets criteria
      if (matchScore >= 70 && meetsCriteria) {
        // Update bid status to accepted
        const { error: updateError } = await serverSupabase
          .from('bids')
          .update({
            status: 'accepted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bidId);

        if (updateError) {
          logger.error('Failed to auto-accept bid', {
            service: 'BidAcceptanceAgent',
            bidId,
            error: updateError.message,
          });
          return null;
        }

        // Update job status to assigned
        await serverSupabase
          .from('jobs')
          .update({
            status: 'assigned',
            contractor_id: bid.contractor_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        // Create notifications
        await serverSupabase.from('notifications').insert([
          {
            user_id: homeownerId,
            title: 'Bid Auto-Accepted',
            message: `A bid has been automatically accepted based on quality criteria.`,
            type: 'bid_accepted',
            read: false,
            action_url: `/jobs/${jobId}`,
            created_at: new Date().toISOString(),
          },
          {
            user_id: bid.contractor_id,
            title: 'Bid Accepted',
            message: `Your bid has been accepted!`,
            type: 'bid_accepted',
            read: false,
            action_url: `/contractor/jobs/${jobId}`,
            created_at: new Date().toISOString(),
          },
        ]);

        // Log the decision
        const decision = {
          jobId,
          userId: homeownerId,
          agentName: 'bid-acceptance' as const,
          decisionType: 'auto-accept' as const,
          actionTaken: 'bid-accepted' as const,
          confidence: 85,
          reasoning: `Auto-accepted: High rating (${averageRating.toFixed(1)}), good match score (${matchScore}), within budget`,
          metadata: {
            bidId,
            contractorId: bid.contractor_id,
            bidAmount: bid.amount,
            matchScore,
            averageRating,
          },
        };

        await AgentLogger.logDecision(decision);

        return {
          success: true,
          decision,
          metadata: {
            bidId,
            matchScore,
            averageRating,
          },
        };
      }

      return null;
    } catch (error) {
      logger.error('Error evaluating auto-accept', error, {
        service: 'BidAcceptanceAgent',
        bidId,
      });
      return null;
    }
  }

  /**
   * Evaluate if bid meets quality criteria
   */
  private static evaluateBidCriteria(criteria: {
    bidAmount: number;
    jobBudget: number;
    contractorRating: number;
    reviewCount: number;
  }): boolean {
    // Bid must be within budget
    if (criteria.jobBudget > 0 && criteria.bidAmount > criteria.jobBudget * 1.1) {
      // Allow 10% over budget
      return false;
    }

    // Contractor must have high rating (4.5+)
    if (criteria.contractorRating < 4.5) {
      return false;
    }

    // Contractor must have at least 5 reviews
    if (criteria.reviewCount < 5) {
      return false;
    }

    return true;
  }

}

