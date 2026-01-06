import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { EscrowStatusService } from '@/lib/services/escrow/EscrowStatusService';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * GET /api/escrow/:id/release-timeline
 * Get release timeline and blockers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 20
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(20),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const { id: escrowId } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const blockingReasons = await EscrowStatusService.getBlockingReasons(escrowId);
    const estimatedReleaseDate = await EscrowStatusService.getEstimatedReleaseDate(escrowId);

    return NextResponse.json({
      success: true,
      data: {
        blockingReasons,
        estimatedReleaseDate: estimatedReleaseDate?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error('Error getting release timeline', error, { service: 'escrow-release-timeline' });
    throw new InternalServerError('Failed to get timeline');
  }
}

