import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { getJobAmount } from '@/lib/services/jobs/job-amount';

const statusSchema = z.enum(['active', 'bid', 'completed', 'all']).optional();

interface JobApiResponse {
  id: string;
  title: string;
  description?: string;
  location?: string;
  category?: string;
  priority?: string;
  urgency?: string;
  budget?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  status: string;
  photos?: string[];
  created_at: string;
  scheduled_start_date?: string | null;
  scheduled_end_date?: string | null;
  homeowner_id: string;
  homeowner?:
    | {
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      }
    | Array<{
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      }>;
  job_attachments?: Array<{ file_url: string }>;
  // 2026-05-23: included so the consumer can show "what this job is
  // worth" without fabricating a number from the (now-NULL) budget.
  escrow_transactions?:
    | Array<{ amount?: number | string | null; status?: string | null }>
    | { amount?: number | string | null; status?: string | null }
    | null;
  bids?:
    | Array<{ amount?: number | string | null; status?: string | null }>
    | { amount?: number | string | null; status?: string | null }
    | null;
}

function getJobPhotos(job: JobApiResponse): string[] {
  if (job.photos && job.photos.length > 0) return job.photos;
  if (job.job_attachments && job.job_attachments.length > 0) {
    return job.job_attachments.map((a) => a.file_url);
  }
  return [];
}

function transformJob(job: JobApiResponse) {
  // 2026-05-23: derive a single `total_amount` from the most-committed
  // figure available. Used by the stats card on /contractor/jobs so
  // totals no longer read as £0 for jobs posted under the open-bidding
  // model (where jobs.budget is NULL).
  const escrowRows = Array.isArray(job.escrow_transactions)
    ? job.escrow_transactions
    : job.escrow_transactions
      ? [job.escrow_transactions]
      : [];
  const latestEscrow = escrowRows[0];
  const acceptedBidRows = Array.isArray(job.bids)
    ? job.bids.filter((b) => b?.status === 'accepted')
    : job.bids && job.bids.status === 'accepted'
      ? [job.bids]
      : [];
  const totalAmount = getJobAmount({
    budget: job.budget ?? job.budget_max ?? job.budget_min ?? null,
    escrow_amount: latestEscrow ? Number(latestEscrow.amount ?? 0) : null,
    escrow_status: latestEscrow?.status ?? null,
    accepted_bid_amount:
      acceptedBidRows.length > 0
        ? Number(acceptedBidRows[0]?.amount ?? 0)
        : null,
  });

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    category: job.category,
    priority: job.priority || job.urgency || 'medium',
    // Legacy `budget` field preserved for back-compat with any caller
    // still reading it; new callers should prefer `total_amount`.
    budget: job.budget || job.budget_max || job.budget_min || 0,
    total_amount: totalAmount,
    status: job.status,
    photos: getJobPhotos(job),
    created_at: job.created_at,
    scheduled_start_date: job.scheduled_start_date ?? null,
    scheduled_end_date: job.scheduled_end_date ?? null,
    homeowner_id: job.homeowner_id,
    homeowner: Array.isArray(job.homeowner)
      ? job.homeowner[0] || null
      : job.homeowner || null,
    homeowner_name: job.homeowner
      ? Array.isArray(job.homeowner)
        ? `${job.homeowner[0]?.first_name || ''} ${job.homeowner[0]?.last_name || ''}`.trim() ||
          'Unknown'
        : `${job.homeowner.first_name || ''} ${job.homeowner.last_name || ''}`.trim() ||
          'Unknown'
      : 'Unknown',
    homeowner_avatar: Array.isArray(job.homeowner)
      ? job.homeowner[0]?.profile_image_url
      : job.homeowner?.profile_image_url,
  };
}

const JOB_SELECT_FIELDS = `
  id,
  title,
  description,
  budget,
  budget_min,
  budget_max,
  location,
  category,
  priority,
  urgency,
  status,
  photos,
  created_at,
  scheduled_start_date,
  scheduled_end_date,
  homeowner_id,
  homeowner:profiles!homeowner_id (
    id,
    first_name,
    last_name,
    email,
    phone,
    profile_image_url
  ),
  job_attachments (
    file_url
  ),
  escrow_transactions (
    amount,
    status
  ),
  bids (
    amount,
    status
  )
`;

/**
 * GET /api/contractor/my-jobs
 * Get jobs for the authenticated contractor
 * Query params: status: 'active' | 'bid' | 'completed' | 'all' (optional)
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    // Validate status parameter
    let status: 'active' | 'bid' | 'completed' | 'all' | undefined;
    if (statusParam) {
      try {
        status = statusSchema.parse(statusParam);
      } catch {
        throw new BadRequestError(
          'Invalid status parameter. Must be: active, bid, completed, or all'
        );
      }
    }

    // Build query based on status
    if (status === 'bid') {
      // Get jobs where contractor has placed a bid
      const { data: bids, error: bidsError } = await serverSupabase
        .from('bids')
        .select('job_id')
        .eq('contractor_id', user.id);

      if (bidsError) {
        logger.error('Failed to fetch contractor bids', bidsError, {
          service: 'contractor-api',
          contractorId: user.id,
        });
        throw bidsError;
      }

      const jobIds = (bids || []).map((b) => b.job_id).filter(Boolean);

      if (jobIds.length === 0) {
        return NextResponse.json({ jobs: [] });
      }

      const { data: jobs, error: jobsError } = await serverSupabase
        .from('jobs')
        .select(JOB_SELECT_FIELDS)
        .in('id', jobIds)
        .order('created_at', { ascending: false });

      if (jobsError) {
        logger.error('Failed to fetch jobs with bids', jobsError, {
          service: 'contractor-api',
          contractorId: user.id,
        });
        throw jobsError;
      }

      return NextResponse.json({
        jobs: await attachSignedPhotos(
          (jobs || []).map((job: JobApiResponse) => transformJob(job))
        ),
      });
    } else {
      // Get jobs assigned to contractor or filter by status
      let query = serverSupabase
        .from('jobs')
        .select(JOB_SELECT_FIELDS)
        .eq('contractor_id', user.id);

      if (status === 'active') {
        query = query.in('status', ['in_progress', 'assigned', 'pending']);
      } else if (status === 'completed') {
        query = query.eq('status', 'completed');
      }

      query = query.order('created_at', { ascending: false });

      const { data: jobs, error: jobsError } = await query;

      if (jobsError) {
        logger.error('Failed to fetch contractor jobs', jobsError, {
          service: 'contractor-api',
          contractorId: user.id,
          status,
        });
        throw jobsError;
      }

      return NextResponse.json({
        jobs: await attachSignedPhotos(
          (jobs || []).map((job: JobApiResponse) => transformJob(job))
        ),
      });
    }
  }
);

// Re-sign Job-storage URLs in-place so mobile/web list views don't
// render broken gray thumbnails when a row was saved with a legacy
// `public` URL (the bucket flipped `public=false` on 2026-04-17). The
// helper leaves non-Job-storage URLs alone, so seeded external CDN
// images pass through untouched. Deferred from f507c639 —
// landed now that the list-endpoint pattern is stable.
async function attachSignedPhotos<T extends { photos: string[] }>(
  jobs: T[]
): Promise<T[]> {
  await Promise.all(
    jobs.map(async (job) => {
      if (job.photos.length > 0) {
        job.photos = await resignJobStorageUrls(job.photos);
      }
    })
  );
  return jobs;
}
