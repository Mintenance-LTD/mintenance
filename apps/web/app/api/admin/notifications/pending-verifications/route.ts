import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * Endpoint to send pending verification notifications
 * Can be called manually by admin or scheduled via cron job
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    await AdminNotificationService.notifyPendingVerifications();

    return NextResponse.json({ 
      success: true,
      message: 'Pending verification notifications sent' 
    });
  } catch (error) {
    logger.error('Error sending pending verification notifications', error);
    return NextResponse.json({ 
      error: 'Failed to send notifications' 
    }, { status: 500 });
  }
}

