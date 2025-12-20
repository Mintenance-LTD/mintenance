import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface EscrowStatus {
  status: string;
  blockingReasons: string[];
  nextAction: string | null;
  estimatedReleaseDate: Date | null;
  canRelease: boolean;
  adminHoldStatus: string;
  homeownerApproval: boolean;
  photoVerificationStatus: string | null;
  coolingOffEndsAt: Date | null;
  autoApprovalDate: Date | null;
}

/**
 * Service for real-time escrow status tracking and blocking reasons
 */
export class EscrowStatusService {
  /**
   * Get current status of an escrow transaction
   */
  static async getCurrentStatus(escrowId: string): Promise<EscrowStatus> {
    try {
      const { data: escrow, error } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          status,
          admin_hold_status,
          homeowner_approval,
          photo_verification_status,
          cooling_off_ends_at,
          auto_approval_date,
          release_blocked_reason,
          auto_release_date
        `
        )
        .eq('id', escrowId)
        .single();

      if (error || !escrow) {
        throw new Error('Escrow not found');
      }

      const blockingReasons = await this.getBlockingReasons(escrowId);
      const estimatedReleaseDate = await this.getEstimatedReleaseDate(escrowId);
      const canRelease = blockingReasons.length === 0 && escrow.status === 'held';

      return {
        status: escrow.status,
        blockingReasons,
        nextAction: this.determineNextAction(escrow, blockingReasons),
        estimatedReleaseDate,
        canRelease,
        adminHoldStatus: escrow.admin_hold_status || 'none',
        homeownerApproval: escrow.homeowner_approval || false,
        photoVerificationStatus: escrow.photo_verification_status,
        coolingOffEndsAt: escrow.cooling_off_ends_at ? new Date(escrow.cooling_off_ends_at) : null,
        autoApprovalDate: escrow.auto_approval_date ? new Date(escrow.auto_approval_date) : null,
      };
    } catch (error) {
      logger.error('Error getting escrow status', error, {
        service: 'EscrowStatusService',
        escrowId,
      });
      throw error;
    }
  }

  /**
   * Get blocking reasons for escrow release
   */
  static async getBlockingReasons(escrowId: string): Promise<string[]> {
    try {
      const { data: escrow, error } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          status,
          admin_hold_status,
          homeowner_approval,
          photo_verification_status,
          photo_quality_passed,
          geolocation_verified,
          timestamp_verified,
          cooling_off_ends_at,
          auto_approval_date,
          release_blocked_reason
        `
        )
        .eq('id', escrowId)
        .single();

      if (error || !escrow) {
        return ['Escrow not found'];
      }

      const reasons: string[] = [];

      // Check admin hold
      if (escrow.admin_hold_status === 'admin_hold' || escrow.admin_hold_status === 'pending_review') {
        reasons.push('Admin review pending');
      }

      if (escrow.admin_hold_status === 'admin_hold' && escrow.release_blocked_reason) {
        reasons.push(escrow.release_blocked_reason);
      }

      // Check homeowner approval
      if (!escrow.homeowner_approval) {
        const autoApprovalDate = escrow.auto_approval_date ? new Date(escrow.auto_approval_date) : null;
        if (!autoApprovalDate || autoApprovalDate > new Date()) {
          reasons.push('Waiting for homeowner approval');
        }
      }

      // Check photo verification
      if (escrow.photo_verification_status !== 'verified') {
        reasons.push('Photo verification pending or failed');
      }

      if (!escrow.photo_quality_passed) {
        reasons.push('Photo quality check failed');
      }

      if (!escrow.geolocation_verified) {
        reasons.push('Geolocation verification pending');
      }

      if (!escrow.timestamp_verified) {
        reasons.push('Timestamp verification pending');
      }

      // Check cooling-off period
      if (escrow.cooling_off_ends_at) {
        const coolingOffEnds = new Date(escrow.cooling_off_ends_at);
        if (coolingOffEnds > new Date()) {
          reasons.push(`Cooling-off period ends ${coolingOffEnds.toLocaleString()}`);
        }
      }

      // Check status
      if (escrow.status !== 'held' && escrow.status !== 'awaiting_homeowner_approval') {
        reasons.push(`Escrow status is ${escrow.status}`);
      }

      return reasons;
    } catch (error) {
      logger.error('Error getting blocking reasons', error, {
        service: 'EscrowStatusService',
        escrowId,
      });
      return ['Error checking status'];
    }
  }

  /**
   * Get estimated release date
   */
  static async getEstimatedReleaseDate(escrowId: string): Promise<Date | null> {
    try {
      const { data: escrow, error } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          auto_release_date,
          cooling_off_ends_at,
          auto_approval_date,
          admin_hold_status
        `
        )
        .eq('id', escrowId)
        .single();

      if (error || !escrow) {
        return null;
      }

      // If admin hold, no estimated date
      if (escrow.admin_hold_status === 'admin_hold') {
        return null;
      }

      // Use the latest of: auto_release_date, cooling_off_ends_at, auto_approval_date
      const dates: Date[] = [];

      if (escrow.auto_release_date) {
        dates.push(new Date(escrow.auto_release_date));
      }

      if (escrow.cooling_off_ends_at) {
        dates.push(new Date(escrow.cooling_off_ends_at));
      }

      if (escrow.auto_approval_date) {
        dates.push(new Date(escrow.auto_approval_date));
      }

      if (dates.length === 0) {
        return null;
      }

      return new Date(Math.max(...dates.map(d => d.getTime())));
    } catch (error) {
      logger.error('Error getting estimated release date', error, {
        service: 'EscrowStatusService',
        escrowId,
      });
      return null;
    }
  }

  /**
   * Update status log
   */
  static async updateStatusLog(
    escrowId: string,
    status: string,
    reason: string
  ): Promise<void> {
    try {
      const estimatedReleaseDate = await this.getEstimatedReleaseDate(escrowId);

      await serverSupabase.from('escrow_release_status_log').insert({
        escrow_transaction_id: escrowId,
        status,
        blocking_reason: reason,
        next_action: this.determineNextActionFromStatus(status),
        estimated_release_date: estimatedReleaseDate?.toISOString() || null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error updating status log', error, {
        service: 'EscrowStatusService',
        escrowId,
        status,
      });
    }
  }

  /**
   * Determine next action based on escrow state
   */
  private static determineNextAction(
    escrow: {
      admin_hold_status?: string;
      homeowner_approval?: boolean;
      photo_verification_status?: string;
      cooling_off_ends_at?: string;
    },
    blockingReasons: string[]
  ): string | null {
    if (blockingReasons.length === 0) {
      return 'Ready for release';
    }

    if (escrow.admin_hold_status === 'admin_hold') {
      return 'Waiting for admin approval';
    }

    if (!escrow.homeowner_approval) {
      return 'Waiting for homeowner approval';
    }

    if (escrow.photo_verification_status !== 'verified') {
      return 'Waiting for photo verification';
    }

    if (escrow.cooling_off_ends_at && new Date(escrow.cooling_off_ends_at) > new Date()) {
      return 'Cooling-off period active';
    }

    return blockingReasons[0] || 'Unknown';
  }

  /**
   * Determine next action from status
   */
  private static determineNextActionFromStatus(status: string): string {
    const actionMap: Record<string, string> = {
      'admin_hold': 'Waiting for admin review',
      'admin_review': 'Admin reviewing escrow',
      'awaiting_homeowner_approval': 'Waiting for homeowner approval',
      'cooling_off': 'Cooling-off period active',
      'held': 'Ready for release',
      'released': 'Released',
      'completed': 'Completed',
    };

    return actionMap[status] || 'Processing';
  }
}

