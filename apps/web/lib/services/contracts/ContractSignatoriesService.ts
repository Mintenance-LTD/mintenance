/**
 * ContractSignatoriesService — thin helper around the
 * contract_signatories table (R3 #4 of docs/RETENTION_ROADMAP_2026.md).
 *
 * Kept separate from the accept route to hold the 500-line pre-commit
 * limit on apps/web/app/api/contracts/[id]/accept/route.ts.
 *
 * The legacy contract flow is:
 *   contractor_signed_at + homeowner_signed_at = fully accepted
 *
 * The R3 gate layers an optional "all additional signatories signed"
 * requirement on top. Contracts with NO signatories rows preserve the
 * legacy behaviour exactly.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface Signatory {
  id: string;
  contract_id: string;
  user_id: string | null;
  role: 'primary_homeowner' | 'second_homeowner' | 'contractor';
  invited_email: string | null;
  invitation_token: string | null;
  signed_at: string | null;
  created_at: string;
}

export class ContractSignatoriesService {
  /**
   * True when there are either no co-signer rows OR every row has a
   * `signed_at` timestamp. Used by the accept route to decide if the
   * contract can flip to ACCEPTED.
   *
   * Defensive: on DB read failure we return false (don't auto-accept).
   */
  static async areAllCosignersSigned(contractId: string): Promise<boolean> {
    const { data, error } = await serverSupabase
      .from('contract_signatories')
      .select('id, signed_at')
      .eq('contract_id', contractId);

    if (error) {
      logger.warn('contract_signatories: read failed — blocking accept', {
        service: 'ContractSignatoriesService',
        contractId,
        error: error.message,
      });
      return false;
    }

    if (!data || data.length === 0) return true; // legacy path
    return data.every((row) => row.signed_at !== null);
  }

  /**
   * Return pending (unsigned) signatories for UI display.
   */
  static async listPending(contractId: string): Promise<Signatory[]> {
    const { data, error } = await serverSupabase
      .from('contract_signatories')
      .select('*')
      .eq('contract_id', contractId)
      .is('signed_at', null);

    if (error || !data) return [];
    return data as Signatory[];
  }

  /**
   * List every co-signer for a contract (pending + signed).
   */
  static async listAll(contractId: string): Promise<Signatory[]> {
    const { data, error } = await serverSupabase
      .from('contract_signatories')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as Signatory[];
  }
}
