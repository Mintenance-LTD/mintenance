import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { requireCronAuth } from '@/lib/cron-auth';
import { AdminAlertService } from '@/lib/services/admin/AdminAlertService';
import { handleAPIError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Cron endpoint for generating smart admin alerts.
 * Checks for conditions needing admin attention:
 * - Overdue escrows (held > 14 days)
 * - Unverified contractors (registered > 7 days)
 * - High-value payments (> GBP 5,000)
 * - Stale jobs (assigned > 30 days, no progress)
 * - Failed payments (> 3 failures per user in 24h)
 *
 * Recommended schedule: every 6 hours
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

    logger.info('Starting admin alerts cron', {
      service: 'admin-alerts',
    });

    const result = await AdminAlertService.generateAlerts();

    logger.info('Admin alerts cron completed', {
      service: 'admin-alerts',
      created: result.created,
      skipped: result.skipped,
    });

    return NextResponse.json({
      success: true,
      results: {
        created: result.created,
        skipped: result.skipped,
        alertTypes: result.alerts.map((a) => a.type),
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
