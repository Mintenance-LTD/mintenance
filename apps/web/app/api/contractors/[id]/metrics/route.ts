import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';
import { collectRows } from '@/lib/db/collect-rows';
import {
  publicContractorPerformance,
  type CompletedPerformanceJob,
  type PerformanceResponse,
} from '@/lib/contractor/public-performance';

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

        // Public performance is limited to active, verified contractors.
        const { data: contractor, error: directoryError } = await serverSupabase
          .from('profile_directory')
          .select('id')
          .eq('id', id)
          .eq('role', 'contractor')
          .or('verified.eq.true,admin_verified.eq.true')
          .maybeSingle();
        if (directoryError)
          return NextResponse.json(
            { error: 'Metrics unavailable' },
            { status: 503 }
          );
        if (!contractor)
          return NextResponse.json(
            { error: 'Contractor not found' },
            { status: 404 }
          );
        const [jobs, bids, messages] = await Promise.all([
          collectRows<CompletedPerformanceJob>((from, to) =>
            serverSupabase
              .from('jobs')
              .select(
                'id,homeowner_id,scheduled_end_date,completed_at,created_at'
              )
              .eq('contractor_id', id)
              .eq('status', 'completed')
              .order('id')
              .range(from, to)
          ),
          collectRows<PerformanceResponse & { status: string }>((from, to) =>
            serverSupabase
              .from('bids')
              .select('job_id,created_at,status')
              .eq('contractor_id', id)
              .order('id')
              .range(from, to)
          ),
          collectRows<PerformanceResponse>((from, to) =>
            serverSupabase
              .from('messages')
              .select('job_id,created_at')
              .eq('sender_id', id)
              .order('id')
              .range(from, to)
          ),
        ]);
        const acceptedBids = bids.filter(
          (bid) => bid.status === 'accepted'
        ).length;
        const metrics = {
          winRate: bids.length
            ? Math.round((acceptedBids / bids.length) * 100)
            : 0,
          totalBids: bids.length,
          avgRating: 0,
          ...publicContractorPerformance(jobs, bids, messages),
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
