/**
 * Helper functions for the bid-accept route.
 * Extracted to keep route.ts focused on orchestration logic.
 */
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Quote → Bid pipeline closure (2026-05-13)
// ---------------------------------------------------------------------------

/**
 * Closes the quote ↔ bid loop on the contractor's analytics dashboard.
 *
 * `submit-bid` already creates a `contractor_quotes` row + sets
 * `bids.quote_id` on the forward path (see
 * `app/api/contractor/submit-bid/quote-processor.ts`). The backward
 * path was never wired — accepted/rejected bids left their linked
 * quote stuck at `'sent'` forever, breaking the funnel stats on
 * /contractor/quotes (Accepted card always 0, Total Revenue
 * undercounted).
 *
 * This helper:
 *   - flips the accepted bid's `quote_id` → `accepted`
 *   - flips every losing bid's `quote_id` → `declined`
 *
 * All failures are swallowed — accept flow must not block on this.
 */
export async function syncLinkedQuoteStatuses(params: {
  acceptedBidId: string;
  jobId: string;
}): Promise<void> {
  const { acceptedBidId, jobId } = params;

  try {
    // Fetch every bid on this job that has a linked quote
    const { data: linkedBids, error } = await serverSupabase
      .from('bids')
      .select('id, quote_id, status')
      .eq('job_id', jobId)
      .not('quote_id', 'is', null);

    if (error || !linkedBids?.length) {
      if (error) {
        logger.warn('syncLinkedQuoteStatuses: bid lookup failed', {
          service: 'quotes',
          jobId,
          error: error.message,
        });
      }
      return;
    }

    // Group by target status
    const acceptedQuoteIds: string[] = [];
    const declinedQuoteIds: string[] = [];

    for (const b of linkedBids) {
      if (!b.quote_id) continue;
      if (b.id === acceptedBidId) {
        acceptedQuoteIds.push(b.quote_id);
      } else {
        declinedQuoteIds.push(b.quote_id);
      }
    }

    const updatedAt = new Date().toISOString();

    if (acceptedQuoteIds.length > 0) {
      const { error: acceptErr } = await serverSupabase
        .from('contractor_quotes')
        .update({ status: 'accepted', updated_at: updatedAt })
        .in('id', acceptedQuoteIds);
      if (acceptErr) {
        logger.warn('syncLinkedQuoteStatuses: accepted flip failed', {
          service: 'quotes',
          jobId,
          error: acceptErr.message,
        });
      }
    }

    if (declinedQuoteIds.length > 0) {
      const { error: declineErr } = await serverSupabase
        .from('contractor_quotes')
        .update({ status: 'declined', updated_at: updatedAt })
        .in('id', declinedQuoteIds);
      if (declineErr) {
        logger.warn('syncLinkedQuoteStatuses: declined flip failed', {
          service: 'quotes',
          jobId,
          error: declineErr.message,
        });
      }
    }

    logger.info('Linked quote statuses synced', {
      service: 'quotes',
      jobId,
      acceptedCount: acceptedQuoteIds.length,
      declinedCount: declinedQuoteIds.length,
    });
  } catch (err) {
    logger.error('syncLinkedQuoteStatuses unexpected error', err, {
      service: 'quotes',
      jobId,
    });
  }
}

// ---------------------------------------------------------------------------
// Notify contractor and homeowner about bid acceptance + send email
// ---------------------------------------------------------------------------

/**
 * Sends in-app notifications (contractor + homeowner) and a bid-accepted email
 * to the contractor. All failures are swallowed — this must not block the
 * primary accept flow.
 */
export async function sendBidAcceptedNotificationsAndEmail(params: {
  contractorId: string;
  homeownerId: string;
  bidId: string;
  jobId: string;
  jobTitle: string | undefined;
  bidAmount: number;
  userDb: SupabaseClient;
}): Promise<void> {
  const {
    contractorId,
    homeownerId,
    bidId,
    jobId,
    jobTitle,
    bidAmount,
    userDb,
  } = params;

  // Audit P2 (2026-05-10): hoisted out of the in-app try block so the
  // email-send block below can flip `email_sent = true` on the same
  // notifications row. Mirrors the pattern in /api/payments/confirm-intent
  // and /api/jobs/[id]/start.
  let contractorNotifId: string | null = null;

  // --- Contractor in-app notification ---
  try {
    logger.info('Creating notification for contractor', {
      service: 'jobs',
      contractorId,
      bidId,
      jobId,
      jobTitle,
      bidAmount,
    });

    const notificationId = await NotificationService.createNotification({
      userId: contractorId,
      title: 'Bid Accepted! 🎉',
      message: `Congratulations! Your bid of £${bidAmount.toLocaleString()} for "${jobTitle || 'the job'}" has been accepted. You can now contact the homeowner and create a contract.`,
      type: 'bid_accepted',
      actionUrl: `/contractor/jobs/${jobId}`,
    });

    if (!notificationId) {
      logger.error('Failed to create bid acceptance notification', {
        service: 'jobs',
        contractorId,
        bidId,
        jobId,
      });
    } else {
      contractorNotifId = notificationId;
      logger.info('Bid acceptance notification created successfully', {
        service: 'jobs',
        contractorId,
        bidId,
        jobId,
        notificationId,
      });
    }
  } catch (notificationError) {
    logger.error('Unexpected error creating notification', notificationError, {
      service: 'jobs',
      contractorId,
      bidId,
      jobId,
    });
  }

  // --- Bid accepted email to contractor ---
  try {
    const { data: contractorProfile } = await userDb
      .from('profiles')
      .select('email, first_name, last_name, company_name')
      .eq('id', contractorId)
      .single();

    const { data: homeownerProfile } = await userDb
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', homeownerId)
      .single();

    if (contractorProfile?.email) {
      const contractorName =
        contractorProfile.first_name && contractorProfile.last_name
          ? `${contractorProfile.first_name} ${contractorProfile.last_name}`
          : contractorProfile.company_name || 'Contractor';
      const homeownerName = homeownerProfile
        ? `${homeownerProfile.first_name || ''} ${homeownerProfile.last_name || ''}`.trim() ||
          'Homeowner'
        : 'Homeowner';

      const emailOk = await EmailService.sendBidAcceptedEmail(
        contractorProfile.email,
        {
          contractorName,
          homeownerName,
          jobTitle: jobTitle || 'Job',
          bidAmount,
          viewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/contractor/jobs/${jobId}`,
        }
      );
      if (emailOk && contractorNotifId) {
        await NotificationService.markEmailSent(contractorNotifId);
      }
    }
  } catch (emailError) {
    logger.error('Failed to send bid accepted email', emailError, {
      service: 'jobs',
      bidId,
      jobId,
    });
  }

  // --- Homeowner confirmation notification ---
  try {
    await NotificationService.createNotification({
      userId: homeownerId,
      title: 'Bid Accepted',
      message: `You accepted a bid of £${bidAmount.toLocaleString()} for "${jobTitle || 'your job'}". A contract has been created - review and sign it to proceed.`,
      type: 'bid_accepted',
      actionUrl: `/jobs/${jobId}`,
    });
  } catch (err) {
    logger.error(
      'Failed to create homeowner bid acceptance notification',
      err,
      { service: 'jobs', jobId }
    );
  }
}
