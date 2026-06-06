/**
 * MarketingAnalyticsService unit tests.
 * The public generateAnalytics/optimizeBudget entry points exercise the private
 * summary/channel/top-performer calculators directly; CRUD methods are driven
 * through the shared supabase mock.
 */

import { MarketingAnalyticsService } from '../MarketingAnalyticsService';
import {
  __setMockData,
  __queueMockData,
  __resetSupabaseMock,
} from '../../../config/supabase';
import type { MarketingCampaign } from '../types';

const svc = new MarketingAnalyticsService();

function campaign(
  over: Partial<Record<string, unknown>> = {}
): MarketingCampaign {
  return {
    id: 'cmp1',
    contractorId: 'c1',
    status: 'active',
    spent: 1000,
    metrics: {
      leads: 10,
      conversions: 5,
      roi: 3,
      ltv: 200,
      impressions: 0,
      clicks: 0,
    },
    channels: [
      {
        platform: 'facebook',
        spent: 500,
        performance: { conversions: 4 },
      },
    ],
    content: [{ performance: { engagement: 50 } }],
    ...over,
  } as unknown as MarketingCampaign;
}

beforeEach(() => {
  __resetSupabaseMock();
});

describe('generateAnalytics', () => {
  it('aggregates summary, channel performance, trends and top performers', async () => {
    const campaigns = [
      campaign(),
      campaign({ id: 'cmp2', status: 'completed', spent: 2000 }),
    ];
    const analytics = await svc.generateAnalytics('c1', campaigns);
    expect(analytics.contractorId).toBe('c1');
    expect(analytics.summary.totalCampaigns).toBe(2);
    expect(analytics.summary.activeCampaigns).toBe(1);
    expect(analytics.summary.totalSpent).toBe(3000);
    expect(analytics.summary.avgROI).toBeGreaterThan(0);
    expect(analytics.channelPerformance[0].platform).toBe('facebook');
    expect(analytics.topPerformingCampaigns.length).toBeGreaterThan(0);
  });

  it('returns zeroed averages for an empty campaign set', async () => {
    const analytics = await svc.generateAnalytics('c1', []);
    expect(analytics.summary.totalCampaigns).toBe(0);
    expect(analytics.summary.avgROI).toBe(0);
    expect(analytics.summary.avgCAC).toBe(0);
    expect(analytics.summary.avgLTV).toBe(0);
    expect(analytics.channelPerformance).toEqual([]);
  });
});

describe('optimizeBudget', () => {
  it('recommends increase / reduce / hold across ROI bands', async () => {
    // Three platforms producing roi >2%, <1%, and in-between.
    const c = campaign({
      channels: [
        { platform: 'high', spent: 100, performance: { conversions: 1 } }, // roi 900%
        { platform: 'low', spent: 100000, performance: { conversions: 100 } }, // roi 0%
        { platform: 'mid', spent: 1000, performance: { conversions: 1.015 } }, // roi 1.5%
      ],
    });
    __setMockData([c]);
    const result = await svc.optimizeBudget('c1');
    expect(result.optimalAllocation.high).toBe(150); // 100 * 1.5
    expect(result.optimalAllocation.low).toBe(50000); // 100000 * 0.5
    expect(result.optimalAllocation.mid).toBe(1000); // unchanged
    expect(result.recommendations.some((r) => r.includes('Increase'))).toBe(
      true
    );
    expect(result.recommendations.some((r) => r.includes('Reduce'))).toBe(true);
  });
});

describe('analytics persistence', () => {
  it('initializeCampaignAnalytics inserts a seed record', async () => {
    await expect(
      svc.initializeCampaignAnalytics('cmp1')
    ).resolves.toBeUndefined();
  });

  it('updateCampaignAnalytics recomputes and persists', async () => {
    __setMockData(campaign()); // getCampaignById (.single)
    __queueMockData([[campaign()]]); // getCampaignsForContractor list read
    await expect(svc.updateCampaignAnalytics('cmp1')).resolves.toBeUndefined();
  });

  it('deleteCampaignAnalytics removes by campaign id', async () => {
    await expect(svc.deleteCampaignAnalytics('cmp1')).resolves.toBeUndefined();
  });
});

describe('competitor analyses', () => {
  it('createCompetitorAnalysis returns the inserted row', async () => {
    __setMockData({ id: 'ca1', competitor_name: 'Rival' });
    const result = await svc.createCompetitorAnalysis('c1', {
      competitorName: 'Rival',
      socialMedia: {} as never,
      services: ['plumbing'],
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    });
    expect(result).toEqual({ id: 'ca1', competitor_name: 'Rival' });
  });

  it('getCompetitorAnalyses returns the list', async () => {
    __setMockData([{ id: 'ca1' }, { id: 'ca2' }]);
    expect(await svc.getCompetitorAnalyses('c1')).toHaveLength(2);
  });
});

describe('recommendations', () => {
  it('getMarketingRecommendations returns unimplemented recs', async () => {
    __setMockData([{ id: 'r1' }]);
    expect(await svc.getMarketingRecommendations('c1')).toHaveLength(1);
  });

  it('implementRecommendation flags and returns the rec', async () => {
    __setMockData({ id: 'r1', is_implemented: true });
    const result = await svc.implementRecommendation('r1', 'done');
    expect(result).toEqual({ id: 'r1', is_implemented: true });
  });
});

describe('getCampaignPerformance', () => {
  it('returns campaign, performance metrics and trends', async () => {
    __setMockData(campaign());
    const result = await svc.getCampaignPerformance('cmp1');
    expect(result.campaign.id).toBe('cmp1');
    expect(result.performance).toBeDefined();
    expect(result.trends.impressions).toEqual([0]);
  });
});

describe('error paths', () => {
  it('createCompetitorAnalysis throws when the insert errors', async () => {
    __setMockData(null); // single() -> error
    await expect(
      svc.createCompetitorAnalysis('c1', {
        competitorName: 'X',
        socialMedia: {} as never,
        services: [],
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      })
    ).rejects.toBeDefined();
  });

  it('getCampaignPerformance throws when the campaign is missing', async () => {
    __setMockData(null);
    await expect(svc.getCampaignPerformance('missing')).rejects.toBeDefined();
  });
});
