/**
 * Escrow Service for Mobile App
 * Handles escrow status tracking, homeowner approval, and admin review requests
 * Read operations use direct Supabase queries; writes use mobileApiClient for server-side orchestration.
 */

import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import { parseError, getUserFriendlyMessage } from '@mintenance/api-client';
import type { EscrowTransactionRow } from '@mintenance/types';

/**
 * Typed-row boundary (audit 2026-07-27): rows from direct Supabase reads are
 * cast ONCE to the generated live-schema row type instead of
 * Record<string, unknown> + per-field casts. Reading a column that does not
 * exist in the live schema is now a COMPILE-TIME error — this class had two
 * silent-drift bugs before (blocking_reasons vs release_blocked_reason,
 * and a phantom job_completed_at read).
 */
type EscrowRowWithJob = EscrowTransactionRow & {
  job: { id: string; title: string; status: string } | null;
};

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
   * Map a live escrow row to the mobile view model. All column reads are
   * compile-checked against the generated EscrowTransactionRow.
   *
   * 2026-05-23 audit-19 P2 (now enforced by the type): the live table has
   * neither `blocking_reasons` (plural) nor `estimated_release_date` — the
   * real columns are `release_blocked_reason` (singular text, wrapped into
   * an array for shape compatibility) and `auto_release_date`.
   */
  private static toEscrowStatus(row: EscrowTransactionRow): EscrowStatus {
    // `?? null` on nullable columns: the boundary cast cannot make a partial
    // object whole (PostgREST always returns every selected column, but the
    // contract here is string|null, never undefined).
    return {
      id: row.id,
      status: row.status,
      amount: row.amount,
      jobId: row.job_id ?? '',
      blockingReasons: row.release_blocked_reason
        ? [row.release_blocked_reason]
        : [],
      estimatedReleaseDate: row.auto_release_date ?? null,
      homeownerApproval: row.homeowner_approval ?? false,
      homeownerApprovalAt: row.homeowner_approval_at ?? null,
      autoApprovalDate: row.auto_approval_date ?? null,
      adminHoldStatus: row.admin_hold_status ?? null,
      photoVerificationStatus: row.photo_verification_status ?? 'pending',
      coolingOffEndsAt: row.cooling_off_ends_at ?? null,
      trustScore: row.trust_score ?? null,
    };
  }

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

      // Single boundary cast to the generated live-schema row type; every
      // column access below is compile-checked against it.
      const row = data as EscrowTransactionRow;
      return EscrowService.toEscrowStatus(row);
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
      // Audit 2026-07-27 (typed-row migration): the previous code read
      // `row.job_completed_at`, a column that does NOT exist on
      // escrow_transactions — it was always undefined, so the
      // "job completed" timeline step never showed as completed. The real
      // signal is jobs.completed_at; pull it through the FK join.
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*, job:jobs!escrow_transactions_job_id_fkey(completed_at)')
        .eq('id', escrowId)
        .single();

      if (error) {
        logger.error('Error fetching escrow timeline', {
          error: error.message,
          escrowId,
        });
        throw new Error(error.message);
      }

      const row = data as EscrowTransactionRow & {
        job: { completed_at: string | null } | null;
      };
      const status = row.status;
      // 2026-05-23 audit-19 P2 (now compile-enforced): the real blocker
      // column is the singular `release_blocked_reason` text field.
      const blockingReasons = row.release_blocked_reason
        ? [row.release_blocked_reason]
        : [];
      const jobCompletedAt = row.job?.completed_at ?? null;

      // Build timeline steps from escrow state
      const steps: EscrowTimeline['steps'] = [
        {
          step: 'payment_received',
          status: status !== 'pending' ? 'completed' : 'pending',
          completedAt: row.created_at ?? null,
          blockedReason: null,
        },
        {
          step: 'job_completed',
          status: jobCompletedAt ? 'completed' : 'pending',
          completedAt: jobCompletedAt,
          blockedReason: null,
        },
        {
          step: 'homeowner_approval',
          status: row.homeowner_approval
            ? 'completed'
            : blockingReasons.length > 0
              ? 'blocked'
              : 'pending',
          completedAt: row.homeowner_approval_at ?? null,
          blockedReason: blockingReasons[0] ?? null,
        },
        {
          step: 'payment_released',
          // DB uses 'completed' as the terminal escrow status, not 'released'.
          // See CLAUDE.md → Key Status Transitions → Escrow.
          status: status === 'completed' ? 'completed' : 'pending',
          completedAt: row.released_at ?? null,
          blockedReason: null,
        },
      ];

      return {
        escrowId,
        currentStatus: status,
        blockingReasons,
        // Audit-19 P2 fix, now compile-enforced — real column is auto_release_date.
        estimatedReleaseDate: row.auto_release_date ?? null,
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

      return ((data ?? []) as EscrowRowWithJob[]).map((row) =>
        EscrowService.toEscrowStatus(row)
      );
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
