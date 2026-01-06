import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Delete a saved job
 * DELETE /api/contractor/saved-jobs/[jobId]
 */
export async function DELETE(  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
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
    const user = await getCurrentUserFromCookies();
    const resolvedParams = await params;
    const jobId = resolvedParams.jobId;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (user.role !== 'contractor') {
      throw new ForbiddenError('Only contractors can unsave jobs');
    }

    // Delete the saved job
    const { error: deleteError } = await serverSupabase
      .from('saved_jobs')
      .delete()
      .eq('contractor_id', user.id)
      .eq('job_id', jobId);

    if (deleteError) {
      logger.error('Error unsaving job', deleteError, {
        service: 'saved_jobs',
        userId: user.id,
        jobId,
      });
      throw new InternalServerError('Failed to unsave job');
    }

    return NextResponse.json({ success: true, message: 'Job unsaved successfully' });
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/contractor/saved-jobs/[jobId]', error, {
      service: 'saved_jobs',
    });
    throw new InternalServerError('Internal server error');
  }
}

