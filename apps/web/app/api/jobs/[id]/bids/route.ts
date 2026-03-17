import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';
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

    // Use RLS-enforced client for user-scoped reads; fall back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    // Verify job exists and belongs to this homeowner
    const { data: job, error: jobError } = await userDb
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

    // Apply optional status filter from query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Fetch bids with contractor profile and job info
    let bidsQuery = userDb
      .from('bids')
      .select(`
        id,
        job_id,
        contractor_id,
        amount,
        description,
        status,
        estimated_duration_days,
        materials_included,
        warranty_months,
        created_at,
        updated_at,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          company_name,
          profile_image_url,
          city,
          bio,
          hourly_rate,
          years_experience
        ),
        job:job_id (
          id,
          title,
          category,
          status,
          budget
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    // Filter by status if provided (e.g. ?status=pending)
    if (statusFilter) {
      bidsQuery = bidsQuery.eq('status', statusFilter);
    }

    const { data: bids, error: bidsError } = await bidsQuery;

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
      const contractor = bid.contractor as Record<string, unknown> | null;
      return {
        ...bid,
        // Map DB 'description' column to 'message' for client compatibility
        message: bid.description,
        // Embed rating data into the contractor object so clients can access contractor.rating
        contractor: contractor ? {
          ...contractor,
          rating: rating?.avgRating ?? null,
          reviews_count: rating?.reviewCount ?? 0,
        } : null,
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
