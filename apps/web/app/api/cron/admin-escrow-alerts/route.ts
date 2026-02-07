import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Cron endpoint for sending admin alerts for escrows pending review
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

    logger.info('Starting admin escrow alert processing', {
      service: 'admin-escrow-alerts',
    });

    const results = {
      processed: 0,
      alertsSent: 0,
      errors: 0,
    };

    // Get escrows pending admin review
    const pendingReviews = await AdminEscrowHoldService.getPendingAdminReviews(50);

    if (pendingReviews.length === 0) {
      return NextResponse.json({
        success: true,
        results: { processed: 0, alertsSent: 0, errors: 0 },
      });
    }

    // Get admin users
    const { data: admins, error: adminError } = await serverSupabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (adminError || !admins || admins.length === 0) {
      logger.warn('No admin users found', {
        service: 'admin-escrow-alerts',
      });
      throw new InternalServerError('No admins found');
    }

    // Send alerts to admins
    for (const admin of admins) {
      try {
        results.processed++;

        await serverSupabase.from('notifications').insert({
          user_id: admin.id,
          title: `Escrow Reviews Pending (${pendingReviews.length})`,
          message: `You have ${pendingReviews.length} escrow(s) pending admin review. Please review them in the admin dashboard.`,
          type: 'admin_alert',
          action_url: '/admin/escrow/reviews',
          metadata: {
            pendingCount: pendingReviews.length,
            escrowIds: pendingReviews.map((r) => r.escrowId),
          },
          created_at: new Date().toISOString(),
        });

        results.alertsSent++;
      } catch (error) {
        logger.error('Error sending admin alert', error, {
          service: 'admin-escrow-alerts',
          adminId: admin.id,
        });
        results.errors++;
      }
    }

    logger.info('Admin escrow alert processing completed', {
      service: 'admin-escrow-alerts',
      results,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

