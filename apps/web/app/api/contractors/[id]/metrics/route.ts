import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';
import { getRealisedAmount } from '@/lib/services/jobs/job-amount';

/**
 * GET /api/contractors/[id]/metrics
 * Public endpoint — fetch contractor performance metrics
 * Uses custom IP-based rate limiting + withPublicRateLimit (double-layer)
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: false },
  async (request, { params }) => {
    // Custom rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${getClientIp(request)}:${request.url}`,
      windowMs: 60000,
      maxRequests: 30,
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
            'X-RateLimit-Reset': new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
        }
      );
    }

    return withPublicRateLimit(
      request,
      async () => {
        const { id } = params;
        if (!id) {
          logger.warn('Contractor ID missing in request', {
            service: 'contractors',
          });
          throw new BadRequestError('Contractor id missing');
        }

        // Fetch all relevant data in parallel.
        // 2026-05-23: earnings + avgProjectValue used to be derived
        // from `jobs.budget`, which is now NULL for every job posted
        // under the open-bidding model (commit 479c164ce). That made
        // both metrics silently read £0 for any contractor whose
        // completed jobs were posted after 2026-05-22. Switched to
        // reading directly from `escrow_transactions` (the only
        // authoritative paid-out figure) via getRealisedAmount().
        const [
          completedJobsResponse,
          bidsResponse,
          firstBidsResponse,
          firstMessagesResponse,
          homeownerIdsResponse,
          releasedEscrowResponse,
        ] = await Promise.all([
          serverSupabase
            .from('jobs')
            .select(
              'id, scheduled_start_date, completed_at, budget, created_at'
            )
            .eq('contractor_id', id)
            .eq('status', 'completed'),

          serverSupabase
            .from('bids')
            .select('id, status, job_id, created_at')
            .eq('contractor_id', id),

          serverSupabase
            .from('bids')
            .select('job_id, created_at')
            .eq('contractor_id', id)
            .order('created_at', { ascending: true }),

          serverSupabase
            .from('messages')
            .select('job_id, created_at')
            .eq('sender_id', id)
            .order('created_at', { ascending: true }),

          serverSupabase
            .from('jobs')
            .select('homeowner_id')
            .eq('contractor_id', id)
            .eq('status', 'completed'),

          serverSupabase
            .from('escrow_transactions')
            .select('job_id, amount, status')
            .eq('payee_id', id)
            .in('status', ['released', 'completed']),
        ]);

        const completedJobs = completedJobsResponse.data || [];
        const bids = bidsResponse.data || [];
        const firstBids = firstBidsResponse.data || [];
        const firstMessages = firstMessagesResponse.data || [];
        const homeownerIds = homeownerIdsResponse.data || [];
        const releasedEscrow = releasedEscrowResponse.data || [];

        // Build a job_id → realised escrow amount index. We use the
        // per-job sum to be defensive against split disbursements
        // (one job, multiple releases — rare but possible if support
        // does a manual partial release).
        const escrowByJob = new Map<string, number>();
        for (const tx of releasedEscrow) {
          const realised = getRealisedAmount({
            escrow_amount: Number(tx.amount ?? 0),
            escrow_status: tx.status,
          });
          if (realised != null && tx.job_id) {
            escrowByJob.set(
              tx.job_id,
              (escrowByJob.get(tx.job_id) ?? 0) + realised
            );
          }
        }

        // Calculate metrics
        const totalBids = bids.length;
        const acceptedBids = bids.filter((b) => b.status === 'accepted').length;
        const acceptanceRate =
          totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;

        // Calculate on-time completion
        const jobsWithScheduledDates = completedJobs.filter(
          (job) => job.scheduled_start_date
        );
        const onTimeJobs = jobsWithScheduledDates.filter((job) => {
          if (!job.scheduled_start_date || !job.completed_at) return false;
          const scheduled = new Date(job.scheduled_start_date);
          const completed = new Date(job.completed_at);
          return (
            completed <= new Date(scheduled.getTime() + 24 * 60 * 60 * 1000)
          );
        });
        const onTimeCompletion =
          jobsWithScheduledDates.length > 0
            ? Math.round(
                (onTimeJobs.length / jobsWithScheduledDates.length) * 100
              )
            : 0;

        // Calculate repeat customers
        const homeownerCounts = new Map<string, number>();
        homeownerIds.forEach((job: { homeowner_id: string | null }) => {
          if (job.homeowner_id) {
            homeownerCounts.set(
              job.homeowner_id,
              (homeownerCounts.get(job.homeowner_id) || 0) + 1
            );
          }
        });
        const repeatCustomers = Array.from(homeownerCounts.values()).filter(
          (count) => count > 1
        ).length;
        const repeatCustomersPercentage =
          homeownerCounts.size > 0
            ? Math.round((repeatCustomers / homeownerCounts.size) * 100)
            : 0;

        // Calculate average project value off realised escrow only.
        // Filters out completed jobs with no released payment yet
        // (refunded, cancelled, or still stuck in release_pending).
        const realisedJobAmounts = completedJobs
          .map((job) => escrowByJob.get(job.id))
          .filter((amount): amount is number => amount != null && amount > 0);
        const avgProjectValue =
          realisedJobAmounts.length > 0
            ? Math.round(
                realisedJobAmounts.reduce((sum, amt) => sum + amt, 0) /
                  realisedJobAmounts.length
              )
            : 0;

        // Calculate average response time
        const responseTimes: number[] = [];

        const firstBidMap = new Map<string, Date>();
        firstBids.forEach((bid: { job_id: string; created_at: string }) => {
          if (!firstBidMap.has(bid.job_id)) {
            firstBidMap.set(bid.job_id, new Date(bid.created_at));
          }
        });

        const firstMessageMap = new Map<string, Date>();
        firstMessages.forEach(
          (message: { job_id: string; created_at: string }) => {
            if (!firstMessageMap.has(message.job_id)) {
              firstMessageMap.set(message.job_id, new Date(message.created_at));
            }
          }
        );

        completedJobs.forEach(
          (job: {
            id: string;
            scheduled_start_date: string | null;
            completed_at: string | null;
            budget: number | null;
            created_at: string;
          }) => {
            const jobCreatedAt = new Date(job.created_at).getTime();
            const firstBidTime = firstBidMap.get(job.id)?.getTime();
            const firstMessageTime = firstMessageMap.get(job.id)?.getTime();

            if (firstBidTime || firstMessageTime) {
              const earliestResponse = Math.min(
                firstBidTime || Infinity,
                firstMessageTime || Infinity
              );
              if (earliestResponse !== Infinity) {
                const responseTimeHours =
                  (earliestResponse - jobCreatedAt) / (1000 * 60 * 60);
                if (responseTimeHours > 0 && responseTimeHours < 168) {
                  responseTimes.push(responseTimeHours);
                }
              }
            }
          }
        );

        const avgResponseTimeHours =
          responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) /
              responseTimes.length
            : 24;

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

        // Earnings = sum of all released escrow paid to this
        // contractor, not the sum of homeowner-hint budgets.
        const earnings = realisedJobAmounts.reduce((sum, amt) => sum + amt, 0);

        const metrics = {
          winRate: acceptanceRate,
          totalBids,
          avgRating: 0,
          earnings,
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
      },
      'resource'
    );
  }
);
