/**
 * Notification Helper
 *
 * Centralized helper functions for creating notifications
 * Following Single Responsibility Principle - only handles notification creation logic
 */

import { NotificationService } from './NotificationService';
import { logger } from '@mintenance/shared';

interface JobStatusNotificationParams {
  jobId: string;
  jobTitle: string;
  oldStatus: string;
  newStatus: string;
  homeownerId: string;
  contractorId?: string | null;
}

interface PaymentNotificationParams {
  userId: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  transactionId?: string;
}

/**
 * Result of notifyJobStatusChange — maps each recipient kind to the
 * `notifications.id` that was created (or null when no row was
 * inserted because of user preferences / failure). Callers that also
 * send an email to the same recipient can pass the matching id to
 * `NotificationService.markEmailSent` after the email provider
 * accepts the message, closing the email_sent observability loop.
 *
 * Callers that don't care about the ids simply `await` and ignore
 * the return value — behaviour-preserving for every prior call site.
 */
export interface JobStatusNotificationIds {
  homeownerNotifId: string | null;
  contractorNotifId: string | null;
}

/**
 * Create notification for job status change.
 *
 * Return shape added 2026-04-20 so API routes can thread the
 * homeowner / contractor notification ids into their matching
 * EmailService calls and flip email_sent on success. See
 * /api/payments/confirm-intent for the pattern this enables.
 */
export async function notifyJobStatusChange(
  params: JobStatusNotificationParams
): Promise<JobStatusNotificationIds> {
  try {
    const { jobId, jobTitle, newStatus, homeownerId, contractorId } = params;

    // Determine notification recipients and messages based on status transition
    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      action_url: string;
    }> = [];

    switch (newStatus) {
      case 'assigned':
        // Job assigned to contractor (bid accepted)
        if (contractorId) {
          notifications.push({
            user_id: contractorId,
            title: 'Job Assigned to You! 🎉',
            message: `You've been assigned to "${jobTitle}". Contact the homeowner to discuss details.`,
            type: 'job_assigned',
            action_url: `/contractor/jobs/${jobId}`,
          });
        }
        // Notify homeowner that job is assigned
        notifications.push({
          user_id: homeownerId,
          title: 'Job Assigned',
          message: `Your job "${jobTitle}" has been assigned to a contractor.`,
          type: 'job_assigned',
          action_url: `/jobs/${jobId}`,
        });
        break;

      case 'in_progress':
        // Contractor started work
        if (contractorId) {
          notifications.push({
            user_id: contractorId,
            title: 'Job Started',
            message: `You've started work on "${jobTitle}". Keep the homeowner updated on progress.`,
            type: 'job_started',
            action_url: `/contractor/jobs/${jobId}`,
          });
        }
        // Notify homeowner that work has started
        notifications.push({
          user_id: homeownerId,
          title: 'Work Started',
          message: `Work has started on "${jobTitle}". Your contractor is now on the job.`,
          type: 'job_started',
          action_url: `/jobs/${jobId}`,
        });
        break;

      case 'cancelled':
        // Job cancelled - notify both parties
        if (contractorId) {
          notifications.push({
            user_id: contractorId,
            title: 'Job Cancelled',
            message: `The job "${jobTitle}" has been cancelled.`,
            type: 'job_cancelled',
            action_url: `/contractor/jobs/${jobId}`,
          });
        }
        notifications.push({
          user_id: homeownerId,
          title: 'Job Cancelled',
          message: `Your job "${jobTitle}" has been cancelled.`,
          type: 'job_cancelled',
          action_url: `/jobs/${jobId}`,
        });
        break;

      case 'completed':
        // Job completed - already handled in complete route, but we can add confirmation here
        notifications.push({
          user_id: homeownerId,
          title: 'Job Completed',
          message: `Work on "${jobTitle}" has been marked as completed. Please review and confirm.`,
          type: 'job_completed',
          action_url: `/jobs/${jobId}`,
        });
        break;

      default:
        // Generic status update
        if (contractorId) {
          notifications.push({
            user_id: contractorId,
            title: 'Job Status Updated',
            message: `The status of "${jobTitle}" has been updated to ${newStatus}.`,
            type: 'job_update',
            action_url: `/contractor/jobs/${jobId}`,
          });
        }
        notifications.push({
          user_id: homeownerId,
          title: 'Job Status Updated',
          message: `The status of "${jobTitle}" has been updated to ${newStatus}.`,
          type: 'job_update',
          action_url: `/jobs/${jobId}`,
        });
    }

    // Create all notifications. Track ids so the caller can flip
    // email_sent after its matching EmailService call.
    const ids: JobStatusNotificationIds = {
      homeownerNotifId: null,
      contractorNotifId: null,
    };
    for (const notification of notifications) {
      const id = await NotificationService.createNotification({
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.action_url,
      }).catch((error) => {
        logger.error('Failed to create job status notification', error, {
          service: 'NotificationHelper',
          jobId,
          userId: notification.user_id,
          status: newStatus,
        });
        return null;
      });
      if (notification.user_id === homeownerId) {
        ids.homeownerNotifId = id ?? null;
      } else if (contractorId && notification.user_id === contractorId) {
        ids.contractorNotifId = id ?? null;
      }
    }
    return ids;
  } catch (error) {
    logger.error('Error in notifyJobStatusChange', error, {
      service: 'NotificationHelper',
      jobId: params.jobId,
    });
    return { homeownerNotifId: null, contractorNotifId: null };
  }
}

/**
 * Create notification for payment events
 */
export async function notifyPaymentEvent(
  params: PaymentNotificationParams & {
    eventType: 'received' | 'released' | 'required' | 'failed';
  }
): Promise<void> {
  try {
    const { userId, jobId, jobTitle, amount, eventType, transactionId } =
      params;

    const formattedAmount = `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let title: string;
    let message: string;
    let type: string;
    let actionUrl: string;

    switch (eventType) {
      case 'received':
        title = 'Payment Received 💰';
        message = `You've received ${formattedAmount} for "${jobTitle}". Funds are held in escrow.`;
        type = 'payment_received';
        actionUrl = transactionId
          ? `/payments/${transactionId}`
          : `/jobs/${jobId}`;
        break;

      case 'released':
        title = 'Payment Released 🎉';
        message = `${formattedAmount} has been released from escrow for "${jobTitle}". Funds are now available.`;
        type = 'payment_released';
        actionUrl = transactionId
          ? `/payments/${transactionId}`
          : `/jobs/${jobId}`;
        break;

      case 'required':
        title = 'Payment Required';
        message = `Payment of ${formattedAmount} is required for "${jobTitle}". Please complete payment to proceed.`;
        type = 'payment_required';
        actionUrl = `/jobs/${jobId}/payment`;
        break;

      case 'failed':
        title = 'Payment Failed';
        message = `Payment of ${formattedAmount} for "${jobTitle}" failed. Please try again or contact support.`;
        type = 'payment_failed';
        actionUrl = `/jobs/${jobId}/payment`;
        break;

      default:
        return;
    }

    await NotificationService.createNotification({
      userId,
      type,
      title,
      message,
      actionUrl,
    }).catch((error) => {
      logger.error('Failed to create payment notification', error, {
        service: 'NotificationHelper',
        userId,
        jobId,
        eventType,
      });
    });
  } catch (error) {
    logger.error('Error in notifyPaymentEvent', error, {
      service: 'NotificationHelper',
      userId: params.userId,
      jobId: params.jobId,
    });
  }
}

/**
 * Create notification for job confirmation. Returns id (or null on failure)
 * so callers can pair with `NotificationService.markEmailSent` (P2 2026-05-10).
 */
export async function notifyJobConfirmed(
  jobId: string,
  jobTitle: string,
  contractorId: string
): Promise<string | null> {
  try {
    const id = await NotificationService.createNotification({
      userId: contractorId,
      type: 'job_confirmed',
      title: 'Job Confirmed ✅',
      message: `The homeowner has confirmed completion of "${jobTitle}". Payment release is being processed.`,
      actionUrl: `/contractor/jobs/${jobId}`,
    });
    if (!id) {
      logger.error('Failed to create job confirmed notification', null, {
        service: 'NotificationHelper',
        jobId,
        contractorId,
      });
    }
    return id;
  } catch (error) {
    logger.error('Error in notifyJobConfirmed', error, {
      service: 'NotificationHelper',
      jobId,
      contractorId,
    });
    return null;
  }
}
