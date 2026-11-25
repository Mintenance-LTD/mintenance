import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { countVerificationQueue } from '@/lib/admin/verification-queue';

/**
 * GET: Return count of contractors awaiting admin verification
 */
export const GET = withApiHandler({ roles: ['admin'] }, async () => {
  const count = await countVerificationQueue('ready');
  return NextResponse.json({ count });
});

/**
 * POST: Send pending verification notifications
 * Can be called manually by admin or scheduled via cron job
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    // 2026-05-01 audit follow-up: fires admin notifications for every
    // pending contractor verification. A stolen admin cookie could
    // trigger a notification storm. Require fresh MFA proof.
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'pending_verifications_notify',
      category: 'communication',
      targetType: 'verification',
      description: 'Sent pending-verification notifications',
    },
  },
  async () => {
    await AdminNotificationService.notifyPendingVerifications();

    return NextResponse.json({
      success: true,
      message: 'Pending verification notifications sent',
    });
  }
);
