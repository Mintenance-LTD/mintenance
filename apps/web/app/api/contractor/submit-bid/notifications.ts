/**
 * Bid Notification Logic
 * 
 * Handles email and database notifications for bid submissions.
 * Extracted from route.ts to improve maintainability.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
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
export async function sendBidEmailNotification(
  homeowner: Homeowner,
  contractor: Contractor,
  job: Job,
  validatedData: SubmitBidInput
): Promise<void> {
  if (!homeowner.email) {
    return;
  }

  const contractorName = `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || contractor.email;
  const homeownerName = `${homeowner.first_name || ''} ${homeowner.last_name || ''}`.trim() || 'Valued Client';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
export async function createBidNotification(
  homeowner: Homeowner,
  contractor: Contractor,
  job: Job,
  validatedData: SubmitBidInput
): Promise<void> {
  try {
    logger.info('Creating notification for homeowner', {
      service: 'contractor',
      homeownerId: homeowner.id,
      jobId: validatedData.jobId,
      jobTitle: job.title,
      bidAmount: validatedData.bidAmount,
    });

    const contractorName = `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || contractor.email;

    const { error: notificationError } = await serverSupabase
      .from('notifications')
      .insert({
        user_id: homeowner.id,
        title: 'New Bid Received',
        message: `${contractorName} has submitted a bid of £${validatedData.bidAmount.toFixed(2)} for your job "${job.title}"`,
        type: 'bid_received',
        read: false,
        action_url: `/jobs/${validatedData.jobId}`,
        created_at: new Date().toISOString(),
      });

    if (notificationError) {
      logger.error('Failed to create bid notification', {
        service: 'contractor',
        homeownerId: homeowner.id,
        error: notificationError.message,
        errorDetails: notificationError,
      });
    } else {
      logger.info('Bid notification created for homeowner', {
        service: 'contractor',
        homeownerId: homeowner.id,
        jobId: validatedData.jobId,
      });
    }
  } catch (notificationError) {
    logger.error('Unexpected error creating notification', {
      service: 'contractor',
      homeownerId: homeowner.id,
      error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
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

