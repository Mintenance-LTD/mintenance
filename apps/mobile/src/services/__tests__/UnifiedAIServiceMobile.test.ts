/**
 * Unit tests for UnifiedAIServiceMobile.
 *
 * Strategy: the unit under test is a thin mobile wrapper around
 * `UnifiedAIService` (from @mintenance/ai-core). We mock ONLY externals:
 *   - @mintenance/ai-core (the underlying UnifiedAIService class)
 *   - ../config/environment (apiBaseUrl used to build endpoints)
 *   - @mintenance/shared (logger)
 *   - @react-native-async-storage/async-storage
 *   - ./aiFallbacks (fallback assessment builder)
 *
 * The wrapper is a singleton created at import time, so we capture the
 * mocked UnifiedAIService instance via the constructor mock.
 */

// ---- Mocks (inlined factories; refs grabbed via requireMock below) ----

jest.mock('@mintenance/ai-core', () => ({
  UnifiedAIService: jest.fn().mockImplementation(function (cfg: unknown) {
    // Expose the config the singleton was constructed with for assertions.
    (global as any).__capturedAiConfig = cfg;
    return {
      assessBuilding: jest.fn(),
      getPricingRecommendation: jest.fn(),
      requestAgentDecision: jest.fn(),
      search: jest.fn(),
      calculateESGScore: jest.fn(),
      analyzeImages: jest.fn(),
      submitCorrections: jest.fn(),
      getUsageMetrics: jest.fn(),
      completeAgentAction: jest.fn(),
      clearCache: jest.fn(),
      getCacheStats: jest.fn(),
    };
  }),
}));

jest.mock('../../config/environment', () => ({
  config: { apiBaseUrl: 'https://api.test.example' },
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../aiFallbacks', () => ({
  buildFallbackAssessment: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Import AFTER mocks. Default export is the singleton instance.
import aiService from '../UnifiedAIServiceMobile';
import AsyncStorageDefault from '@react-native-async-storage/async-storage';
import { logger } from '@mintenance/shared';
import { buildFallbackAssessment } from '../aiFallbacks';

// Resolve mock references.
const mockAsyncStorage = AsyncStorageDefault as unknown as {
  setItem: jest.Mock;
  getItem: jest.Mock;
  removeItem: jest.Mock;
};
const mockLogger = logger as unknown as { error: jest.Mock };
const mockBuildFallbackAssessment = buildFallbackAssessment as jest.Mock;
const capturedConfig = (global as any).__capturedAiConfig;

// The singleton's underlying service instance (returned by the constructor mock).
const mockServiceMethods = (aiService as unknown as { service: any })
  .service as {
  assessBuilding: jest.Mock;
  getPricingRecommendation: jest.Mock;
  requestAgentDecision: jest.Mock;
  search: jest.Mock;
  calculateESGScore: jest.Mock;
  analyzeImages: jest.Mock;
  submitCorrections: jest.Mock;
  getUsageMetrics: jest.Mock;
  completeAgentAction: jest.Mock;
  clearCache: jest.Mock;
  getCacheStats: jest.Mock;
};

const FALLBACK: any = { id: 'fallback_1', confidence: 60 };

beforeEach(() => {
  // jest.config has clearMocks:true, but be explicit for the persistent
  // module-level mocks and AsyncStorage default behaviours.
  jest.clearAllMocks();
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  mockBuildFallbackAssessment.mockReturnValue(FALLBACK);
});

describe('UnifiedAIServiceMobile construction', () => {
  it('is a singleton instance with the documented public methods', () => {
    expect(aiService).toBeDefined();
    expect(typeof aiService.assessBuilding).toBe('function');
    expect(typeof aiService.getPricingRecommendation).toBe('function');
    expect(typeof aiService.clearCache).toBe('function');
  });

  it('constructed the underlying service with mobile config + built endpoints', () => {
    expect(capturedConfig).toBeDefined();
    const cfg = capturedConfig as any;
    expect(cfg.endpoints.buildingSurveyor).toBe(
      'https://api.test.example/api/building-surveyor/assess'
    );
    expect(cfg.endpoints.agents).toBe('https://api.test.example/api/agents');
    expect(cfg.endpoints.search).toBe('https://api.test.example/api/ai/search');
    expect(cfg.endpoints.training).toBe(
      'https://api.test.example/api/training'
    );
    expect(cfg.performance.cacheEnabled).toBe(true);
    expect(cfg.performance.maxRetries).toBe(3);
    expect(cfg.features.enableSAM3).toBe(true);
  });
});

describe('assessBuilding', () => {
  const images = ['img1', 'img2'];
  const jobDetails = {
    title: 'Leaky roof',
    description: 'water ingress',
    category: 'roofing',
    location: 'London',
    jobId: 'job-1',
    propertyId: 'prop-1',
    gps: { latitude: 1, longitude: 2 },
    roomMetadata: { room: 'attic', floor: 2 },
  };

  it('returns data and stores locally on success', async () => {
    const assessment = { id: 'a-99', confidence: 88 };
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: true,
      data: assessment,
    });
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(['old-id']));

    const result = await aiService.assessBuilding(images, jobDetails);

    expect(result).toEqual(assessment);
    // Verify the payload forwarded to the underlying service.
    expect(mockServiceMethods.assessBuilding).toHaveBeenCalledWith(images, {
      description: 'water ingress',
      category: 'roofing',
      location: 'London',
      jobId: 'job-1',
      propertyId: 'prop-1',
      gps: { latitude: 1, longitude: 2 },
      roomMetadata: { room: 'attic', floor: 2 },
    });
    // storeAssessmentLocally writes the assessment and the updated id list.
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'assessment_a-99',
      JSON.stringify(assessment)
    );
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'assessment_ids',
      JSON.stringify(['old-id', 'a-99'])
    );
  });

  it('starts a fresh id list when none stored yet', async () => {
    const assessment = { id: 'a-1' };
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: true,
      data: assessment,
    });
    mockAsyncStorage.getItem.mockResolvedValue(null);

    await aiService.assessBuilding(images, jobDetails);

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'assessment_ids',
      JSON.stringify(['a-1'])
    );
  });

  it('works with no jobDetails (undefined fields forwarded)', async () => {
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: true,
      data: { id: 'a-2' },
    });

    await aiService.assessBuilding(images);

    expect(mockServiceMethods.assessBuilding).toHaveBeenCalledWith(images, {
      description: undefined,
      category: undefined,
      location: undefined,
      jobId: undefined,
      propertyId: undefined,
      gps: undefined,
      roomMetadata: undefined,
    });
  });

  it('returns the fallback when the API reports failure', async () => {
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: false,
      data: null,
    });

    const result = await aiService.assessBuilding(images, jobDetails);

    expect(result).toBe(FALLBACK);
    expect(mockBuildFallbackAssessment).toHaveBeenCalledWith(
      images,
      jobDetails
    );
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('returns the fallback when success is true but data is missing', async () => {
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await aiService.assessBuilding(images, jobDetails);

    expect(result).toBe(FALLBACK);
  });

  it('logs and returns the fallback when the service throws', async () => {
    const err = new Error('network down');
    mockServiceMethods.assessBuilding.mockRejectedValue(err);

    const result = await aiService.assessBuilding(images, jobDetails);

    expect(result).toBe(FALLBACK);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Building assessment failed:',
      err,
      { service: 'mobile' }
    );
  });

  it('swallows storage errors during local persistence', async () => {
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: true,
      data: { id: 'a-store-fail' },
    });
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));

    const result = await aiService.assessBuilding(images, jobDetails);

    // Even though storage failed, the assessment data is still returned.
    expect(result).toEqual({ id: 'a-store-fail' });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to store assessment locally:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });

  it('falls back to empty id list when getItem JSON parse fails', async () => {
    mockServiceMethods.assessBuilding.mockResolvedValue({
      success: true,
      data: { id: 'a-3' },
    });
    mockAsyncStorage.getItem.mockResolvedValue('not-json{');

    await aiService.assessBuilding(images, jobDetails);

    // getStoredAssessmentIds catches the parse error and returns [].
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'assessment_ids',
      JSON.stringify(['a-3'])
    );
  });
});

describe('getPricingRecommendation', () => {
  it('returns data on success and forwards both args', async () => {
    const rec = { price: 100 };
    mockServiceMethods.getPricingRecommendation.mockResolvedValue({
      success: true,
      data: rec,
    });

    const result = await aiService.getPricingRecommendation('job-1', 'c-1');

    expect(result).toEqual(rec);
    expect(mockServiceMethods.getPricingRecommendation).toHaveBeenCalledWith(
      'job-1',
      'c-1'
    );
  });

  it('returns null on unsuccessful response', async () => {
    mockServiceMethods.getPricingRecommendation.mockResolvedValue({
      success: false,
      data: null,
    });
    expect(await aiService.getPricingRecommendation('job-1')).toBeNull();
  });

  it('returns null and logs on error', async () => {
    mockServiceMethods.getPricingRecommendation.mockRejectedValue(
      new Error('boom')
    );
    expect(await aiService.getPricingRecommendation('job-1')).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Pricing recommendation failed:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('requestAgentDecision', () => {
  const ctx: any = { foo: 'bar' };

  it('returns data and stores the decision on success', async () => {
    const decision = { agentName: 'PricingAgent', action: 'x' };
    mockServiceMethods.requestAgentDecision.mockResolvedValue({
      success: true,
      data: decision,
    });
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456);

    const result = await aiService.requestAgentDecision('PricingAgent', ctx);

    expect(result).toEqual(decision);
    expect(mockServiceMethods.requestAgentDecision).toHaveBeenCalledWith(
      'PricingAgent',
      ctx
    );
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'decision_PricingAgent_123456',
      JSON.stringify(decision)
    );
    nowSpy.mockRestore();
  });

  it('returns null on unsuccessful response (no storage write)', async () => {
    mockServiceMethods.requestAgentDecision.mockResolvedValue({
      success: false,
      data: null,
    });
    expect(await aiService.requestAgentDecision('A', ctx)).toBeNull();
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('returns null and logs on error', async () => {
    mockServiceMethods.requestAgentDecision.mockRejectedValue(
      new Error('agent err')
    );
    expect(await aiService.requestAgentDecision('A', ctx)).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Agent decision failed:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });

  it('swallows storage errors when persisting the decision', async () => {
    mockServiceMethods.requestAgentDecision.mockResolvedValue({
      success: true,
      data: { agentName: 'A' },
    });
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('disk'));

    const result = await aiService.requestAgentDecision('A', ctx);

    expect(result).toEqual({ agentName: 'A' });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to store agent decision:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('search', () => {
  const filters: any = { category: 'plumbing' };

  it('returns results on success and builds the semantic query', async () => {
    const results = [{ id: 'r1' }];
    mockServiceMethods.search.mockResolvedValue({
      success: true,
      data: results,
    });

    const out = await aiService.search('leaky tap', filters);

    expect(out).toEqual(results);
    expect(mockServiceMethods.search).toHaveBeenCalledWith({
      query: 'leaky tap',
      filters,
      limit: 20,
    });
  });

  it('falls back to local (empty) search when API reports failure', async () => {
    mockServiceMethods.search.mockResolvedValue({ success: false, data: null });
    expect(await aiService.search('x')).toEqual([]);
  });

  it('falls back to local search and logs when the service throws', async () => {
    mockServiceMethods.search.mockRejectedValue(new Error('search err'));
    expect(await aiService.search('x', filters)).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Search failed:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('calculateESGScore', () => {
  it('returns data on success', async () => {
    mockServiceMethods.calculateESGScore.mockResolvedValue({
      success: true,
      data: { score: 80 },
    });
    expect(await aiService.calculateESGScore('c-1')).toEqual({ score: 80 });
    expect(mockServiceMethods.calculateESGScore).toHaveBeenCalledWith('c-1');
  });

  it('returns null on unsuccessful response', async () => {
    mockServiceMethods.calculateESGScore.mockResolvedValue({
      success: false,
      data: null,
    });
    expect(await aiService.calculateESGScore('c-1')).toBeNull();
  });

  it('returns null and logs on error', async () => {
    mockServiceMethods.calculateESGScore.mockRejectedValue(new Error('esg'));
    expect(await aiService.calculateESGScore('c-1')).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'ESG calculation failed:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('analyzeImages', () => {
  it('returns data on success', async () => {
    const analysis = [{ label: 'crack' }];
    mockServiceMethods.analyzeImages.mockResolvedValue({
      success: true,
      data: analysis,
    });
    expect(await aiService.analyzeImages(['i1'])).toEqual(analysis);
    expect(mockServiceMethods.analyzeImages).toHaveBeenCalledWith(['i1']);
  });

  it('returns empty array on unsuccessful response', async () => {
    mockServiceMethods.analyzeImages.mockResolvedValue({
      success: false,
      data: null,
    });
    expect(await aiService.analyzeImages(['i1'])).toEqual([]);
  });

  it('returns empty array and logs on error', async () => {
    mockServiceMethods.analyzeImages.mockRejectedValue(new Error('vision'));
    expect(await aiService.analyzeImages(['i1'])).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Image analysis failed:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('submitCorrections', () => {
  const corrections: any = [{ field: 'severity', value: 'high' }];

  it('returns the success flag from the response', async () => {
    mockServiceMethods.submitCorrections.mockResolvedValue({ success: true });
    expect(await aiService.submitCorrections('a-1', corrections)).toBe(true);
    expect(mockServiceMethods.submitCorrections).toHaveBeenCalledWith(
      'a-1',
      corrections
    );
  });

  it('returns false when response is unsuccessful', async () => {
    mockServiceMethods.submitCorrections.mockResolvedValue({ success: false });
    expect(await aiService.submitCorrections('a-1', corrections)).toBe(false);
  });

  it('returns false and logs on error', async () => {
    mockServiceMethods.submitCorrections.mockRejectedValue(
      new Error('correct')
    );
    expect(await aiService.submitCorrections('a-1', corrections)).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Correction submission failed:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('getUsageMetrics', () => {
  it('requests monthly metrics and returns data on success', async () => {
    mockServiceMethods.getUsageMetrics.mockResolvedValue({
      success: true,
      data: { calls: 5 },
    });
    expect(await aiService.getUsageMetrics()).toEqual({ calls: 5 });
    expect(mockServiceMethods.getUsageMetrics).toHaveBeenCalledWith('monthly');
  });

  it('returns null on unsuccessful response', async () => {
    mockServiceMethods.getUsageMetrics.mockResolvedValue({
      success: false,
      data: null,
    });
    expect(await aiService.getUsageMetrics()).toBeNull();
  });

  it('returns null and logs on error', async () => {
    mockServiceMethods.getUsageMetrics.mockRejectedValue(new Error('metrics'));
    expect(await aiService.getUsageMetrics()).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to fetch usage metrics:',
      expect.any(Error),
      { service: 'mobile' }
    );
  });
});

describe('autoAcceptBid', () => {
  it('forwards to completeAgentAction and returns success flag', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({ success: true });
    const ok = await aiService.autoAcceptBid('job-1', 'bid-1');
    expect(ok).toBe(true);
    expect(mockServiceMethods.completeAgentAction).toHaveBeenCalledWith(
      'BidAcceptanceAgent',
      'auto-accept',
      { jobId: 'job-1', bidId: 'bid-1' }
    );
  });

  it('returns false when action fails', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: false,
    });
    expect(await aiService.autoAcceptBid('job-1', 'bid-1')).toBe(false);
  });
});

describe('scheduleAppointment', () => {
  const times = [new Date('2026-01-01T10:00:00Z')];

  it('returns a Date when scheduling succeeds with appointmentTime', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: true,
      data: { appointmentTime: '2026-02-02T09:00:00Z' },
    });

    const result = await aiService.scheduleAppointment('job-1', 'c-1', times);

    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe('2026-02-02T09:00:00.000Z');
    expect(mockServiceMethods.completeAgentAction).toHaveBeenCalledWith(
      'SchedulingAgent',
      'schedule',
      { jobId: 'job-1', contractorId: 'c-1', preferredTimes: times }
    );
  });

  it('returns null when success but no appointmentTime in data', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: true,
      data: {},
    });
    expect(await aiService.scheduleAppointment('j', 'c', times)).toBeNull();
  });

  it('returns null when data is undefined', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: true,
      data: undefined,
    });
    expect(await aiService.scheduleAppointment('j', 'c', times)).toBeNull();
  });

  it('returns null when action is unsuccessful', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: false,
      data: { appointmentTime: '2026-02-02T09:00:00Z' },
    });
    expect(await aiService.scheduleAppointment('j', 'c', times)).toBeNull();
  });
});

describe('resolveDispute', () => {
  it('returns the raw data from the action', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: true,
      data: { resolution: 'refund' },
    });
    const result = await aiService.resolveDispute('job-1', { reason: 'x' });
    expect(result).toEqual({ resolution: 'refund' });
    expect(mockServiceMethods.completeAgentAction).toHaveBeenCalledWith(
      'DisputeResolutionAgent',
      'resolve',
      { jobId: 'job-1', disputeDetails: { reason: 'x' } }
    );
  });
});

describe('predictJobDemand', () => {
  it('returns the raw data from the action', async () => {
    mockServiceMethods.completeAgentAction.mockResolvedValue({
      success: true,
      data: { demand: 'high' },
    });
    const result = await aiService.predictJobDemand('plumbing', 'London');
    expect(result).toEqual({ demand: 'high' });
    expect(mockServiceMethods.completeAgentAction).toHaveBeenCalledWith(
      'PredictiveAgent',
      'predict-demand',
      { category: 'plumbing', location: 'London' }
    );
  });
});

describe('clearCache', () => {
  it('clears the underlying service cache and all stored assessments', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(['a-1', 'a-2']));

    await aiService.clearCache();

    expect(mockServiceMethods.clearCache).toHaveBeenCalledTimes(1);
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('assessment_a-1');
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('assessment_a-2');
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('assessment_ids');
  });

  it('clears service cache and only the id list when nothing stored', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    await aiService.clearCache();

    expect(mockServiceMethods.clearCache).toHaveBeenCalledTimes(1);
    // Only the id list itself is removed (no per-assessment removals).
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('assessment_ids');
  });
});

describe('getCacheStats', () => {
  it('delegates to the underlying service', () => {
    mockServiceMethods.getCacheStats.mockReturnValue({ hits: 3, misses: 1 });
    expect(aiService.getCacheStats()).toEqual({ hits: 3, misses: 1 });
    expect(mockServiceMethods.getCacheStats).toHaveBeenCalledTimes(1);
  });
});
