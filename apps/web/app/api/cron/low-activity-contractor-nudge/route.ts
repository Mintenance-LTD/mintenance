import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { LowActivityNudgeService } from '@/lib/services/contractor/LowActivityNudgeService';
import { requireCronAuth } from '@/lib/cron-auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { handleAPIError } from '@/lib/errors/api-error';

/**
 * Cron endpoint: nudge contractors who haven't placed a bid in 14+ days.
 * Runs daily at 09:00 UTC. Includes a 7-day per-contractor cooldown.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting — max 1 invocation per minute per IP
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
        }
      );
    }

    // Verify cron secret
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting low-activity contractor nudge processing', {
      service: 'low-activity-contractor-nudge',
    });

    const results = await LowActivityNudgeService.sendBatchNudges();

    logger.info('Low-activity contractor nudge processing completed', {
      service: 'low-activity-contractor-nudge',
      results,
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    logger.error('Error in low-activity contractor nudge cron', error, {
      service: 'low-activity-contractor-nudge',
    });
    return handleAPIError(error);
  }
}
