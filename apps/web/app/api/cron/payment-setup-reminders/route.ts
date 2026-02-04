import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { requireCronAuth } from '@/lib/cron-auth';
import { rateLimiter } from '@/lib/rate-limiter';
import { handleAPIError } from '@/lib/errors/api-error';

/**
 * Cron endpoint for sending payment setup reminders
 * Should be called daily
 */
export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 1
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
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Verify cron secret
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting payment setup reminder processing', {
      service: 'payment-setup-reminders',
    });

    const results = await PaymentSetupNotificationService.sendBatchNotifications();

    logger.info('Payment setup reminder processing completed', {
      service: 'payment-setup-reminders',
      results,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Error in payment setup reminder cron', error, {
      service: 'payment-setup-reminders',
    });
    // SECURITY: Use centralized error handler (sanitizes all errors)
    return handleAPIError(error);
  }
}

