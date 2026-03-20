/**
 * Contract Service for Mobile App
 *
 * Handles contract retrieval and signing via the web API routes.
 * All mutations go through the API to ensure consistent side-effects
 * (notifications, emails, appointment creation, status updates).
 */

import { mobileApiClient } from '../utils/mobileApiClient';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { parseError, getUserFriendlyMessage } from '@mintenance/api-client';

export interface Contract {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: string;
  title?: string;
  description?: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  terms?: Record<string, unknown>;
  contractor_signed_at?: string | null;
  homeowner_signed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SignContractResponse {
  success: boolean;
  contract: Contract;
  message: string;
}

interface ContractListResponse {
  contracts?: Contract[];
  data?: Contract[];
}

export class ContractService {
  /**
   * Get contracts for a specific job.
   * Uses direct Supabase query (RLS-enforced — user must be homeowner or contractor).
   */
  static async getContractsByJobId(jobId: string): Promise<Contract[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select(
        'id, job_id, contractor_id, homeowner_id, status, title, description, amount, start_date, end_date, terms, contractor_signed_at, homeowner_signed_at, created_at, updated_at'
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch contracts', { error, jobId });
      throw new Error(error.message);
    }

    return (data || []) as Contract[];
  }

  /**
   * Get a single contract by ID via the API.
   * Falls back to direct Supabase query.
   */
  static async getContractById(contractId: string): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select(
        'id, job_id, contractor_id, homeowner_id, status, title, description, amount, start_date, end_date, terms, contractor_signed_at, homeowner_signed_at, created_at, updated_at'
      )
      .eq('id', contractId)
      .single();

    if (error) {
      logger.error('Failed to fetch contract', { error, contractId });
      return null;
    }

    return data as Contract;
  }

  /**
   * Sign a contract.
   * Routes through the web API to trigger all side-effects:
   * - Updates contract status
   * - Sends notifications to the other party
   * - Sends email to the other party
   * - Creates appointment when both parties sign
   * - Updates job scheduled dates
   */
  static async signContract(contractId: string): Promise<SignContractResponse> {
    try {
      const response = await mobileApiClient.post<SignContractResponse>(
        `/api/contracts/${contractId}/accept`
      );
      return response;
    } catch (error) {
      const apiError = parseError(error);
      logger.error('Failed to sign contract', {
        error: apiError,
        contractId,
      });
      throw new Error(getUserFriendlyMessage(apiError));
    }
  }

  /**
   * Check if a contract is ready for the current user to sign.
   */
  static async canSign(
    contractId: string,
    userId: string,
    userRole: 'homeowner' | 'contractor'
  ): Promise<{ canSign: boolean; reason?: string }> {
    const contract = await this.getContractById(contractId);

    if (!contract) {
      return { canSign: false, reason: 'Contract not found' };
    }

    if (contract.status === 'draft') {
      return {
        canSign: false,
        reason:
          'Contract is still in draft. The contractor must prepare it first.',
      };
    }

    if (userRole === 'contractor') {
      if (contract.contractor_id !== userId) {
        return {
          canSign: false,
          reason: 'You are not the contractor on this contract',
        };
      }
      if (contract.contractor_signed_at) {
        return {
          canSign: false,
          reason: 'You have already signed this contract',
        };
      }
    }

    if (userRole === 'homeowner') {
      if (contract.homeowner_id !== userId) {
        return {
          canSign: false,
          reason: 'You are not the homeowner on this contract',
        };
      }
      if (contract.homeowner_signed_at) {
        return {
          canSign: false,
          reason: 'You have already signed this contract',
        };
      }
    }

    return { canSign: true };
  }
}
