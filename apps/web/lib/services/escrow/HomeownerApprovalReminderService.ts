/**
 * Homeowner Approval Reminder Service
 *
 * Extracted from cron/homeowner-approval-reminders route handler.
 * Sends reminders to homeowners with pending job completion approvals,
 * and auto-approves when the auto-approval window has passed.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { HomeownerApprovalService } from './HomeownerApprovalService';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

const AUTO_APPROVAL_DAYS = 7;
const REMINDER_THRESHOLD_DAYS = 3;

interface ReminderResults {
  checked: number;
  remindersSent: number;
  autoApproved: number;
  errors: number;
}

interface EscrowForReminder {
  id: string;
  job_id: string;
  auto_approval_date: string | null;
  homeowner_approval: boolean;
  jobs: { id: string; homeowner_id: string; title: string } | { id: string; homeowner_id: string; title: string }[];
}

// Helper to normalize Supabase join (can return object or array)
const getJob = (
  jobs: { id: string; homeowner_id: string; title: string } | { id: string; homeowner_id: string; title: string }[] | undefined
) => {
  if (!jobs) return undefined;
  return Array.isArray(jobs) ? jobs[0] : jobs;
};

export class HomeownerApprovalReminderService {
  /**
   * Process all pending approval reminders.
   * - Sends reminders for escrows approaching auto-approval date
   * - Auto-approves escrows past the auto-approval date
   */
  static async processPendingApprovalReminders(): Promise<ReminderResults> {
    const results: ReminderResults = {
      checked: 0,
      remindersSent: 0,
      autoApproved: 0,
      errors: 0,
    };

    const now = new Date();

    // Fetch escrows awaiting homeowner approval
    const { data: escrows, error } = await serverSupabase
      .from('escrow_transactions')
      .select(`
        id,
        job_id,
        auto_approval_date,
        homeowner_approval,
        jobs!inner (
          id,
          homeowner_id,
          title
        )
      `)
      .eq('status', 'awaiting_homeowner_approval')
      .eq('homeowner_approval', false)
      .not('auto_approval_date', 'is', null)
      .limit(100);

    if (error) {
      logger.error('Failed to fetch escrows for approval reminders', {
        service: 'HomeownerApprovalReminderService',
        error: error.message,
      });
      throw new Error(`Failed to fetch pending approvals: ${error.message}`);
    }

    if (!escrows || escrows.length === 0) {
      return results;
    }

    for (const escrow of escrows as unknown as EscrowForReminder[]) {
      results.checked++;
      const job = getJob(escrow.jobs);
      if (!job) continue;

      try {
        const autoApprovalDate = escrow.auto_approval_date
          ? new Date(escrow.auto_approval_date)
          : null;

        if (!autoApprovalDate) continue;

        const daysUntilAutoApproval = Math.ceil(
          (autoApprovalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilAutoApproval <= 0) {
          // Auto-approval window has passed — trigger auto-approval
          try {
            await HomeownerApprovalService.processAutoApproval(escrow.id);
            results.autoApproved++;
            logger.info('Escrow auto-approved', {
              service: 'HomeownerApprovalReminderService',
              escrowId: escrow.id,
              jobId: job.id,
            });
          } catch (approvalError) {
            logger.error('Failed to auto-approve escrow', approvalError, {
              service: 'HomeownerApprovalReminderService',
              escrowId: escrow.id,
            });
            results.errors++;
          }
        } else if (daysUntilAutoApproval <= REMINDER_THRESHOLD_DAYS) {
          // Approaching auto-approval — send reminder
          try {
            await NotificationService.createNotification({
              userId: job.homeowner_id,
              title: 'Approval Reminder',
              message: `Your job "${job.title}" is awaiting your approval. It will be auto-approved in ${daysUntilAutoApproval} day${daysUntilAutoApproval !== 1 ? 's' : ''}.`,
              type: 'approval_reminder',
              actionUrl: `/jobs/${job.id}`,
              metadata: {
                escrowId: escrow.id,
                jobId: job.id,
                daysUntilAutoApproval,
                autoApprovalDate: autoApprovalDate.toISOString(),
              },
            });
            results.remindersSent++;
          } catch (notifError) {
            logger.error('Failed to send approval reminder', notifError, {
              service: 'HomeownerApprovalReminderService',
              escrowId: escrow.id,
            });
            results.errors++;
          }
        }
      } catch (error) {
        logger.error('Error processing escrow approval reminder', error, {
          service: 'HomeownerApprovalReminderService',
          escrowId: escrow.id,
        });
        results.errors++;
      }
    }

    return results;
  }
}
