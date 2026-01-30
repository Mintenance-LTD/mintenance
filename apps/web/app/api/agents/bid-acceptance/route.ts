/**
 * Bid Acceptance Agent API Endpoint
 * Handles automated bid evaluation and acceptance
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { AgentLogger } from '@/lib/services/agents/AgentLogger';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';
import { logger } from '@mintenance/shared';

const requestSchema = z.object({
  action: z.enum(['evaluate', 'auto-accept', 'recommend']),
  context: z.object({
    jobId: z.string(),
    bidId: z.string().optional(),
    contractorId: z.string().optional(),
    bidAmount: z.number().optional(),
    thresholds: z.object({
      maxPrice: z.number().optional(),
      minRating: z.number().optional(),
      requiredCertifications: z.array(z.string()).optional()
    }).optional()
  })
});

export async function POST(req: Request) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'anonymous'}:${req.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request
    const body = await req.json();
    const validatedData = requestSchema.parse(body);
    const { action, context } = validatedData;

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, homeowner_id')
      .eq('id', context.jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only homeowner can use bid acceptance agent
    if (job.homeowner_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only job owner can evaluate bids' },
        { status: 403 }
      );
    }

    let result;

    switch (action) {
      case 'evaluate':
        // Get all bids for the job
        const { data: bids } = await supabase
          .from('bids')
          .select(`
            *,
            contractor:contractor_id (
              id,
              first_name,
              last_name,
              rating,
              total_jobs,
              certifications
            )
          `)
          .eq('job_id', context.jobId)
          .order('amount', { ascending: true });

        if (!bids || bids.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'No bids to evaluate'
          });
        }

        // Evaluate each bid
        const evaluations = await Promise.all(
          bids.map(async (bid) => {
            const evaluation = await BidAcceptanceAgent.evaluateBid(
              context.jobId,
              bid.contractor_id,
              {
                bidAmount: bid.amount,
                contractorRating: bid.contractor?.rating || 0,
                totalJobs: bid.contractor?.total_jobs || 0,
                certifications: bid.contractor?.certifications || [],
                description: bid.description,
                estimatedDuration: bid.estimated_duration,
                thresholds: context.thresholds
              }
            );
            return {
              ...bid,
              ...evaluation
            };
          })
        );

        // Sort by recommendation score
        evaluations.sort((a, b) => (b.score || 0) - (a.score || 0));

        result = {
          evaluations,
          recommended: evaluations[0],
          totalBids: evaluations.length
        };
        break;

      case 'auto-accept':
        if (!context.bidId) {
          return NextResponse.json(
            { error: 'bidId required for auto-accept' },
            { status: 400 }
          );
        }

        // Get the specific bid
        const { data: bid } = await supabase
          .from('bids')
          .select(`
            *,
            contractor:contractor_id (
              id,
              first_name,
              last_name,
              rating,
              total_jobs,
              certifications
            )
          `)
          .eq('id', context.bidId)
          .eq('job_id', context.jobId)
          .single();

        if (!bid) {
          return NextResponse.json(
            { error: 'Bid not found' },
            { status: 404 }
          );
        }

        // Evaluate the bid
        const evaluation = await BidAcceptanceAgent.evaluateBid(
          context.jobId,
          bid.contractor_id,
          {
            bidAmount: bid.amount,
            contractorRating: bid.contractor?.rating || 0,
            totalJobs: bid.contractor?.total_jobs || 0,
            certifications: bid.contractor?.certifications || [],
            description: bid.description,
            estimatedDuration: bid.estimated_duration,
            thresholds: context.thresholds
          }
        );

        // Check if bid meets auto-accept criteria
        const autoAcceptThreshold = 0.8; // 80% confidence
        if (evaluation.confidence >= autoAcceptThreshold && evaluation.recommend) {
          // Accept the bid
          const { error: acceptError } = await supabase
            .from('bids')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString()
            })
            .eq('id', context.bidId);

          if (acceptError) {
            throw acceptError;
          }

          // Update job status
          await supabase
            .from('jobs')
            .update({
              status: 'in_progress',
              contractor_id: bid.contractor_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', context.jobId);

          // Reject other bids
          await supabase
            .from('bids')
            .update({ status: 'rejected' })
            .eq('job_id', context.jobId)
            .neq('id', context.bidId);

          // Create notification
          await supabase
            .from('notifications')
            .insert({
              user_id: bid.contractor_id,
              type: 'bid_accepted',
              title: 'Your bid was accepted!',
              message: `Your bid for "${job.title}" has been accepted.`,
              data: { jobId: context.jobId, bidId: context.bidId },
              created_at: new Date().toISOString()
            });

          result = {
            accepted: true,
            bidId: context.bidId,
            contractorId: bid.contractor_id,
            confidence: evaluation.confidence
          };
        } else {
          result = {
            accepted: false,
            reason: 'Bid does not meet auto-accept criteria',
            confidence: evaluation.confidence,
            recommendation: evaluation.recommend
          };
        }
        break;

      case 'recommend':
        // Similar to evaluate but returns single best recommendation
        const { data: allBids } = await supabase
          .from('bids')
          .select(`
            *,
            contractor:contractor_id (
              id,
              first_name,
              last_name,
              rating,
              total_jobs,
              certifications,
              profile_image_url
            )
          `)
          .eq('job_id', context.jobId)
          .eq('status', 'pending');

        if (!allBids || allBids.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'No pending bids to recommend'
          });
        }

        const recommendations = await Promise.all(
          allBids.map(async (bid) => {
            const evaluation = await BidAcceptanceAgent.evaluateBid(
              context.jobId,
              bid.contractor_id,
              {
                bidAmount: bid.amount,
                contractorRating: bid.contractor?.rating || 0,
                totalJobs: bid.contractor?.total_jobs || 0,
                certifications: bid.contractor?.certifications || [],
                description: bid.description,
                estimatedDuration: bid.estimated_duration,
                thresholds: context.thresholds
              }
            );
            return {
              ...bid,
              ...evaluation
            };
          })
        );

        const bestBid = recommendations.reduce((best, current) =>
          (current.score || 0) > (best.score || 0) ? current : best
        );

        result = {
          recommended: bestBid,
          alternativeCount: recommendations.length - 1,
          averagePrice: recommendations.reduce((sum, r) => sum + r.amount, 0) / recommendations.length
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log the decision
    await AgentLogger.logDecision({
      agentName: 'BidAcceptanceAgent',
      decisionType: action,
      actionTaken: action === 'auto-accept' && result.accepted ? 'accepted' : 'evaluated',
      confidence: result.confidence || 0.75,
      reasoning: result.reason || 'Bid evaluation completed',
      metadata: {
        ...result,
        userId: session.user.id,
        jobId: context.jobId
      }
    });

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    logger.error('Bid acceptance agent error:', error, { service: 'api' });

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process bid acceptance', details: error.message },
      { status: 500 }
    );
  }
}