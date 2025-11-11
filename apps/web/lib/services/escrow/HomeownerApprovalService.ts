import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EscrowStatusService } from './EscrowStatusService';

const AUTO_APPROVAL_DAYS = 7;
const REMINDER_DAYS = 3;

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

      const job = (escrow as any).jobs;
      const homeownerId = job.homeowner_id;

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
      await this.sendApprovalRequestNotification(escrowId, homeownerId, photoUrls);

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

      const job = (escrow as any).jobs;
      if (job.homeowner_id !== homeownerId) {
        throw new Error('Unauthorized: Not the homeowner for this escrow');
      }

      // Get photo URLs for this escrow
      const { data: photos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job.id)
        .eq('photo_type', 'after');

      const photoUrls = (photos || []).map((p: any) => p.photo_url);

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
      await this.sendApprovalNotification(escrowId, job.contractor_id);

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

      const job = (escrow as any).jobs;
      if (job.homeowner_id !== homeownerId) {
        throw new Error('Unauthorized: Not the homeowner for this escrow');
      }

      // Get photo URLs
      const { data: photos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job.id)
        .eq('photo_type', 'after');

      const photoUrls = (photos || []).map((p: any) => p.photo_url);

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
      await this.sendRejectionNotification(escrowId, job.contractor_id, reason);

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

      const job = (escrow as any).jobs;
      const autoApprovalDate = escrow.auto_approval_date
        ? new Date(escrow.auto_approval_date)
        : null;

      if (!autoApprovalDate) {
        return; // No auto-approval date set
      }

      const now = new Date();
      const daysUntilAutoApproval = Math.ceil(
        (autoApprovalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminder if 3 days remaining
      if (daysUntilAutoApproval <= REMINDER_DAYS && daysUntilAutoApproval > 0) {
        await this.sendReminderNotification(escrowId, job.homeowner_id, daysUntilAutoApproval);
      }

      // Send final warning if 1 day remaining
      if (daysUntilAutoApproval === 1) {
        await this.sendFinalWarningNotification(escrowId, job.homeowner_id);
      }
    } catch (error) {
      logger.error('Error sending reminder notifications', error, {
        service: 'HomeownerApprovalService',
        escrowId,
      });
    }
  }

  /**
   * Check if escrow is eligible for auto-approval
   */
  static async checkAutoApprovalEligibility(escrowId: string): Promise<boolean> {
    try {
      const { data: escrow, error } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          homeowner_approval,
          auto_approval_date,
          photo_verification_status,
          photo_verification_score
        `
        )
        .eq('id', escrowId)
        .single();

      if (error || !escrow) {
        return false;
      }

      // Already approved
      if (escrow.homeowner_approval) {
        return false;
      }

      // Check if auto-approval date has passed
      const autoApprovalDate = escrow.auto_approval_date
        ? new Date(escrow.auto_approval_date)
        : null;

      if (!autoApprovalDate || autoApprovalDate > new Date()) {
        return false; // Not yet time for auto-approval
      }

      // Check if photos are verified
      if (escrow.photo_verification_status !== 'verified') {
        return false; // Photos not verified
      }

      // Check photo verification score
      const photoScore = escrow.photo_verification_score || 0;
      if (photoScore < 0.7) {
        return false; // Photo score too low
      }

      return true; // Eligible for auto-approval
    } catch (error) {
      logger.error('Error checking auto-approval eligibility', error, {
        service: 'HomeownerApprovalService',
        escrowId,
      });
      return false;
    }
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

      const job = (escrow as any).jobs;
      const homeownerId = job.homeowner_id;

      // Auto-approve
      await this.approveCompletion(escrowId, homeownerId, 'Auto-approved after 7 days (homeowner did not respond)');

      logger.info('Escrow auto-approved', {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
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

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Send approval request notification to homeowner
   */
  private static async sendApprovalRequestNotification(
    escrowId: string,
    homeownerId: string,
    photoUrls: string[]
  ): Promise<void> {
    try {
      await serverSupabase.from('notifications').insert({
        user_id: homeownerId,
        title: 'Review Completion Photos',
        message: `Please review the completion photos for your job. You have 7 days to approve or the payment will be automatically released.`,
        type: 'escrow_approval_request',
        metadata: {
          escrowId,
          photoUrls,
          autoApprovalDays: AUTO_APPROVAL_DAYS,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error sending approval request notification', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
      });
    }
  }

  /**
   * Send approval notification to contractor
   */
  private static async sendApprovalNotification(
    escrowId: string,
    contractorId: string
  ): Promise<void> {
    try {
      await serverSupabase.from('notifications').insert({
        user_id: contractorId,
        title: 'Homeowner Approved Completion',
        message: 'The homeowner has approved your completion photos. Funds will be released after a 48-hour cooling-off period.',
        type: 'escrow_approved',
        metadata: {
          escrowId,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error sending approval notification', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        contractorId,
      });
    }
  }

  /**
   * Send rejection notification
   */
  private static async sendRejectionNotification(
    escrowId: string,
    contractorId: string,
    reason: string
  ): Promise<void> {
    try {
      await serverSupabase.from('notifications').insert({
        user_id: contractorId,
        title: 'Homeowner Rejected Completion',
        message: `The homeowner has rejected your completion photos. Reason: ${reason}. An admin will review.`,
        type: 'escrow_rejected',
        metadata: {
          escrowId,
          reason,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error sending rejection notification', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        contractorId,
      });
    }
  }

  /**
   * Send reminder notification
   */
  private static async sendReminderNotification(
    escrowId: string,
    homeownerId: string,
    daysRemaining: number
  ): Promise<void> {
    try {
      await serverSupabase.from('notifications').insert({
        user_id: homeownerId,
        title: `Reminder: Review Completion Photos (${daysRemaining} days remaining)`,
        message: `You have ${daysRemaining} days to review and approve the completion photos. After ${daysRemaining} days, the payment will be automatically released.`,
        type: 'escrow_reminder',
        metadata: {
          escrowId,
          daysRemaining,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error sending reminder notification', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
      });
    }
  }

  /**
   * Send final warning notification
   */
  private static async sendFinalWarningNotification(
    escrowId: string,
    homeownerId: string
  ): Promise<void> {
    try {
      await serverSupabase.from('notifications').insert({
        user_id: homeownerId,
        title: 'Final Warning: Auto-Approval Tomorrow',
        message: 'If you do not review the completion photos by tomorrow, the payment will be automatically released.',
        type: 'escrow_final_warning',
        metadata: {
          escrowId,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error sending final warning notification', error, {
        service: 'HomeownerApprovalService',
        escrowId,
        homeownerId,
      });
    }
  }
}

