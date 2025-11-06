import { NextRequest, NextResponse } from 'next/server';
import { NoShowReminderService } from '@/lib/services/notifications/NoShowReminderService';
import { logger } from '@mintenance/shared';

// This endpoint should be called by a cron job (e.g., Vercel Cron, Supabase Cron)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for no-shows
    await NoShowReminderService.checkAndSendReminders();

    // Send pre-start reminders
    await NoShowReminderService.sendPreStartReminders();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in no-show reminders cron', error, {
      service: 'cron',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

