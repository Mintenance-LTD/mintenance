import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
import { requireCronAuth } from '@/lib/cron-auth';

/**
 * Cron endpoint for sending admin alerts for escrows pending review
 * Should be called daily
 */
export async function GET(request: NextRequest) {
  try {
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
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (adminError || !admins || admins.length === 0) {
      logger.warn('No admin users found', {
        service: 'admin-escrow-alerts',
      });
      return NextResponse.json({ error: 'No admins found' }, { status: 500 });
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
    logger.error('Error in admin escrow alert cron', error, {
      service: 'admin-escrow-alerts',
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

