/**
 * LeadManagementService — STUB
 *
 * 2026-04-30 audit P0-1 follow-up: previously hit
 * `supabase.from('marketing_leads').*` directly from mobile. There is
 * no UI consumer for lead create/list/status updates today (the
 * marketing screen reads stats only, via
 * `/api/contractor/marketing-stats`). Same disposition as
 * `MarketingCampaignRepository`: stub the methods so a renewed
 * implementation is visibly missing rather than silently writing to
 * the DB.
 *
 * Re-enable by adding `/api/contractor/marketing/leads` and switching
 * each method to `mobileApiClient.<verb>(...)`.
 */

import { Lead, LeadSearchParams } from './types';

const NOT_IMPLEMENTED =
  'LeadManagementService methods are stubs — call sites must move to /api/contractor/marketing/leads before re-enabling.';

export class LeadManagementService {
  async createLead(_leadData: {
    contractorId: string;
    campaignId?: string;
    source: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    serviceInterest: string[];
    urgency: 'low' | 'medium' | 'high';
    notes?: string;
  }): Promise<Lead> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getLeads(
    _contractorId: string,
    _params?: LeadSearchParams
  ): Promise<{ leads: Lead[]; total: number }> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async updateLeadStatus(
    _leadId: string,
    _status: Lead['status'],
    _notes?: string
  ): Promise<Lead> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
