/**
 * Escrow auto-release notification helper.
 *
 * Extracted from EscrowAutoReleaseService to keep that file under the 500-line
 * pre-commit limit. Pure function — no class state, no stripe dependency.
 *
 * Audit 2026-04-16 P1 #7 (Event 10): 7-day auto-release was silent before;
 * both contractor and homeowner now receive push + email + in-app via
 * NotificationService.
 */

import { logger } from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

export interface AutoReleaseNotifyContext {
  escrowId: string;
  jobId: string;
  jobTitle: string;
  contractorId: string;
  homeownerId: string;
  contractorAmount: number;
  mode: 'direct' | 'accumulated';
}

/**
 * Fire-and-forget notification fan-out. Failures are swallowed; the transfer
 * has already been committed to Stripe and the DB, so a failed notification
 * MUST NOT cause a rollback.
 */
export async function notifyAutoRelease(
  ctx: AutoReleaseNotifyContext
): Promise<void> {
  try {
    const amount = `\u00a3${Number(ctx.contractorAmount).toLocaleString()}`;
    const jobTitle = ctx.jobTitle || 'your job';
    const contractorMessage =
      ctx.mode === 'accumulated'
        ? `${amount} for "${jobTitle}" has been released to your payout balance after the 7-day review window.`
        : `${amount} for "${jobTitle}" has been released to your Stripe account after the 7-day review window.`;

    await Promise.allSettled([
      NotificationService.createNotification({
        userId: ctx.contractorId,
        type: 'escrow_auto_released',
        title: 'Payment Released',
        message: contractorMessage,
        actionUrl: `/contractor/jobs/${ctx.jobId}`,
        metadata: {
          jobId: ctx.jobId,
          escrowId: ctx.escrowId,
          reason: 'auto_release_7day',
        },
      }),
      NotificationService.createNotification({
        userId: ctx.homeownerId,
        type: 'escrow_auto_released',
        title: 'Payment Auto-Released',
        message: `Payment for "${jobTitle}" was released to the contractor after the 7-day review window passed without a change request.`,
        actionUrl: `/jobs/${ctx.jobId}`,
        metadata: {
          jobId: ctx.jobId,
          escrowId: ctx.escrowId,
          reason: 'auto_release_7day',
        },
      }),
    ]);
  } catch (err) {
    logger.warn('Failed to send auto-release notifications (non-fatal)', {
      service: 'EscrowAutoReleaseService',
      escrowId: ctx.escrowId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
