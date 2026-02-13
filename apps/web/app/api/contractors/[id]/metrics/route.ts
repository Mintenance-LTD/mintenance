import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: Params) {
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

  return withPublicRateLimit(req, async (_request) => getContractorMetrics(context), 'resource');
}

async function getContractorMetrics(context: Params) {
  try {
    const { id } = await context.params;
    if (!id) {
      logger.warn('Contractor ID missing in request', { service: 'contractors' });
      throw new BadRequestError('Contractor id missing');
    }

    // Fetch all relevant data in parallel
    const [
      completedJobsResponse,
      bidsResponse,
      firstBidsResponse,
      firstMessagesResponse,
      homeownerIdsResponse,
    ] = await Promise.all([
      // Completed jobs for this contractor
      // Schema: jobs columns include scheduled_start_date (not scheduled_date), budget (not total_amount)
      serverSupabase
        .from('jobs')
        .select('id, scheduled_start_date, completed_at, budget, created_at')
        .eq('contractor_id', id)
        .eq('status', 'completed'),

      // All bids by this contractor
      serverSupabase
        .from('bids')
        .select('id, status, job_id, created_at')
        .eq('contractor_id', id),

      // First bid timestamps for response time calculation
      serverSupabase
        .from('bids')
        .select('job_id, created_at')
        .eq('contractor_id', id)
        .order('created_at', { ascending: true }),

      // First message timestamps for response time calculation
      serverSupabase
        .from('messages')
        .select('job_id, created_at')
        .eq('sender_id', id)
        .order('created_at', { ascending: true }),

      // Homeowner IDs for repeat customer calculation
      serverSupabase
        .from('jobs')
        .select('homeowner_id')
        .eq('contractor_id', id)
        .eq('status', 'completed'),
    ]);

    const completedJobs = completedJobsResponse.data || [];
    const bids = bidsResponse.data || [];
    const firstBids = firstBidsResponse.data || [];
    const firstMessages = firstMessagesResponse.data || [];
    const homeownerIds = homeownerIdsResponse.data || [];

    // Calculate metrics
    const totalBids = bids.length;
    const acceptedBids = bids.filter(b => b.status === 'accepted').length;
    const acceptanceRate = totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;

    // Calculate on-time completion
    const jobsWithScheduledDates = completedJobs.filter(job => job.scheduled_start_date);
    const onTimeJobs = jobsWithScheduledDates.filter(job => {
      if (!job.scheduled_start_date || !job.completed_at) return false;
      const scheduled = new Date(job.scheduled_start_date);
      const completed = new Date(job.completed_at);
      // Consider on-time if completed within 1 day of scheduled date
      return completed <= new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
    });
    const onTimeCompletion = jobsWithScheduledDates.length > 0
      ? Math.round((onTimeJobs.length / jobsWithScheduledDates.length) * 100)
      : 0;

    // Calculate repeat customers
    const homeownerCounts = new Map<string, number>();
    homeownerIds.forEach((job: { homeowner_id: string | null }) => {
      if (job.homeowner_id) {
        homeownerCounts.set(job.homeowner_id, (homeownerCounts.get(job.homeowner_id) || 0) + 1);
      }
    });
    const repeatCustomers = Array.from(homeownerCounts.values()).filter(count => count > 1).length;
    const repeatCustomersPercentage = homeownerCounts.size > 0
      ? Math.round((repeatCustomers / homeownerCounts.size) * 100)
      : 0;

    // Calculate average project value
    const jobsWithAmounts = completedJobs.filter(job => job.budget && job.budget > 0);
    const avgProjectValue = jobsWithAmounts.length > 0
      ? Math.round(
          jobsWithAmounts.reduce((sum, job) => sum + Number(job.budget || 0), 0) /
          jobsWithAmounts.length
        )
      : 0;

    // Calculate average response time
    const jobIds = completedJobs.map(job => job.id);
    const responseTimes: number[] = [];

    // Create maps for first bid/message times per job
    const firstBidMap = new Map<string, Date>();
    firstBids.forEach((bid: { job_id: string; created_at: string }) => {
      if (!firstBidMap.has(bid.job_id)) {
        firstBidMap.set(bid.job_id, new Date(bid.created_at));
      }
    });

    const firstMessageMap = new Map<string, Date>();
    firstMessages.forEach((message: { job_id: string; created_at: string }) => {
      if (!firstMessageMap.has(message.job_id)) {
        firstMessageMap.set(message.job_id, new Date(message.created_at));
      }
    });

    // Calculate response time for each completed job
    completedJobs.forEach((job: { id: string; scheduled_start_date: string | null; completed_at: string | null; budget: number | null; created_at: string }) => {
      const jobCreatedAt = new Date(job.created_at).getTime();
      const firstBidTime = firstBidMap.get(job.id)?.getTime();
      const firstMessageTime = firstMessageMap.get(job.id)?.getTime();

      // Use the earliest response (bid or message)
      if (firstBidTime || firstMessageTime) {
        const earliestResponse = Math.min(
          firstBidTime || Infinity,
          firstMessageTime || Infinity
        );
        if (earliestResponse !== Infinity) {
          const responseTimeHours = (earliestResponse - jobCreatedAt) / (1000 * 60 * 60);
          if (responseTimeHours > 0 && responseTimeHours < 168) { // Valid range: 0-7 days
            responseTimes.push(responseTimeHours);
          }
        }
      }
    });

    const avgResponseTimeHours = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 24; // Default to 24 hours if no data

    // Format response time
    let responseTimeText = '< 24 hours';
    if (avgResponseTimeHours < 1) {
      responseTimeText = '< 1 hour';
    } else if (avgResponseTimeHours < 24) {
      responseTimeText = `< ${Math.round(avgResponseTimeHours)} hours`;
    } else if (avgResponseTimeHours < 48) {
      responseTimeText = '< 2 days';
    } else {
      responseTimeText = `< ${Math.round(avgResponseTimeHours / 24)} days`;
    }

    const metrics = {
      winRate: acceptanceRate,
      totalBids,
      avgRating: 0, // Will be calculated from reviews if needed
      earnings: jobsWithAmounts.reduce((sum, job) => sum + Number(job.budget || 0), 0),
      onTimeCompletion,
      repeatCustomers: repeatCustomersPercentage,
      avgProjectValue,
      responseTime: responseTimeText,
      responseTimeHours: avgResponseTimeHours,
    };

    logger.info('Contractor metrics retrieved successfully', {
      service: 'contractors',
      contractorId: id,
      metrics,
    });

    return NextResponse.json({ metrics });
  } catch (err) {
    logger.error('Failed to load contractor metrics', err, { service: 'contractors' });
    return handleAPIError(err);
  }
}
