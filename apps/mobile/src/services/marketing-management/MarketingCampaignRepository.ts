/**
 * MarketingCampaignRepository — DEFERRED FEATURE (no-op stub).
 *
 * 2026-04-30 audit P0-1: every method previously hit
 * `supabase.from('marketing_campaigns').*` directly from mobile. The
 * marketing-campaigns feature has no production UI consumer
 * (`MarketingScreen.tsx` only renders coaching tips backed by
 * `/api/contractor/marketing-stats`).
 *
 * 2026-05-10 (AUDIT_PUNCH_LIST P2 #52): converted from
 * `throw new Error('NOT_IMPLEMENTED')` to safe-empty returns — emits a
 * one-shot logger.warn so wiring this up is visible in QA/Sentry, then
 * resolves with empty/null. Zero external callers exist today
 * (verified via grep: only `MarketingManagementService` orchestrator
 * imports this, and the orchestrator itself has no callers outside
 * `contractor-business/index.ts`'s factory). Pure scaffold.
 *
 * Re-enable by:
 *   1. Building `/api/contractor/marketing/campaigns` (CRUD).
 *   2. Replacing each method body with `mobileApiClient.<verb>(...)`.
 *   3. Removing this file's deprecation banner.
 */

import { logger } from '../../utils/logger';
import {
  MarketingCampaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignSearchParams,
} from './types';

let _warned = false;
function warnDeferred(method: string): void {
  if (_warned) return;
  _warned = true;
  logger.warn(
    'MarketingCampaignRepository: deferred feature called — `marketing_campaigns` API does not exist; returning empty data.',
    { service: 'marketing', method }
  );
}

function emptyCampaign(id: string): MarketingCampaign {
  // Minimal safe-default MarketingCampaign. Cast via `unknown`
  // because the canonical type has 14+ required fields. Future
  // callers see id='deferred' + zeroed metrics — obviously placeholder.
  return {
    id,
    contractorId: '',
    name: 'Deferred',
    type: 'content',
    status: 'draft',
    budget: 0,
    spent: 0,
    startDate: new Date(0).toISOString(),
    targetAudience: {
      demographics: {
        ageRange: [0, 0],
        income: [],
        location: [],
        interests: [],
      },
      behaviors: {
        homeOwnership: false,
        previousServices: [],
        seasonalPatterns: [],
      },
      size: 0,
      reach: 0,
    },
    objectives: [],
    channels: [],
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
      customers: 0,
      revenue: 0,
      roi: 0,
      cac: 0,
      ltv: 0,
      engagementRate: 0,
    },
    content: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } as unknown as MarketingCampaign;
}

export class MarketingCampaignRepository {
  async createCampaign(
    _request: CreateCampaignRequest
  ): Promise<MarketingCampaign> {
    warnDeferred('createCampaign');
    return emptyCampaign('deferred');
  }

  async getCampaigns(
    _contractorId: string,
    _params?: CampaignSearchParams
  ): Promise<{ campaigns: MarketingCampaign[]; total: number }> {
    warnDeferred('getCampaigns');
    return { campaigns: [], total: 0 };
  }

  async getCampaignById(campaignId: string): Promise<MarketingCampaign> {
    warnDeferred('getCampaignById');
    return emptyCampaign(campaignId);
  }

  async updateCampaign(
    request: UpdateCampaignRequest
  ): Promise<MarketingCampaign> {
    warnDeferred('updateCampaign');
    return emptyCampaign(request.id || 'deferred');
  }

  async deleteCampaign(_campaignId: string): Promise<void> {
    warnDeferred('deleteCampaign');
  }

  async updateCampaignMetrics(
    campaignId: string,
    _metricsData: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      leads?: number;
      revenue?: number;
    }
  ): Promise<MarketingCampaign> {
    warnDeferred('updateCampaignMetrics');
    return emptyCampaign(campaignId);
  }
}
