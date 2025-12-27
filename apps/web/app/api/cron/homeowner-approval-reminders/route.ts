import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';

/**
 * Cron endpoint for sending homeowner approval reminders
 * Should be called daily
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting homeowner approval reminder processing', {
      service: 'homeowner-approval-reminders',
    });

    const results = {
      processed: 0,
      remindersSent: 0,
      errors: 0,
    };

    // Get escrows awaiting homeowner approval
    const { data: escrows, error: fetchError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id,
        auto_approval_date,
        homeowner_approval,
        jobs!inner (
          id,
          homeowner_id,
          title
        )
      `
      )
      .eq('status', 'awaiting_homeowner_approval')
      .eq('homeowner_approval', false)
      .not('auto_approval_date', 'is', null)
      .limit(100);

    if (fetchError) {
      logger.error('Error fetching escrows awaiting approval', fetchError, {
        service: 'homeowner-approval-reminders',
      });
      throw new InternalServerError('Failed to fetch escrows');
    }

    if (!escrows || escrows.length === 0) {
      return NextResponse.json({
        success: true,
        results: { processed: 0, remindersSent: 0, errors: 0 },
      });
    }

    // Process each escrow
    for (const escrow of escrows) {
      try {
        results.processed++;

        const job = escrow.jobs as any;
        if (!job || !job.homeowner_id) {
          continue;
        }

        // Send reminder notifications
        await HomeownerApprovalService.sendReminderNotifications(escrow.id);
        results.remindersSent++;
      } catch (error) {
        logger.error('Error processing escrow reminder', error, {
          service: 'homeowner-approval-reminders',
          escrowId: escrow.id,
        });
        results.errors++;
      }
    }

    logger.info('Homeowner approval reminder processing completed', {
      service: 'homeowner-approval-reminders',
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

