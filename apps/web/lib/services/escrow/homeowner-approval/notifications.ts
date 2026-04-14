/**
 * Notification helpers for HomeownerApprovalService.
 *
 * Extracted so the main service stays under the 500-line limit. These are
 * pure side-effects with the same signature shape, just moved out of the
 * class into plain module functions. Errors are logged and swallowed — the
 * escrow state machine should not fail because a push notification did.
 */

import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';

const SERVICE = 'HomeownerApprovalService';
const AUTO_APPROVAL_DAYS = 7;

export async function sendApprovalRequestNotification(
  escrowId: string,
  homeownerId: string,
  photoUrls: string[]
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId: homeownerId,
      title: 'Review Completion Photos',
      message: `Please review the completion photos for your job. You have ${AUTO_APPROVAL_DAYS} days to approve or the payment will be automatically released.`,
      type: 'escrow_approval_request',
      metadata: {
        escrowId,
        photoUrls,
        autoApprovalDays: AUTO_APPROVAL_DAYS,
      },
    });
  } catch (error) {
    logger.error('Error sending approval request notification', error, {
      service: SERVICE,
      escrowId,
      homeownerId,
    });
  }
}

export async function sendApprovalNotification(
  escrowId: string,
  contractorId: string
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId: contractorId,
      title: 'Homeowner Approved Completion',
      message:
        'The homeowner has approved your completion photos. Funds will be released after a 48-hour cooling-off period.',
      type: 'escrow_approved',
      metadata: { escrowId },
    });
  } catch (error) {
    logger.error('Error sending approval notification', error, {
      service: SERVICE,
      escrowId,
      contractorId,
    });
  }
}

export async function sendRejectionNotification(
  escrowId: string,
  contractorId: string,
  reason: string
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId: contractorId,
      title: 'Homeowner Rejected Completion',
      message: `The homeowner has rejected your completion photos. Reason: ${reason}. An admin will review.`,
      type: 'escrow_rejected',
      metadata: { escrowId, reason },
    });
  } catch (error) {
    logger.error('Error sending rejection notification', error, {
      service: SERVICE,
      escrowId,
      contractorId,
    });
  }
}

export async function sendReminderNotification(
  escrowId: string,
  homeownerId: string,
  daysRemaining: number
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId: homeownerId,
      title: `Reminder: Review Completion Photos (${daysRemaining} days remaining)`,
      message: `You have ${daysRemaining} days to review and approve the completion photos. After ${daysRemaining} days, the payment will be automatically released.`,
      type: 'escrow_reminder',
      metadata: { escrowId, daysRemaining },
    });
  } catch (error) {
    logger.error('Error sending reminder notification', error, {
      service: SERVICE,
      escrowId,
      homeownerId,
    });
  }
}

export async function sendFinalWarningNotification(
  escrowId: string,
  homeownerId: string
): Promise<void> {
  try {
    await NotificationService.createNotification({
      userId: homeownerId,
      title: 'Final Warning: Auto-Approval Tomorrow',
      message:
        'If you do not review the completion photos by tomorrow, the payment will be automatically released.',
      type: 'escrow_final_warning',
      metadata: { escrowId },
    });
  } catch (error) {
    logger.error('Error sending final warning notification', error, {
      service: SERVICE,
      escrowId,
      homeownerId,
    });
  }
}
