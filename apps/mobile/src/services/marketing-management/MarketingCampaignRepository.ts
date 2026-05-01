/**
 * MarketingCampaignRepository — STUB
 *
 * 2026-04-30 audit P0-1 follow-up: every method previously hit
 * `supabase.from('marketing_campaigns').*` directly from mobile. The
 * marketing-campaigns feature has no production UI consumer (only
 * `MarketingScreen.tsx` exists, which renders coaching tips backed by
 * `/api/contractor/marketing-stats`). Rather than ship a phantom CRUD
 * surface that would have to be re-validated server-side later, every
 * method now throws — that way the build stays green for the unit
 * tests + type imports the rest of the codebase relies on, but a
 * runtime call from a screen we missed fails loudly instead of
 * silently writing to the DB through RLS.
 *
 * Re-enable by:
 *   1. Building `/api/contractor/marketing/campaigns` (CRUD).
 *   2. Replacing each method body with `mobileApiClient.<verb>(...)`.
 *   3. Removing this file's deprecation banner.
 */

import {
  MarketingCampaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignSearchParams,
} from './types';

const NOT_IMPLEMENTED =
  'MarketingCampaignRepository methods are stubs — call sites must move to /api/contractor/marketing/campaigns before re-enabling.';

export class MarketingCampaignRepository {
  async createCampaign(
    _request: CreateCampaignRequest
  ): Promise<MarketingCampaign> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getCampaigns(
    _contractorId: string,
    _params?: CampaignSearchParams
  ): Promise<{ campaigns: MarketingCampaign[]; total: number }> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getCampaignById(_campaignId: string): Promise<MarketingCampaign> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async updateCampaign(
    _request: UpdateCampaignRequest
  ): Promise<MarketingCampaign> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async deleteCampaign(_campaignId: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async updateCampaignMetrics(
    _campaignId: string,
    _metricsData: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      leads?: number;
      revenue?: number;
    }
  ): Promise<MarketingCampaign> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
