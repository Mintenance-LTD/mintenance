import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
import { requireCronAuth } from '@/lib/cron-auth';
import { handleAPIError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Cron endpoint for sending homeowner approval reminders
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

        const job = escrow.jobs as unknown as { id: string; homeowner_id: string; title: string };
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

