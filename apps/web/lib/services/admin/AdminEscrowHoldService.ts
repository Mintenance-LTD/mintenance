import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EscrowStatusService } from './EscrowStatusService';

export interface EscrowReview {
  id: string;
  escrowId: string;
  jobId: string;
  jobTitle: string;
  contractorId: string;
  contractorName: string;
  homeownerId: string;
  homeownerName: string;
  amount: number;
  adminHoldStatus: 'pending_review' | 'admin_hold' | 'admin_approved';
  adminHoldReason: string | null;
  adminHoldAt: string | null;
  adminHoldBy: string | null;
  photoVerificationStatus: string | null;
  homeownerApproval: boolean;
  createdAt: string;
}

export interface EscrowReviewDetails extends EscrowReview {
  beforePhotos: string[];
  afterPhotos: string[];
  photoVerificationScore: number | null;
  beforeAfterComparisonScore: number | null;
  geolocationVerified: boolean;
  timestampVerified: boolean;
  photoQualityPassed: boolean;
  homeownerApprovalHistory: Array<{
    action: string;
    comments: string | null;
    createdAt: string;
  }>;
  trustScore: number | null;
  releaseBlockedReason: string | null;
  estimatedReleaseDate: string | null;
}

/**
 * Service for admin escrow hold and review workflows
 */
export class AdminEscrowHoldService {
  /**
   * Hold escrow for admin review
   */
  static async holdEscrowForReview(
    escrowId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('escrow_transactions')
        .update({
          admin_hold_status: 'admin_hold',
          admin_hold_reason: reason,
          admin_hold_at: new Date().toISOString(),
          admin_hold_by: adminId,
          status: 'admin_hold',
          release_blocked_reason: `Admin hold: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      if (error) {
        throw new Error(`Failed to hold escrow: ${error.message}`);
      }

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'admin_hold',
        `Admin hold: ${reason}`
      );

      logger.info('Escrow held for admin review', {
        service: 'AdminEscrowHoldService',
        escrowId,
        adminId,
        reason,
      });
    } catch (error) {
      logger.error('Error holding escrow for review', error, {
        service: 'AdminEscrowHoldService',
        escrowId,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Admin approves escrow release
   */
  static async approveEscrowRelease(
    escrowId: string,
    adminId: string,
    notes?: string
  ): Promise<void> {
    try {
      // Get current escrow status
      const { data: escrow, error: fetchError } = await serverSupabase
        .from('escrow_transactions')
        .select('id, status, homeowner_approval, photo_verification_status')
        .eq('id', escrowId)
        .single();

      if (fetchError || !escrow) {
        throw new Error('Escrow not found');
      }

      // Update admin approval status
      const updateData: Record<string, any> = {
        admin_hold_status: 'admin_approved',
        admin_approved_at: new Date().toISOString(),
        admin_hold_by: adminId,
        updated_at: new Date().toISOString(),
      };

      // If homeowner has approved and photos are verified, can proceed to release
      if (escrow.homeowner_approval && escrow.photo_verification_status === 'verified') {
        // Update status to ready for release (will be handled by release flow)
        updateData.status = 'held'; // Back to held, ready for release
        updateData.release_blocked_reason = null;
      } else {
        // Still waiting for homeowner approval or photo verification
        updateData.status = 'admin_review';
        updateData.release_blocked_reason = 'Waiting for homeowner approval and photo verification';
      }

      const { error } = await serverSupabase
        .from('escrow_transactions')
        .update(updateData)
        .eq('id', escrowId);

      if (error) {
        throw new Error(`Failed to approve escrow: ${error.message}`);
      }

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'admin_approved',
        `Admin approved${notes ? `: ${notes}` : ''}`
      );

      logger.info('Escrow approved by admin', {
        service: 'AdminEscrowHoldService',
        escrowId,
        adminId,
        notes,
      });
    } catch (error) {
      logger.error('Error approving escrow release', error, {
        service: 'AdminEscrowHoldService',
        escrowId,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Admin rejects escrow release
   */
  static async rejectEscrowRelease(
    escrowId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('escrow_transactions')
        .update({
          admin_hold_status: 'admin_hold',
          admin_hold_reason: reason,
          admin_hold_at: new Date().toISOString(),
          admin_hold_by: adminId,
          status: 'admin_hold',
          release_blocked_reason: `Admin rejection: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      if (error) {
        throw new Error(`Failed to reject escrow: ${error.message}`);
      }

      // Log status change
      await EscrowStatusService.updateStatusLog(
        escrowId,
        'admin_hold',
        `Admin rejected: ${reason}`
      );

      logger.info('Escrow rejected by admin', {
        service: 'AdminEscrowHoldService',
        escrowId,
        adminId,
        reason,
      });
    } catch (error) {
      logger.error('Error rejecting escrow release', error, {
        service: 'AdminEscrowHoldService',
        escrowId,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Get escrows pending admin review
   */
  static async getPendingAdminReviews(limit: number = 50): Promise<EscrowReview[]> {
    try {
      const { data, error } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          job_id,
          payer_id,
          payee_id,
          amount,
          admin_hold_status,
          admin_hold_reason,
          admin_hold_at,
          admin_hold_by,
          photo_verification_status,
          homeowner_approval,
          created_at,
          jobs!inner (
            id,
            title,
            contractor_id,
            homeowner_id,
            contractor:users!jobs_contractor_id_fkey (
              id,
              first_name,
              last_name
            ),
            homeowner:users!jobs_homeowner_id_fkey (
              id,
              first_name,
              last_name
            )
          )
        `
        )
        .in('admin_hold_status', ['pending_review', 'admin_hold'])
        .order('admin_hold_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch pending reviews: ${error.message}`);
      }

      return (data || []).map((escrow: any) => {
        const job = escrow.jobs;
        const contractor = job?.contractor;
        const homeowner = job?.homeowner;

        return {
          id: escrow.id,
          escrowId: escrow.id,
          jobId: job?.id || '',
          jobTitle: job?.title || 'Unknown Job',
          contractorId: job?.contractor_id || '',
          contractorName: contractor
            ? `${contractor.first_name} ${contractor.last_name}`
            : 'Unknown',
          homeownerId: job?.homeowner_id || '',
          homeownerName: homeowner
            ? `${homeowner.first_name} ${homeowner.last_name}`
            : 'Unknown',
          amount: escrow.amount || 0,
          adminHoldStatus: escrow.admin_hold_status as 'pending_review' | 'admin_hold' | 'admin_approved',
          adminHoldReason: escrow.admin_hold_reason,
          adminHoldAt: escrow.admin_hold_at,
          adminHoldBy: escrow.admin_hold_by,
          photoVerificationStatus: escrow.photo_verification_status,
          homeownerApproval: escrow.homeowner_approval || false,
          createdAt: escrow.created_at,
        };
      });
    } catch (error) {
      logger.error('Error fetching pending admin reviews', error, {
        service: 'AdminEscrowHoldService',
      });
      throw error;
    }
  }

  /**
   * Get detailed review information for an escrow
   */
  static async getEscrowReviewDetails(escrowId: string): Promise<EscrowReviewDetails> {
    try {
      // Get escrow with all related data
      const { data: escrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          *,
          jobs!inner (
            id,
            title,
            contractor_id,
            homeowner_id,
            contractor:users!jobs_contractor_id_fkey (
              id,
              first_name,
              last_name
            ),
            homeowner:users!jobs_homeowner_id_fkey (
              id,
              first_name,
              last_name
            )
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        throw new Error('Escrow not found');
      }

      const job = (escrow as any).jobs;
      const contractor = job?.contractor;
      const homeowner = job?.homeowner;

      // Get before and after photos
      const { data: beforePhotos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job.id)
        .eq('photo_type', 'before');

      const { data: afterPhotos } = await serverSupabase
        .from('job_photos_metadata')
        .select('photo_url')
        .eq('job_id', job.id)
        .eq('photo_type', 'after');

      // Get homeowner approval history
      const { data: approvalHistory } = await serverSupabase
        .from('homeowner_approval_history')
        .select('action, comments, created_at')
        .eq('escrow_transaction_id', escrowId)
        .order('created_at', { ascending: false });

      // Get estimated release date
      const statusInfo = await EscrowStatusService.getCurrentStatus(escrowId);
      const estimatedReleaseDate = await EscrowStatusService.getEstimatedReleaseDate(escrowId);

      return {
        id: escrow.id,
        escrowId: escrow.id,
        jobId: job.id,
        jobTitle: job.title,
        contractorId: job.contractor_id,
        contractorName: contractor
          ? `${contractor.first_name} ${contractor.last_name}`
          : 'Unknown',
        homeownerId: job.homeowner_id,
        homeownerName: homeowner
          ? `${homeowner.first_name} ${homeowner.last_name}`
          : 'Unknown',
        amount: escrow.amount || 0,
        adminHoldStatus: escrow.admin_hold_status as 'pending_review' | 'admin_hold' | 'admin_approved',
        adminHoldReason: escrow.admin_hold_reason,
        adminHoldAt: escrow.admin_hold_at,
        adminHoldBy: escrow.admin_hold_by,
        photoVerificationStatus: escrow.photo_verification_status,
        homeownerApproval: escrow.homeowner_approval || false,
        createdAt: escrow.created_at,
        beforePhotos: (beforePhotos || []).map((p: any) => p.photo_url),
        afterPhotos: (afterPhotos || []).map((p: any) => p.photo_url),
        photoVerificationScore: escrow.photo_verification_score,
        beforeAfterComparisonScore: escrow.before_after_comparison_score,
        geolocationVerified: escrow.geolocation_verified || false,
        timestampVerified: escrow.timestamp_verified || false,
        photoQualityPassed: escrow.photo_quality_passed || false,
        homeownerApprovalHistory: (approvalHistory || []).map((h: any) => ({
          action: h.action,
          comments: h.comments,
          createdAt: h.created_at,
        })),
        trustScore: escrow.trust_score,
        releaseBlockedReason: escrow.release_blocked_reason,
        estimatedReleaseDate: estimatedReleaseDate?.toISOString() || null,
      };
    } catch (error) {
      logger.error('Error fetching escrow review details', error, {
        service: 'AdminEscrowHoldService',
        escrowId,
      });
      throw error;
    }
  }
}

