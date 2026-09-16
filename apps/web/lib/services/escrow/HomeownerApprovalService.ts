import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  sendReminderNotification,
  sendFinalWarningNotification,
} from './homeowner-approval/notifications';
import { checkAutoApprovalEligibility } from './homeowner-approval/auto-approval';
import { commitCompletionApproval } from './homeowner-approval/commit-approval';
import { recordCompletionReview } from './homeowner-approval/record-review';

const REMINDER_DAYS = 3;

// Type definitions for escrow queries
interface JobInfo {
  id: string;
  homeowner_id: string;
  payer_user_id?: string | null;
  contractor_id?: string;
}

interface EscrowWithJob {
  id: string;
  job_id: string;
  status?: string;
  homeowner_approval?: boolean;
  auto_approval_date?: string;
  jobs: JobInfo | JobInfo[];
}

// Helper to normalize jobs (Supabase can return object or array)
const getJob = (jobs: JobInfo | JobInfo[] | undefined): JobInfo | undefined => {
  if (!jobs) return undefined;
  return Array.isArray(jobs) ? jobs[0] : jobs;
};

/**
 * Service for homeowner approval workflow with auto-approval and reminders
 */
export class HomeownerApprovalService {
  /** Open review only for the completion version whose photos were verified. */
  static async requestHomeownerApproval(
    escrowId: string,
    actorId: string,
    completedAt: string | null
  ): Promise<void> {
    await recordCompletionReview({
      escrowId,
      actorId,
      completedAt,
      action: 'request',
    });
  }

  /** Approve the current completion, with the decision and evidence committed together. */
  static async approveCompletion(
    escrowId: string,
    homeownerId: string,
    comments?: string,
    options: {
      internal?: boolean;
      waiveCoolingOff?: boolean;
      completedAt?: string | null;
    } = {}
  ): Promise<void> {
    const { data: escrow, error } = await serverSupabase
      .from('escrow_transactions')
      .select('job_id, jobs!inner(id, completed_at)')
      .eq('id', escrowId)
      .single();
    if (error || !escrow) throw new Error('Escrow not found');
    const joined = escrow.jobs as unknown as
      | { id: string; completed_at: string | null }
      | { id: string; completed_at: string | null }[];
    const job = Array.isArray(joined) ? joined[0] : joined;
    if (!job) throw new Error('Job not found');
    await commitCompletionApproval({
      jobId: job.id,
      actorId: homeownerId,
      completedAt:
        options.completedAt === undefined
          ? job.completed_at
          : options.completedAt,
      escrowId,
      comments,
      automatic: options.internal,
      waiveCoolingOff: options.waiveCoolingOff,
    });
  }

  /** Persist rejection, payment hold, history and notification together. */
  static async rejectCompletion(
    escrowId: string,
    homeownerId: string,
    reason: string,
    completedAt?: string | null
  ): Promise<void> {
    await recordCompletionReview({
      escrowId,
      actorId: homeownerId,
      reason,
      completedAt,
      action: 'reject',
    });
  }

  /**
   * Send reminder notifications to homeowner
   */
  static async sendReminderNotifications(escrowId: string): Promise<void> {
    try {
      const { data: escrow, error } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          auto_approval_date,
          homeowner_approval,
          jobs!inner (
            id,
            homeowner_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (error || !escrow || escrow.homeowner_approval) {
        return; // Already approved or not found
      }

      const typedEscrow = escrow as EscrowWithJob;
      const job = getJob(typedEscrow.jobs);
      const autoApprovalDate = escrow.auto_approval_date
        ? new Date(escrow.auto_approval_date)
        : null;

      if (!autoApprovalDate || !job) {
        return; // No auto-approval date set or job not found
      }

      const now = new Date();
      const daysUntilAutoApproval = Math.ceil(
        (autoApprovalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminder if 3 days remaining
      if (daysUntilAutoApproval <= REMINDER_DAYS && daysUntilAutoApproval > 0) {
        await sendReminderNotification(
          escrowId,
          job.homeowner_id,
          daysUntilAutoApproval
        );
      }

      // Send final warning if 1 day remaining
      if (daysUntilAutoApproval === 1) {
        await sendFinalWarningNotification(escrowId, job.homeowner_id);
      }
    } catch (error) {
      logger.error('Error sending reminder notifications', error, {
        service: 'HomeownerApprovalService',
        escrowId,
      });
    }
  }

  /**
   * Check if escrow is eligible for auto-approval.
   * Delegates to ./homeowner-approval/auto-approval.ts — see LFC-P0-1.
   */
  static async checkAutoApprovalEligibility(
    escrowId: string
  ): Promise<boolean> {
    return checkAutoApprovalEligibility(escrowId);
  }

  /**
   * Auto-approve if eligible
   */
  static async processAutoApproval(escrowId: string): Promise<boolean> {
    try {
      const eligible = await this.checkAutoApprovalEligibility(escrowId);
      if (!eligible) {
        return false;
      }

      // Get homeowner ID
      const { data: escrow } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          jobs!inner (
            id,
            homeowner_id,
            payer_user_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (!escrow) {
        return false;
      }

      const typedEscrow = escrow as EscrowWithJob;
      const job = getJob(typedEscrow.jobs);
      const homeownerId = job?.payer_user_id ?? job?.homeowner_id;

      if (!homeownerId) {
        return false;
      }

      // The transaction rechecks the deadline, score, current completion and
      // fresh verified evidence; this preflight cannot authorize a stale decision.
      await this.approveCompletion(
        escrowId,
        homeownerId,
        'auto_approved_7d_timeout: homeowner did not respond within the 7-day safety-net window',
        { internal: true }
      );

      logger.info('Escrow auto-approved via 7-day safety net', {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
        reason: 'auto_approved_7d_timeout',
      });

      return true;
    } catch (error) {
      logger.error('Error processing auto-approval', error, {
        service: 'HomeownerApprovalService',
        escrowId,
      });
      return false;
    }
  }

  // Private notification helpers extracted to ./homeowner-approval/notifications.ts
}
