import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { MatchCommunicationService } from '@/lib/services/matching/MatchCommunicationService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { matchCommunicationSchema } from '@/lib/validation/schemas';

export async function POST(  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    if (!user) {
      throw new UnauthorizedError('Authentication required for match communication');
    }

    const { id: jobId } = await params;

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, matchCommunicationSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { contractorId } = validation.data;

    // Get match explanation
    const explanation = await MatchCommunicationService.getMatchExplanation(jobId, contractorId);

    if (!explanation) {
      throw new NotFoundError('Match explanation not found');
    }

    // Send match notification
    const success = await MatchCommunicationService.notifyContractorOfMatch(
      jobId,
      contractorId,
      user.id,
      explanation
    );

    if (!success) {
      throw new Error('Failed to send match notification');
    }

    return NextResponse.json({
      message: 'Match notification sent successfully',
      explanation,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

