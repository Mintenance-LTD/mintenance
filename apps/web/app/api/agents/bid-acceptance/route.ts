/**
 * Bid Acceptance Agent API Endpoint
 * Handles automated bid evaluation and acceptance
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { AgentLogger } from '@/lib/services/agents/AgentLogger';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import type { ActionTaken } from '@/lib/services/agents/types';

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

export const POST = withApiHandler({ rateLimit: { maxRequests: 30 } }, async (req, { user }) => {
  const body = await req.json();
  let validatedData;
  try {
    validatedData = requestSchema.parse(body);
  } catch {
    throw new BadRequestError('Invalid request data. Please check your input and try again.');
  }
  const { action, context } = validatedData;

  const { data: job, error: jobError } = await serverSupabase
    .from('jobs')
    .select('*, homeowner_id')
    .eq('id', context.jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.homeowner_id !== user.id) {
    return NextResponse.json({ error: 'Only job owner can evaluate bids' }, { status: 403 });
  }

  let result;

  switch (action) {
    case 'evaluate': {
      const { data: bids } = await serverSupabase
        .from('bids')
        .select(`*, contractor:contractor_id (id, first_name, last_name, rating, total_jobs, certifications)`)
        .eq('job_id', context.jobId)
        .order('amount', { ascending: true });

      if (!bids || bids.length === 0) {
        return NextResponse.json({ success: false, message: 'No bids to evaluate' });
      }

      const evaluations = await Promise.all(
        bids.map(async (bid: Record<string, unknown>) => {
          const contractor = bid.contractor as Record<string, unknown> | null;
          const evaluation = await (BidAcceptanceAgent as unknown as { evaluateBid(jobId: string, contractorId: string, data: unknown): Promise<Record<string, unknown>> }).evaluateBid(
            context.jobId, bid.contractor_id as string,
            { bidAmount: bid.amount, contractorRating: contractor?.rating || 0, totalJobs: contractor?.total_jobs || 0, certifications: contractor?.certifications || [], description: bid.description, estimatedDuration: bid.estimated_duration, thresholds: context.thresholds }
          );
          return { ...bid, ...evaluation };
        })
      );

      evaluations.sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.score as number) || 0) - ((a.score as number) || 0));
      result = { evaluations, recommended: evaluations[0], totalBids: evaluations.length };
      break;
    }

    case 'auto-accept': {
      if (!context.bidId) throw new BadRequestError('bidId required for auto-accept');

      const { data: bid } = await serverSupabase
        .from('bids')
        .select(`*, contractor:contractor_id (id, first_name, last_name, rating, total_jobs, certifications)`)
        .eq('id', context.bidId)
        .eq('job_id', context.jobId)
        .single();

      if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

      const bidContractor = bid.contractor as Record<string, unknown> | null;
      const evaluation = await (BidAcceptanceAgent as unknown as { evaluateBid(jobId: string, contractorId: string, data: unknown): Promise<{ confidence: number; recommend: boolean }> }).evaluateBid(
        context.jobId, bid.contractor_id,
        { bidAmount: bid.amount, contractorRating: bidContractor?.rating || 0, totalJobs: bidContractor?.total_jobs || 0, certifications: bidContractor?.certifications || [], description: bid.description, estimatedDuration: bid.estimated_duration, thresholds: context.thresholds }
      );

      if (evaluation.confidence >= 0.8 && evaluation.recommend) {
        await serverSupabase.from('bids').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', context.bidId);
        await serverSupabase.from('jobs').update({ status: 'in_progress', contractor_id: bid.contractor_id, updated_at: new Date().toISOString() }).eq('id', context.jobId);
        await serverSupabase.from('bids').update({ status: 'rejected' }).eq('job_id', context.jobId).neq('id', context.bidId);
        await serverSupabase.from('notifications').insert({ user_id: bid.contractor_id, type: 'bid_accepted', title: 'Your bid was accepted!', message: `Your bid for "${job.title}" has been accepted.`, data: { jobId: context.jobId, bidId: context.bidId }, created_at: new Date().toISOString() });
        result = { accepted: true, bidId: context.bidId, contractorId: bid.contractor_id, confidence: evaluation.confidence };
      } else {
        result = { accepted: false, reason: 'Bid does not meet auto-accept criteria', confidence: evaluation.confidence, recommendation: evaluation.recommend };
      }
      break;
    }

    case 'recommend': {
      const { data: allBids } = await serverSupabase
        .from('bids')
        .select(`*, contractor:contractor_id (id, first_name, last_name, rating, total_jobs, certifications, profile_image_url)`)
        .eq('job_id', context.jobId)
        .eq('status', 'pending');

      if (!allBids || allBids.length === 0) {
        return NextResponse.json({ success: false, message: 'No pending bids to recommend' });
      }

      const recommendations = await Promise.all(
        allBids.map(async (bid: Record<string, unknown>) => {
          const bidContractorRec = bid.contractor as Record<string, unknown> | null;
          const eval_ = await (BidAcceptanceAgent as unknown as { evaluateBid(jobId: string, contractorId: string, data: unknown): Promise<Record<string, unknown>> }).evaluateBid(
            context.jobId, bid.contractor_id as string,
            { bidAmount: bid.amount, contractorRating: bidContractorRec?.rating || 0, totalJobs: bidContractorRec?.total_jobs || 0, certifications: bidContractorRec?.certifications || [], description: bid.description, estimatedDuration: bid.estimated_duration, thresholds: context.thresholds }
          );
          return { ...bid, ...eval_ };
        })
      );

      const bestBid = recommendations.reduce((best: Record<string, unknown>, current: Record<string, unknown>) =>
        ((current.score as number) || 0) > ((best.score as number) || 0) ? current : best
      );

      result = { recommended: bestBid, alternativeCount: recommendations.length - 1, averagePrice: recommendations.reduce((sum: number, r: Record<string, unknown>) => sum + (r.amount as number), 0) / recommendations.length };
      break;
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  await AgentLogger.logDecision({
    agentName: 'BidAcceptanceAgent',
    decisionType: action as 'auto-accept' | 'evaluate' | 'recommend',
    actionTaken: (action === 'auto-accept' && (result as Record<string, unknown>).accepted ? 'accepted' : 'evaluated') as ActionTaken,
    confidence: (result as Record<string, unknown>).confidence as number || 0.75,
    reasoning: (result as Record<string, unknown>).reason as string || 'Bid evaluation completed',
    metadata: { ...result, userId: user.id, jobId: context.jobId }
  });

  logger.info('Bid acceptance agent processed', { service: 'api', action, userId: user.id });

  return NextResponse.json({ success: true, action, result, timestamp: new Date().toISOString() });
});
