import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/jobs/[id]/bids
 * List bids for a job. Only accessible by the job's homeowner.
 */
export const GET = withApiHandler(
  { csrf: false, rateLimit: { maxRequests: 30 } },
  async (request: NextRequest, { user, params }) => {
    const jobId = params.id as string;
    if (!jobId) {
      throw new BadRequestError('Job ID is required');
    }

    // Verify job exists and belongs to this homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Only the job owner can view bids');
    }

    // Fetch bids with contractor profile info
    const { data: bids, error: bidsError } = await serverSupabase
      .from('bids')
      .select(`
        id,
        job_id,
        contractor_id,
        amount,
        message,
        status,
        estimated_duration_days,
        materials_included,
        warranty_months,
        created_at,
        updated_at,
        contractor:profiles!contractor_id (
          id,
          first_name,
          last_name,
          company_name,
          profile_image_url
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (bidsError) {
      logger.error('Failed to fetch bids for job', bidsError, {
        service: 'jobs',
        jobId,
        userId: user.id,
      });
      throw bidsError;
    }

    // Fetch average ratings for each contractor
    const contractorIds = (bids ?? [])
      .map((b: { contractor_id: string }) => b.contractor_id)
      .filter(Boolean);

    let contractorRatings = new Map<string, { avgRating: number; reviewCount: number }>();
    if (contractorIds.length > 0) {
      const { data: reviews } = await serverSupabase
        .from('reviews')
        .select('reviewee_id, rating')
        .in('reviewee_id', contractorIds);

      if (reviews) {
        const grouped = new Map<string, number[]>();
        for (const r of reviews as { reviewee_id: string; rating: number }[]) {
          if (!grouped.has(r.reviewee_id)) grouped.set(r.reviewee_id, []);
          grouped.get(r.reviewee_id)!.push(r.rating);
        }
        for (const [id, ratings] of grouped) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          contractorRatings.set(id, {
            avgRating: Math.round(avg * 10) / 10,
            reviewCount: ratings.length,
          });
        }
      }
    }

    const enrichedBids = (bids ?? []).map((bid: Record<string, unknown>) => {
      const rating = contractorRatings.get(bid.contractor_id as string);
      return {
        ...bid,
        contractorRating: rating?.avgRating ?? null,
        contractorReviewCount: rating?.reviewCount ?? 0,
      };
    });

    return NextResponse.json({
      bids: enrichedBids,
      total: enrichedBids.length,
    });
  }
);
