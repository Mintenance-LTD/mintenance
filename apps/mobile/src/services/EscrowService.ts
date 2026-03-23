/**
 * Escrow Service for Mobile App
 * Handles escrow status tracking, homeowner approval, and admin review requests
 * Read operations use direct Supabase queries; writes use mobileApiClient for server-side orchestration.
 */

import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import { parseError, getUserFriendlyMessage } from '@mintenance/api-client';

export interface EscrowStatus {
  id: string;
  status: string;
  amount: number;
  jobId: string;
  blockingReasons: string[];
  estimatedReleaseDate: string | null;
  homeownerApproval: boolean;
  homeownerApprovalAt: string | null;
  autoApprovalDate: string | null;
  adminHoldStatus: string | null;
  photoVerificationStatus: string;
  coolingOffEndsAt: string | null;
  trustScore: number | null;
}

export interface EscrowTimeline {
  escrowId: string;
  currentStatus: string;
  blockingReasons: string[];
  estimatedReleaseDate: string | null;
  steps: {
    step: string;
    status: 'completed' | 'pending' | 'blocked';
    completedAt: string | null;
    blockedReason: string | null;
  }[];
}

export class EscrowService {
  /**
   * Get escrow status for a specific escrow transaction via direct Supabase query
   */
  static async getEscrowStatus(escrowId: string): Promise<EscrowStatus> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (error) {
        logger.error('Error fetching escrow status', {
          error: error.message,
          escrowId,
        });
        throw new Error(error.message);
      }

      const row = data as Record<string, unknown>;
      return {
        id: row.id as string,
        status: row.status as string,
        amount: row.amount as number,
        jobId: row.job_id as string,
        blockingReasons: (row.blocking_reasons as string[]) ?? [],
        estimatedReleaseDate: (row.estimated_release_date as string) ?? null,
        homeownerApproval: (row.homeowner_approval as boolean) ?? false,
        homeownerApprovalAt: (row.homeowner_approval_at as string) ?? null,
        autoApprovalDate: (row.auto_approval_date as string) ?? null,
        adminHoldStatus: (row.admin_hold_status as string) ?? null,
        photoVerificationStatus:
          (row.photo_verification_status as string) ?? 'pending',
        coolingOffEndsAt: (row.cooling_off_ends_at as string) ?? null,
        trustScore: (row.trust_score as number) ?? null,
      };
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching escrow status', {
        error: apiError,
        escrowId,
      });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get escrow release timeline and blockers via direct Supabase query
   */
  static async getEscrowTimeline(escrowId: string): Promise<EscrowTimeline> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (error) {
        logger.error('Error fetching escrow timeline', {
          error: error.message,
          escrowId,
        });
        throw new Error(error.message);
      }

      const row = data as Record<string, unknown>;
      const status = row.status as string;
      const blockingReasons = (row.blocking_reasons as string[]) ?? [];

      // Build timeline steps from escrow state
      const steps: EscrowTimeline['steps'] = [
        {
          step: 'payment_received',
          status: status !== 'pending' ? 'completed' : 'pending',
          completedAt: (row.created_at as string) ?? null,
          blockedReason: null,
        },
        {
          step: 'job_completed',
          status: row.job_completed_at
            ? 'completed'
            : status === 'held'
              ? 'pending'
              : 'pending',
          completedAt: (row.job_completed_at as string) ?? null,
          blockedReason: null,
        },
        {
          step: 'homeowner_approval',
          status: row.homeowner_approval
            ? 'completed'
            : blockingReasons.length > 0
              ? 'blocked'
              : 'pending',
          completedAt: (row.homeowner_approval_at as string) ?? null,
          blockedReason: blockingReasons[0] ?? null,
        },
        {
          step: 'payment_released',
          status: status === 'released' ? 'completed' : 'pending',
          completedAt: (row.released_at as string) ?? null,
          blockedReason: null,
        },
      ];

      return {
        escrowId,
        currentStatus: status,
        blockingReasons,
        estimatedReleaseDate: (row.estimated_release_date as string) ?? null,
        steps,
      };
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching escrow timeline', {
        error: apiError,
        escrowId,
      });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Request admin review for an escrow (after 7 days of no homeowner response)
   */
  static async requestAdminReview(
    escrowId: string,
    reason?: string
  ): Promise<void> {
    try {
      await mobileApiClient.post(
        `/api/escrow/${escrowId}/request-admin-review`,
        { reason }
      );
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error requesting admin review', {
        error: apiError,
        escrowId,
      });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get all escrows for the logged-in contractor via direct Supabase query
   */
  static async getContractorEscrows(): Promise<EscrowStatus[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          '*, job:jobs!escrow_transactions_job_id_fkey(id, title, status)'
        )
        .eq('payee_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching contractor escrows', {
          error: error.message,
        });
        throw new Error(error.message);
      }

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        status: row.status as string,
        amount: row.amount as number,
        jobId: row.job_id as string,
        blockingReasons: (row.blocking_reasons as string[]) ?? [],
        estimatedReleaseDate: (row.estimated_release_date as string) ?? null,
        homeownerApproval: (row.homeowner_approval as boolean) ?? false,
        homeownerApprovalAt: (row.homeowner_approval_at as string) ?? null,
        autoApprovalDate: (row.auto_approval_date as string) ?? null,
        adminHoldStatus: (row.admin_hold_status as string) ?? null,
        photoVerificationStatus:
          (row.photo_verification_status as string) ?? 'pending',
        coolingOffEndsAt: (row.cooling_off_ends_at as string) ?? null,
        trustScore: (row.trust_score as number) ?? null,
      }));
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching contractor escrows', { error: apiError });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Homeowner: Approve job completion
   */
  static async approveCompletion(
    escrowId: string,
    inspectionCompleted: boolean
  ): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/homeowner/approve`, {
        inspectionCompleted,
      });
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error approving completion', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Homeowner: Reject job completion
   */
  static async rejectCompletion(
    escrowId: string,
    reason: string
  ): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/homeowner/reject`, {
        reason,
      });
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error rejecting completion', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Homeowner: Mark inspection as completed
   */
  static async markInspectionCompleted(escrowId: string): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/homeowner/inspect`);
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error marking inspection completed', {
        error: apiError,
        escrowId,
      });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get homeowner pending approval details via direct Supabase query
   */
  static async getHomeownerPendingApproval(escrowId: string): Promise<unknown> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          '*, job:jobs!escrow_transactions_job_id_fkey(id, title, status, completed_at)'
        )
        .eq('id', escrowId)
        .single();

      if (error) {
        logger.error('Error fetching pending approval details', {
          error: error.message,
          escrowId,
        });
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching pending approval details', {
        error: apiError,
        escrowId,
      });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }
}
