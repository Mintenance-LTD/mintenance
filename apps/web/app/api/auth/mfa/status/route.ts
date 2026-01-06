import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { MFAService } from '@/lib/mfa/mfa-service';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/mfa/status
 * Get MFA status for current user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 5
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(5),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Get current user from headers (set by middleware)
    const user = getCurrentUserFromHeaders(request.headers);

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get MFA status
    const mfaStatus = await MFAService.getMFAStatus(user.id);

    return NextResponse.json({
      success: true,
      data: mfaStatus,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
