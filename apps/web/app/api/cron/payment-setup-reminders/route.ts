import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { PaymentSetupNotificationService } from '@/lib/services/contractor/PaymentSetupNotificationService';
import { requireCronAuth } from '@/lib/cron-auth';

/**
 * Cron endpoint for sending payment setup reminders
 * Should be called daily
 */
export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

