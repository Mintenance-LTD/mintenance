import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';

/**
 * Cron endpoint for sending homeowner approval reminders
 * Should be called daily
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      logger.error('Error fetching escrows awaiting approval', {
        service: 'homeowner-approval-reminders',
        error: fetchError.message,
      });
      return NextResponse.json({ error: 'Failed to fetch escrows' }, { status: 500 });
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
    logger.error('Error in homeowner approval reminder cron', error, {
      service: 'homeowner-approval-reminders',
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

