/**
 * Helper functions for the bid-accept route.
 * Extracted to keep route.ts focused on orchestration logic.
 */
import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { EmailService } from '@/lib/email-service';
import type { SupabaseClient } from '@supabase/supabase-js';

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
