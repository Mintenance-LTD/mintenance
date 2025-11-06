import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { logger } from '@mintenance/shared';

/**
 * Endpoint to send pending verification notifications
 * Can be called manually by admin or scheduled via cron job
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    // Allow both admin and service role (for cron jobs)
    if (user && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

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

