/**
 * Escrow Service for Mobile App
 * Handles escrow status tracking, homeowner approval, and admin review requests
 */

import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
   * Get auth headers with token
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return headers;
  }

  /**
   * Get escrow status for a specific escrow transaction
   */
  static async getEscrowStatus(escrowId: string): Promise<EscrowStatus> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/status`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch escrow status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error fetching escrow status', error);
      throw error;
    }
  }

  /**
   * Get escrow release timeline and blockers
   */
  static async getEscrowTimeline(escrowId: string): Promise<EscrowTimeline> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/release-timeline`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch escrow timeline');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error fetching escrow timeline', error);
      throw error;
    }
  }

  /**
   * Request admin review for an escrow (after 7 days of no homeowner response)
   */
  static async requestAdminReview(escrowId: string, reason?: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/request-admin-review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request admin review');
      }
    } catch (error) {
      logger.error('Error requesting admin review', error);
      throw error;
    }
  }

  /**
   * Get all escrows for the logged-in contractor
   */
  static async getContractorEscrows(): Promise<EscrowStatus[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/contractor/escrows`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch contractor escrows');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error fetching contractor escrows', error);
      throw error;
    }
  }

  /**
   * Homeowner: Approve job completion
   */
  static async approveCompletion(escrowId: string, inspectionCompleted: boolean): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/homeowner/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ inspectionCompleted }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve completion');
      }
    } catch (error) {
      logger.error('Error approving completion', error);
      throw error;
    }
  }

  /**
   * Homeowner: Reject job completion
   */
  static async rejectCompletion(escrowId: string, reason: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/homeowner/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject completion');
      }
    } catch (error) {
      logger.error('Error rejecting completion', error);
      throw error;
    }
  }

  /**
   * Homeowner: Mark inspection as completed
   */
  static async markInspectionCompleted(escrowId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/homeowner/inspect`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark inspection completed');
      }
    } catch (error) {
      logger.error('Error marking inspection completed', error);
      throw error;
    }
  }

  /**
   * Get homeowner pending approval details
   */
  static async getHomeownerPendingApproval(escrowId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/escrow/${escrowId}/homeowner/pending-approval`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch pending approval details');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error fetching pending approval details', error);
      throw error;
    }
  }
}

