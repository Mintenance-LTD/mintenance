import { SupabaseClient } from '@supabase/supabase-js';

export class ContractService {
  constructor(config: { supabase: SupabaseClient }) {}

  async listContracts(user: unknown, params: Record<string, unknown>) {
    return { contracts: [], total: 0, hasMore: false };
  }

  async createContract(data: Record<string, unknown>, user: unknown) {
    return { id: 'contract-123', ...data };
  }

  async getContractById(contractId: string, user: unknown) {
    return { id: contractId, status: 'draft' };
  }

  async updateContract(contractId: string, data: Record<string, unknown>, user: unknown) {
    return { id: contractId, ...data };
  }

  async getContractMilestones(contractId: string, user: unknown) {
    return [];
  }
}
