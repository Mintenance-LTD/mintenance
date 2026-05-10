/**
 * LeadManagementService — DEFERRED FEATURE (no-op stub).
 *
 * 2026-04-30 audit: previously hit `supabase.from('marketing_leads').*`
 * directly from mobile. There is no UI consumer for lead create / list /
 * status updates today (the marketing screen reads stats only via
 * `/api/contractor/marketing-stats`).
 *
 * 2026-05-10 (AUDIT_PUNCH_LIST P2 #52): converted from
 * `throw new Error('NOT_IMPLEMENTED')` to safe-empty returns. Same
 * disposition as `MarketingCampaignRepository` — zero external callers,
 * pure scaffold for a feature that hasn't shipped.
 *
 * Re-enable by adding `/api/contractor/marketing/leads` and switching
 * each method to `mobileApiClient.<verb>(...)`.
 */

import { logger } from '../../utils/logger';
import { Lead, LeadSearchParams } from './types';

let _warned = false;
function warnDeferred(method: string): void {
  if (_warned) return;
  _warned = true;
  logger.warn(
    'LeadManagementService: deferred feature called — `/api/contractor/marketing/leads` does not exist; returning empty data.',
    { service: 'marketing', method }
  );
}

function emptyLead(id: string): Lead {
  // Minimal safe-default Lead. Cast via `unknown` because the
  // canonical Lead shape has ~20 required fields (most are display
  // metadata); a future caller hitting this stub will see
  // id='deferred' + zero scores + empty arrays — obviously placeholder.
  return {
    id,
    contractorId: '',
    source: 'unknown',
    firstName: '',
    lastName: '',
    email: '',
    serviceInterest: [],
    urgency: 'low',
    status: 'new',
    score: 0,
    notes: '',
    tags: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } as unknown as Lead;
}

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
    warnDeferred('createLead');
    return emptyLead('deferred');
  }

  async getLeads(
    _contractorId: string,
    _params?: LeadSearchParams
  ): Promise<{ leads: Lead[]; total: number }> {
    warnDeferred('getLeads');
    return { leads: [], total: 0 };
  }

  async updateLeadStatus(
    leadId: string,
    status: Lead['status'],
    _notes?: string
  ): Promise<Lead> {
    warnDeferred('updateLeadStatus');
    return { ...emptyLead(leadId), status };
  }
}
