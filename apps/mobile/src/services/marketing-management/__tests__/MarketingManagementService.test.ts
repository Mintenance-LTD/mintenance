/**
 * MarketingManagementService unit tests.
 * This class is an orchestration facade: every method delegates to a
 * sub-service inside try/catch and rethrows via ServiceErrorHandler. We mock
 * all five collaborators and assert both the delegation (happy path) and the
 * error-wrapping (catch path) for each method.
 */

const mockCampaignRepo = {
  createCampaign: jest.fn(),
  getCampaigns: jest.fn(),
  getCampaignById: jest.fn(),
  updateCampaign: jest.fn(),
  deleteCampaign: jest.fn(),
  updateCampaignMetrics: jest.fn(),
};
const mockLeadService = {
  createLead: jest.fn(),
  getLeads: jest.fn(),
  updateLeadStatus: jest.fn(),
};
const mockContentService = {
  createContent: jest.fn(),
  getMarketingAssets: jest.fn(),
  uploadMarketingAsset: jest.fn(),
  getContentCalendar: jest.fn(),
  scheduleContent: jest.fn(),
  cleanupCampaignContent: jest.fn(),
};
const mockAnalyticsService = {
  initializeCampaignAnalytics: jest.fn(),
  updateCampaignAnalytics: jest.fn(),
  deleteCampaignAnalytics: jest.fn(),
  generateAnalytics: jest.fn(),
  createCompetitorAnalysis: jest.fn(),
  getCompetitorAnalyses: jest.fn(),
  getMarketingRecommendations: jest.fn(),
  implementRecommendation: jest.fn(),
  getCampaignPerformance: jest.fn(),
  optimizeBudget: jest.fn(),
};
const mockValidationService = {
  validateCreateCampaignRequest: jest.fn(),
  validateUpdateCampaignRequest: jest.fn(),
};

jest.mock('../MarketingCampaignRepository', () => ({
  MarketingCampaignRepository: jest.fn(() => mockCampaignRepo),
}));
jest.mock('../LeadManagementService', () => ({
  LeadManagementService: jest.fn(() => mockLeadService),
}));
jest.mock('../ContentManagementService', () => ({
  ContentManagementService: jest.fn(() => mockContentService),
}));
jest.mock('../MarketingAnalyticsService', () => ({
  MarketingAnalyticsService: jest.fn(() => mockAnalyticsService),
}));
jest.mock('../MarketingValidationService', () => ({
  MarketingValidationService: jest.fn(() => mockValidationService),
}));
jest.mock('../../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    handleError: jest.fn(
      (_e: unknown, msg: string) => new Error(`wrapped: ${msg}`)
    ),
  },
}));

import { MarketingManagementService } from '../MarketingManagementService';
import { ServiceErrorHandler } from '../../../utils/serviceErrorHandler';

const handleError = ServiceErrorHandler.handleError as jest.Mock;

let svc: MarketingManagementService;

beforeEach(() => {
  jest.clearAllMocks();
  // default every delegate to resolve
  [
    mockCampaignRepo,
    mockLeadService,
    mockContentService,
    mockAnalyticsService,
    mockValidationService,
  ].forEach((m) =>
    Object.values(m).forEach((fn) => (fn as jest.Mock).mockResolvedValue({}))
  );
  svc = new MarketingManagementService();
});

describe('createCampaign', () => {
  it('validates, creates, and initializes analytics', async () => {
    mockCampaignRepo.createCampaign.mockResolvedValue({ id: 'cmp1' });
    const result = await svc.createCampaign({} as never);
    expect(
      mockValidationService.validateCreateCampaignRequest
    ).toHaveBeenCalled();
    expect(
      mockAnalyticsService.initializeCampaignAnalytics
    ).toHaveBeenCalledWith('cmp1');
    expect(result).toEqual({ id: 'cmp1' });
  });

  it('wraps validation failures', async () => {
    mockValidationService.validateCreateCampaignRequest.mockRejectedValueOnce(
      new Error('bad')
    );
    await expect(svc.createCampaign({} as never)).rejects.toThrow('wrapped');
    expect(handleError).toHaveBeenCalled();
  });
});

describe('updateCampaign', () => {
  it('updates analytics when status becomes active/completed', async () => {
    mockCampaignRepo.updateCampaign.mockResolvedValue({ id: 'cmp1' });
    await svc.updateCampaign({
      id: 'cmp1',
      updates: { status: 'active' },
    } as never);
    expect(mockAnalyticsService.updateCampaignAnalytics).toHaveBeenCalledWith(
      'cmp1'
    );
  });

  it('skips analytics update for other status changes', async () => {
    mockCampaignRepo.updateCampaign.mockResolvedValue({ id: 'cmp1' });
    await svc.updateCampaign({ id: 'cmp1', updates: { name: 'x' } } as never);
    expect(mockAnalyticsService.updateCampaignAnalytics).not.toHaveBeenCalled();
  });
});

describe('deleteCampaign', () => {
  it('removes the campaign, analytics and content', async () => {
    await svc.deleteCampaign('cmp1');
    expect(mockCampaignRepo.deleteCampaign).toHaveBeenCalledWith('cmp1');
    expect(mockAnalyticsService.deleteCampaignAnalytics).toHaveBeenCalledWith(
      'cmp1'
    );
    expect(mockContentService.cleanupCampaignContent).toHaveBeenCalledWith(
      'cmp1'
    );
  });
});

describe('getMarketingAnalytics', () => {
  it('fetches campaigns then generates analytics', async () => {
    mockCampaignRepo.getCampaigns.mockResolvedValue({
      campaigns: [{ id: 'a' }],
    });
    mockAnalyticsService.generateAnalytics.mockResolvedValue({ summary: {} });
    const result = await svc.getMarketingAnalytics('c1');
    expect(mockAnalyticsService.generateAnalytics).toHaveBeenCalledWith('c1', [
      { id: 'a' },
    ]);
    expect(result).toEqual({ summary: {} });
  });
});

describe('updateCampaignMetrics', () => {
  it('updates metrics then refreshes analytics', async () => {
    mockCampaignRepo.updateCampaignMetrics.mockResolvedValue({ id: 'cmp1' });
    await svc.updateCampaignMetrics('cmp1', { clicks: 5 });
    expect(mockAnalyticsService.updateCampaignAnalytics).toHaveBeenCalledWith(
      'cmp1'
    );
  });
});

// Mechanical delegation + error-wrapping coverage for the thin pass-through
// methods. Each entry: [label, () => call, the delegate mock fn].
const passthrough: [string, () => Promise<unknown>, jest.Mock][] = [
  ['getCampaigns', () => svc.getCampaigns('c1'), mockCampaignRepo.getCampaigns],
  [
    'getCampaignById',
    () => svc.getCampaignById('x'),
    mockCampaignRepo.getCampaignById,
  ],
  ['createLead', () => svc.createLead({} as never), mockLeadService.createLead],
  ['getLeads', () => svc.getLeads('c1'), mockLeadService.getLeads],
  [
    'updateLeadStatus',
    () => svc.updateLeadStatus('l1', 'new' as never),
    mockLeadService.updateLeadStatus,
  ],
  [
    'createContent',
    () => svc.createContent({} as never),
    mockContentService.createContent,
  ],
  [
    'getMarketingAssets',
    () => svc.getMarketingAssets('c1'),
    mockContentService.getMarketingAssets,
  ],
  [
    'uploadMarketingAsset',
    () => svc.uploadMarketingAsset('c1', {} as never),
    mockContentService.uploadMarketingAsset,
  ],
  [
    'getContentCalendar',
    () => svc.getContentCalendar('c1'),
    mockContentService.getContentCalendar,
  ],
  [
    'scheduleContent',
    () => svc.scheduleContent('c1', {} as never),
    mockContentService.scheduleContent,
  ],
  [
    'createCompetitorAnalysis',
    () => svc.createCompetitorAnalysis('c1', {} as never),
    mockAnalyticsService.createCompetitorAnalysis,
  ],
  [
    'getCompetitorAnalyses',
    () => svc.getCompetitorAnalyses('c1'),
    mockAnalyticsService.getCompetitorAnalyses,
  ],
  [
    'getMarketingRecommendations',
    () => svc.getMarketingRecommendations('c1'),
    mockAnalyticsService.getMarketingRecommendations,
  ],
  [
    'implementRecommendation',
    () => svc.implementRecommendation('r1', 'n'),
    mockAnalyticsService.implementRecommendation,
  ],
  [
    'getCampaignPerformance',
    () => svc.getCampaignPerformance('cmp1'),
    mockAnalyticsService.getCampaignPerformance,
  ],
  [
    'optimizeBudget',
    () => svc.optimizeBudget('c1'),
    mockAnalyticsService.optimizeBudget,
  ],
];

describe.each(passthrough)('%s (pass-through)', (_label, call, delegate) => {
  it('delegates to the collaborator', async () => {
    delegate.mockResolvedValueOnce({ ok: true });
    await expect(call()).resolves.toEqual({ ok: true });
    expect(delegate).toHaveBeenCalled();
  });

  it('wraps errors via ServiceErrorHandler', async () => {
    delegate.mockRejectedValueOnce(new Error('boom'));
    await expect(call()).rejects.toThrow('wrapped');
  });
});

// Error-wrapping for the multi-step methods too.
describe('error wrapping (multi-step methods)', () => {
  it.each([
    [
      'getCampaigns',
      () => {
        mockCampaignRepo.getCampaigns.mockRejectedValueOnce(new Error('e'));
        return svc.getMarketingAnalytics('c1');
      },
    ],
    [
      'deleteCampaign',
      () => {
        mockCampaignRepo.getCampaignById.mockRejectedValueOnce(new Error('e'));
        return svc.deleteCampaign('x');
      },
    ],
    [
      'updateCampaignMetrics',
      () => {
        mockCampaignRepo.updateCampaignMetrics.mockRejectedValueOnce(
          new Error('e')
        );
        return svc.updateCampaignMetrics('x', {});
      },
    ],
    [
      'updateCampaign',
      () => {
        mockValidationService.validateUpdateCampaignRequest.mockRejectedValueOnce(
          new Error('e')
        );
        return svc.updateCampaign({ id: 'x', updates: {} } as never);
      },
    ],
  ])('%s rethrows wrapped', async (_l, run) => {
    await expect(run()).rejects.toThrow('wrapped');
  });
});
