import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { requireCronAuth } from '@/lib/cron-auth';
import { AutoVerificationService } from '@/lib/services/admin/AutoVerificationService';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Cron endpoint for automatic contractor verification.
 * Evaluates unverified contractors against configurable rules and
 * auto-verifies eligible ones.
 *
 * Recommended schedule: daily
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
      windowMs: 60000,
      maxRequests: 1,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(1),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        },
      );
    }

    const authError = requireCronAuth(request);
    if (authError) return authError;

    logger.info('Starting auto-verify contractors cron', {
      service: 'auto-verify-contractors',
    });

    const result = await AutoVerificationService.processAutoVerifications();

    logger.info('Auto-verify contractors cron completed', {
      service: 'auto-verify-contractors',
      verified: result.verified,
      skipped: result.skipped,
      errors: result.errors,
    });

    return NextResponse.json({
      success: true,
      results: {
        verified: result.verified,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
