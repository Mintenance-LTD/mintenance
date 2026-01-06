import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
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

    // CSRF protection
    await requireCSRF(request);
    const { id: jobId, bidId } = await params;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to reject bids');
    }

    if (user.role !== 'homeowner') {
      throw new ForbiddenError('Only homeowners can reject bids');
    }

    // Verify the job belongs to this homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error('Failed to fetch job', jobError || new Error('Job not found'), {
        service: 'jobs',
        jobId,
      });
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to reject bids for this job');
    }

    // Verify the bid exists and belongs to this job
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, job_id, status')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (bidError || !bid) {
      logger.error('Failed to fetch bid', bidError || new Error('Bid not found'), {
        service: 'jobs',
        bidId,
        jobId,
      });
      throw new NotFoundError('Bid not found');
    }

    if (bid.status === 'rejected') {
      throw new BadRequestError('Bid has already been rejected');
    }

    // Reject the bid
    const { error: rejectError } = await serverSupabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('id', bidId);

    if (rejectError) {
      logger.error('Failed to reject bid', rejectError, {
        service: 'jobs',
        bidId,
        jobId,
      });
      throw rejectError;
    }

    logger.info('Bid rejected successfully', {
      service: 'jobs',
      bidId,
      jobId,
      homeownerId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Bid rejected successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

