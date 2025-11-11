/**
 * Escrow Service for Mobile App
 * Handles escrow status tracking, homeowner approval, and admin review requests
 * Uses unified API client for consistent error handling
 */

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
  steps: Array<{
    step: string;
    status: 'completed' | 'pending' | 'blocked';
    completedAt: string | null;
    blockedReason: string | null;
  }>;
}

export class EscrowService {
  /**
   * Get escrow status for a specific escrow transaction
   */
  static async getEscrowStatus(escrowId: string): Promise<EscrowStatus> {
    try {
      return await mobileApiClient.get<EscrowStatus>(`/api/escrow/${escrowId}/status`);
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching escrow status', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get escrow release timeline and blockers
   */
  static async getEscrowTimeline(escrowId: string): Promise<EscrowTimeline> {
    try {
      return await mobileApiClient.get<EscrowTimeline>(`/api/escrow/${escrowId}/release-timeline`);
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching escrow timeline', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Request admin review for an escrow (after 7 days of no homeowner response)
   */
  static async requestAdminReview(escrowId: string, reason?: string): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/request-admin-review`, { reason });
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error requesting admin review', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get all escrows for the logged-in contractor
   */
  static async getContractorEscrows(): Promise<EscrowStatus[]> {
    try {
      return await mobileApiClient.get<EscrowStatus[]>('/api/contractor/escrows');
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching contractor escrows', { error: apiError });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Homeowner: Approve job completion
   */
  static async approveCompletion(escrowId: string, inspectionCompleted: boolean): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/homeowner/approve`, { inspectionCompleted });
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error approving completion', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Homeowner: Reject job completion
   */
  static async rejectCompletion(escrowId: string, reason: string): Promise<void> {
    try {
      await mobileApiClient.post(`/api/escrow/${escrowId}/homeowner/reject`, { reason });
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
      logger.error('Error marking inspection completed', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Get homeowner pending approval details
   */
  static async getHomeownerPendingApproval(escrowId: string): Promise<any> {
    try {
      return await mobileApiClient.get(`/api/escrow/${escrowId}/homeowner/pending-approval`);
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Error fetching pending approval details', { error: apiError, escrowId });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }
}

