import { SupabaseClient } from '@supabase/supabase-js';

export class ContractService {
  constructor(config: { supabase: SupabaseClient }) {}

  async listContracts(user: any, params: any) {
    return { contracts: [], total: 0, hasMore: false };
  }

  async createContract(data: any, user: any) {
    return { id: 'contract-123', ...data };
  }

  async getContractById(contractId: string, user: any) {
    return { id: contractId, status: 'draft' };
  }

  async updateContract(contractId: string, data: any, user: any) {
    return { id: contractId, ...data };
  }

  async getContractMilestones(contractId: string, user: any) {
    return [];
  }
}
