import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EscrowStatusService } from './EscrowStatusService';
import {
  sendApprovalRequestNotification,
  sendRejectionNotification,
  sendReminderNotification,
  sendFinalWarningNotification,
} from './homeowner-approval/notifications';
import { checkAutoApprovalEligibility } from './homeowner-approval/auto-approval';
import { commitCompletionApproval } from './homeowner-approval/commit-approval';
import { logAuditEvent } from '@/lib/audit';
import { ConflictError } from '@/lib/errors/api-error';

const AUTO_APPROVAL_DAYS = 7;
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

interface PhotoMetadata {
  photo_url: string;
}

/**
 * Service for homeowner approval workflow with auto-approval and reminders
 */
export class HomeownerApprovalService {
  /**
   * Request homeowner approval for completion photos
   */
  static async requestHomeownerApproval(
    escrowId: string,
    photoUrls: string[]
  ): Promise<void> {
    try {
      // Get escrow and job details
      const { data: escrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          job_id,
          status,
          jobs!inner (
            id,
            homeowner_id,
            payer_user_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new Error('Escrow not found');
      }

      const typedEscrow = escrow as EscrowWithJob;
      // Verification retries must not restart the homeowner's deadline or
      // send duplicate approval requests once the workflow is already open.
      if (typedEscrow.status === 'awaiting_homeowner_approval') {
        return;
      }
      if (typedEscrow.status !== 'held') {
        throw new ConflictError(
          'Escrow is no longer available to request homeowner approval'
        );
      }
      const job = getJob(typedEscrow.jobs);
      const homeownerId = job?.homeowner_id;

      if (!homeownerId) {
        throw new Error('Homeowner not found');
      }

      // Calculate auto-approval date (7 days from now)
      const autoApprovalDate = new Date();
      autoApprovalDate.setDate(autoApprovalDate.getDate() + AUTO_APPROVAL_DAYS);

      // Update escrow status
      const { data: requestedEscrow, error: requestUpdateError } =
        await serverSupabase
          .from('escrow_transactions')
          .update({
            status: 'awaiting_homeowner_approval',
            auto_approval_date: autoApprovalDate.toISOString(),
            release_blocked_reason: 'Waiting for homeowner approval',
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowId)
          .eq('status', 'held')
          .select('id')
          .maybeSingle();

      if (requestUpdateError || !requestedEscrow) {
        throw new ConflictError(
          'Escrow was modified while requesting homeowner approval'
        );
      }

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'awaiting_homeowner_approval',
        'Homeowner approval requested'
      );

      // Send notification to homeowner
      await sendApprovalRequestNotification(escrowId, homeownerId, photoUrls);

      logger.info('Homeowner approval requested', {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
        autoApprovalDate: autoApprovalDate.toISOString(),
      });
    } catch (error) {
      logger.error('Error requesting homeowner approval', error, {
        service: 'HomeownerApprovalService',
        escrowId,
      });
      throw error;
    }
  }

  /** Approve the current completion, with the decision and evidence committed together. */
  static async approveCompletion(
    escrowId: string,
    homeownerId: string,
    comments?: string,
    options: { internal?: boolean; waiveCoolingOff?: boolean } = {}
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
      completedAt: job.completed_at,
      escrowId,
      comments,
      automatic: options.internal,
      waiveCoolingOff: options.waiveCoolingOff,
    });
  }

  /**
   * Homeowner rejects completion
   */
  static async rejectCompletion(
    escrowId: string,
    homeownerId: string,
    reason: string
  ): Promise<void> {
    try {
      // Verify homeowner has permission
      const { data: escrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          job_id,
          jobs!inner (
            id,
            homeowner_id,
            payer_user_id,
            contractor_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new Error('Escrow not found');
      }

      const typedEscrow = escrow as EscrowWithJob & {
        jobs: JobInfo & { contractor_id: string };
      };
      const job = getJob(typedEscrow.jobs) as
        | (JobInfo & { contractor_id: string })
        | undefined;
      if (
        job?.homeowner_id !== homeownerId &&
        job?.payer_user_id !== homeownerId
      ) {
        throw new Error('Unauthorized: Not the homeowner for this escrow');
      }

      // Get photo URLs
      const { data: photos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job?.id || '')
        .eq('photo_type', 'after');

      const photoUrls = (photos || []).map((p: PhotoMetadata) => p.photo_url);

      // Claim the rejection before writing history. The compare-and-swap
      // prevents a concurrent approval, release, or prior rejection from
      // changing the payment decision after this request was read.
      const { data: rejectedEscrow, error: rejectionUpdateError } =
        await serverSupabase
          .from('escrow_transactions')
          .update({
            homeowner_approval: false,
            admin_hold_status: 'pending_review',
            release_blocked_reason: `Homeowner rejected: ${reason}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', escrowId)
          .in('status', ['awaiting_homeowner_approval', 'held'])
          .or('homeowner_approval.eq.false,homeowner_approval.is.null')
          .select('id')
          .maybeSingle();

      if (rejectionUpdateError || !rejectedEscrow) {
        throw new ConflictError(
          'This escrow has already been decided or is no longer awaiting homeowner approval.'
        );
      }

      // Record rejection in history after the state claim succeeds.
      const { error: rejectionHistoryError } = await serverSupabase
        .from('homeowner_approval_history')
        .insert({
          escrow_transaction_id: escrowId,
          homeowner_id: homeownerId,
          action: 'rejected',
          comments: reason,
          photos_reviewed: photoUrls,
          created_at: new Date().toISOString(),
        });

      if (rejectionHistoryError) {
        logger.error('Rejection state committed but history insert failed', {
          service: 'HomeownerApprovalService',
          escrowId,
          homeownerId,
          error: rejectionHistoryError.message,
        });
        throw new Error('Rejection history could not be recorded');
      }

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'admin_review',
        `Homeowner rejected: ${reason}`
      );

      // Send notification to contractor and admin
      await sendRejectionNotification(escrowId, job.contractor_id, reason);

      // Sprint 5.7: central audit log for rejection decisions
      await logAuditEvent({
        actorId: homeownerId,
        category: 'escrow_decision',
        action: 'reject_completion',
        targetId: escrowId,
        before: { admin_hold_status: 'none' },
        after: {
          admin_hold_status: 'pending_review',
          reason,
          job_id: job.id,
        },
      });

      logger.info('Homeowner rejected completion', {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
        reason,
      });
    } catch (error) {
      logger.error('Error rejecting completion', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
      });
      throw error;
    }
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
