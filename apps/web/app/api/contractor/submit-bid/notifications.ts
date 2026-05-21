/**
 * Bid Notification Logic
 *
 * Handles email and database notifications for bid submissions.
 * Extracted from route.ts to improve maintainability.
 */

import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { getAppUrl } from '@/lib/env';
import type { SubmitBidInput } from './validation';

interface Homeowner {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface Job {
  id: string;
  title: string;
  homeowner_id: string;
  homeowner?: Homeowner | Homeowner[];
}

interface Contractor {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Send email notification to homeowner about new bid
 */
async function sendBidEmailNotification(
  homeowner: Homeowner,
  contractor: Contractor,
  job: Job,
  validatedData: SubmitBidInput
): Promise<void> {
  if (!homeowner.email) {
    return;
  }

  // Build contractor name — fall back to profile DB lookup if JWT has no name
  let contractorName =
    `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim();
  if (!contractorName) {
    try {
      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      const { data: profile } = await serverSupabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('id', contractor.id)
        .single();
      contractorName =
        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
        profile?.company_name ||
        contractor.email;
    } catch {
      contractorName = contractor.email;
    }
  }
  const homeownerName =
    `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() ||
    'Valued Client';
  const baseUrl = getAppUrl();
  const proposalExcerpt = validatedData.proposalText.substring(0, 150);

  await EmailService.sendBidNotification(homeowner.email, {
    homeownerName,
    contractorName,
    jobTitle: job.title,
    bidAmount: validatedData.bidAmount,
    proposalExcerpt,
    viewUrl: `${baseUrl}/jobs/${validatedData.jobId}`,
  }).catch((error) => {
    logger.error('Failed to send bid notification email', {
      service: 'contractor',
      homeownerId: homeowner.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}

/**
 * Create database notification for homeowner
 */
async function createBidNotification(
  homeowner: Homeowner,
  contractor: Contractor,
  job: Job,
  validatedData: SubmitBidInput
): Promise<void> {
  try {
    const contractorName =
      `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() ||
      contractor.email;

    // 2026-05-21 Mint Editorial voice: contractor + amount + job in the
    // title; body is the contractor's note (canonical bid-received
    // copy from the design bundle).
    const fmtAmount = `£${validatedData.bidAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    await NotificationService.createNotification({
      userId: homeowner.id,
      title: `${contractorName} bid ${fmtAmount} on ${job.title}`,
      message: `Tap to compare bids and read their note.`,
      type: 'bid_received',
      actionUrl: `/jobs/${validatedData.jobId}`,
    });

    logger.info('Bid notification created for homeowner (DB + push)', {
      service: 'contractor',
      homeownerId: homeowner.id,
      jobId: validatedData.jobId,
    });
  } catch (notificationError) {
    logger.error('Failed to create bid notification', {
      service: 'contractor',
      homeownerId: homeowner.id,
      error:
        notificationError instanceof Error
          ? notificationError.message
          : 'Unknown error',
    });
  }
}

/**
 * Send all notifications for a new bid
 */
export async function sendBidNotifications(
  homeowner: Homeowner | Homeowner[] | null | undefined,
  contractor: Contractor,
  job: Job,
  validatedData: SubmitBidInput,
  isUpdate: boolean
): Promise<void> {
  // Only send notifications for new bids, not updates
  if (isUpdate || !homeowner) {
    return;
  }

  const homeownerData = Array.isArray(homeowner) ? homeowner[0] : homeowner;

  if (!homeownerData?.email) {
    return;
  }

  // Send email notification
  await sendBidEmailNotification(homeownerData, contractor, job, validatedData);

  // Create database notification
  await createBidNotification(homeownerData, contractor, job, validatedData);
}
