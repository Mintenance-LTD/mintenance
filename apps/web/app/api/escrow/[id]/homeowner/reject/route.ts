import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const rejectCompletionSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

/**
 * POST /api/escrow/:id/homeowner/reject
 * Homeowner rejects completion
 */
export async function POST(
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

    // CSRF protection
    await requireCSRF(request);
    const { id } = await params;
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const escrowId = id;

    const validation = await validateRequest(request, rejectCompletionSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { reason } = validation.data;

    await HomeownerApprovalService.rejectCompletion(escrowId, user.id, reason);

    return NextResponse.json({ success: true, escrowId });
  } catch (error) {
    logger.error('Error rejecting completion', error, { service: 'homeowner-reject' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject completion' },
      { status: 500 }
    );
  }
}

