import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EscrowStatusService } from './EscrowStatusService';
import {
  sendApprovalRequestNotification,
  sendApprovalNotification,
  sendRejectionNotification,
  sendReminderNotification,
  sendFinalWarningNotification,
} from './homeowner-approval/notifications';
import { checkAutoApprovalEligibility } from './homeowner-approval/auto-approval';

const AUTO_APPROVAL_DAYS = 7;
const REMINDER_DAYS = 3;

// Type definitions for escrow queries
interface JobInfo {
  id: string;
  homeowner_id: string;
  contractor_id?: string;
}

interface EscrowWithJob {
  id: string;
  job_id: string;
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
          jobs!inner (
            id,
            homeowner_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new Error('Escrow not found');
      }

      const typedEscrow = escrow as EscrowWithJob;
      const job = getJob(typedEscrow.jobs);
      const homeownerId = job?.homeowner_id;

      if (!homeownerId) {
        throw new Error('Homeowner not found');
      }

      // Calculate auto-approval date (7 days from now)
      const autoApprovalDate = new Date();
      autoApprovalDate.setDate(autoApprovalDate.getDate() + AUTO_APPROVAL_DAYS);

      // Update escrow status
      await serverSupabase
        .from('escrow_transactions')
        .update({
          status: 'awaiting_homeowner_approval',
          auto_approval_date: autoApprovalDate.toISOString(),
          release_blocked_reason: 'Waiting for homeowner approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

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

  /**
   * Homeowner approves completion
   */
  static async approveCompletion(
    escrowId: string,
    homeownerId: string,
    comments?: string
  ): Promise<void> {
    try {
      // Verify homeowner has permission
      const { data: escrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          job_id,
          homeowner_approval,
          jobs!inner (
            id,
            homeowner_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new Error('Escrow not found');
      }

      const typedEscrow = escrow as EscrowWithJob;
      const job = getJob(typedEscrow.jobs);
      if (!job || job.homeowner_id !== homeownerId) {
        throw new Error('Unauthorized: Not the homeowner for this escrow');
      }

      // Get photo URLs for this escrow
      const { data: photos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job.id)
        .eq('photo_type', 'after');

      const photoUrls = (photos || []).map((p: PhotoMetadata) => p.photo_url);

      // Record approval in history
      await serverSupabase.from('homeowner_approval_history').insert({
        escrow_transaction_id: escrowId,
        homeowner_id: homeownerId,
        action: 'approved',
        comments: comments || null,
        photos_reviewed: photoUrls,
        created_at: new Date().toISOString(),
      });

      // Calculate cooling-off period end (48 hours from now)
      const coolingOffEndsAt = new Date();
      coolingOffEndsAt.setHours(coolingOffEndsAt.getHours() + 48);

      // Update escrow
      await serverSupabase
        .from('escrow_transactions')
        .update({
          homeowner_approval: true,
          homeowner_approval_at: new Date().toISOString(),
          cooling_off_ends_at: coolingOffEndsAt.toISOString(),
          auto_approval_date: null, // Clear auto-approval date
          release_blocked_reason: 'Cooling-off period active (48 hours)',
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'cooling_off',
        `Homeowner approved${comments ? `: ${comments}` : ''}`
      );

      // Send notification to contractor
      if (job.contractor_id) {
        await sendApprovalNotification(escrowId, job.contractor_id);
      }

      logger.info('Homeowner approved completion', {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
        comments,
      });
    } catch (error) {
      logger.error('Error approving completion', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
      });
      throw error;
    }
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
      if (job?.homeowner_id !== homeownerId) {
        throw new Error('Unauthorized: Not the homeowner for this escrow');
      }

      // Get photo URLs
      const { data: photos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job?.id || '')
        .eq('photo_type', 'after');

      const photoUrls = (photos || []).map((p: PhotoMetadata) => p.photo_url);

      // Record rejection in history
      await serverSupabase.from('homeowner_approval_history').insert({
        escrow_transaction_id: escrowId,
        homeowner_id: homeownerId,
        action: 'rejected',
        comments: reason,
        photos_reviewed: photoUrls,
        created_at: new Date().toISOString(),
      });

      // Update escrow - set status to admin review
      await serverSupabase
        .from('escrow_transactions')
        .update({
          homeowner_approval: false,
          admin_hold_status: 'pending_review',
          release_blocked_reason: `Homeowner rejected: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'admin_review',
        `Homeowner rejected: ${reason}`
      );

      // Send notification to contractor and admin
      await sendRejectionNotification(escrowId, job.contractor_id, reason);

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
            homeowner_id
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
      const homeownerId = job?.homeowner_id;

      if (!homeownerId) {
        return false;
      }

      // Auto-approve (safety net, NOT homeowner consent). Logged with a
      // distinct reason string so ops + audit log queries can distinguish
      // the 7-day timeout path from explicit homeowner approval.
      await this.approveCompletion(
        escrowId,
        homeownerId,
        'auto_approved_7d_timeout: homeowner did not respond within the 7-day safety-net window'
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
