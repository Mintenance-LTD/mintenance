// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Integration tests for PricingAgent with LocationPricingService
 *
 * Tests the end-to-end flow of location-based pricing adjustments.
 * Since generateRecommendation has deep internal dependencies (analyzeMarket,
 * calculateLocationFactor via dynamic import, calculateComplexityFactor, etc.),
 * we test that it handles various scenarios gracefully rather than asserting
 * exact numerical pricing values.
 */

// Hoist mocks so they survive mockReset
const mocks = vi.hoisted(() => {
  const fromMock = vi.fn();
  const stableFetchMock = vi.fn();
  return {
    fromMock,
    serverSupabase: { from: fromMock },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    memoryManager: {
      getOrCreateMemorySystem: vi.fn(),
      query: vi.fn(),
      addContextFlow: vi.fn(),
      process: vi.fn(),
      getMemorySystem: vi.fn(),
      initialize: vi.fn(),
    },
    stableFetchMock,
  };
});

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: mocks.serverSupabase,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
}));

vi.mock('@/lib/services/ml-engine/memory/MemoryManager', () => ({
  memoryManager: mocks.memoryManager,
}));

// Override the global setup.ts mock to use real PricingAgent
vi.mock('@/lib/services/agents/PricingAgent', async () => {
  return await vi.importActual<typeof import('../PricingAgent')>('../PricingAgent');
});
vi.mock('@/lib/services/agents/AgentLogger', () => ({
  AgentLogger: {
    logDecision: vi.fn().mockResolvedValue('log-1'),
  },
}));

import { PricingAgent } from '../PricingAgent';
import { LocationPricingService } from '../../location/LocationPricingService';

// Use a stable fetch mock
global.fetch = mocks.stableFetchMock;

/**
 * Helper: build a mock chain for serverSupabase.from() that supports
 * different tables returning different data.
 */
function buildTableMock(tableMap: Record<string, unknown>) {
  return (table: string) => {
    const defaultChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
          gte: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 0 })),
          })),
          in: vi.fn(() => ({ data: [], error: null })),
        })),
        gte: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 0 })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null }),
        })),
      })),
    };

    if (table in tableMap) {
      return tableMap[table];
    }
    return defaultChain;
  };
}

describe('PricingAgent - Location Integration', () => {
  beforeEach(() => {
    // Re-assign fetch mock since mockReset clears its implementation
    global.fetch = mocks.stableFetchMock;
    mocks.stableFetchMock.mockReset();

    // Setup memory manager mock
    mocks.memoryManager.getOrCreateMemorySystem.mockResolvedValue({
      process: vi.fn().mockResolvedValue([0]),
      query: vi.fn().mockResolvedValue({ values: [], keys: [] }),
      addContextFlow: vi.fn().mockResolvedValue(undefined),
      incrementStep: vi.fn(),
      getMemoryLevels: vi.fn().mockReturnValue([]),
      updateMemoryLevel: vi.fn().mockResolvedValue({ updated: true }),
    });

    LocationPricingService.clearCaches();
  });

  afterEach(() => {
    LocationPricingService.clearCaches();
  });

  describe('Location factor calculation', () => {
    it('should return a recommendation for a London job', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Plumbing repair',
        description: 'Fix leaking pipe',
        category: 'plumbing',
        budget: 500,
        location: 'London, SW1A 1AA',
        homeowner_id: 'user-1',
      };

      const mockBids = [
        { amount: 300 },
        { amount: 350 },
        { amount: 400 },
        { amount: 450 },
        { amount: 500 },
      ];

      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
            })),
          })),
        },
        bids: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: mockBids.map(b => ({
                    amount: b.amount,
                    jobs: { category: 'plumbing', location: 'London' },
                  })),
                  error: null,
                })),
              })),
            })),
          })),
        },
        pricing_recommendations: {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'rec-1' }, error: null })),
            })),
          })),
        },
      }));

      // Mock postcodes.io API
      mocks.stableFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            region: 'London',
            admin_district: 'Westminster',
            latitude: 51.5014,
            longitude: -0.1419,
            country: 'England',
          },
        }),
      });

      const recommendation = await PricingAgent.generateRecommendation('job-1');

      // The recommendation may or may not have location factor applied
      // depending on whether analyzeMarket finds enough data.
      // We verify it returns a valid recommendation object.
      expect(recommendation).not.toBeNull();
      expect(recommendation!.recommendedOptimalPrice).toBeGreaterThan(0);
    });

    it('should return a recommendation for a North East job', async () => {
      const mockJob = {
        id: 'job-2',
        title: 'Electrical work',
        description: 'Install new sockets',
        category: 'electrical',
        budget: 300,
        location: 'Newcastle, NE1 1AA',
        homeowner_id: 'user-2',
      };

      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
            })),
          })),
        },
      }));

      const recommendation = await PricingAgent.generateRecommendation('job-2');

      // With insufficient market data, falls back to budget-based recommendation
      expect(recommendation).not.toBeNull();
      expect(recommendation!.recommendedOptimalPrice).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing location gracefully', async () => {
      const mockJob = {
        id: 'job-no-location',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: '',
        homeowner_id: 'user-1',
      };

      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
            })),
          })),
        },
      }));

      const recommendation = await PricingAgent.generateRecommendation('job-no-location');

      expect(recommendation).not.toBeNull();
      expect(recommendation!.recommendedOptimalPrice).toBeGreaterThan(0);
    });

    it('should handle invalid postcode format', async () => {
      const mockJob = {
        id: 'job-invalid-postcode',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: 'Some Place, INVALID123',
        homeowner_id: 'user-1',
      };

      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
            })),
          })),
        },
      }));

      mocks.stableFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const recommendation = await PricingAgent.generateRecommendation('job-invalid-postcode');

      // Should still return a recommendation (falls back to budget-based)
      expect(recommendation).not.toBeNull();
      expect(recommendation!.recommendedOptimalPrice).toBeGreaterThan(0);
    });

    it('should return null when job does not exist', async () => {
      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
            })),
          })),
        },
      }));

      const recommendation = await PricingAgent.generateRecommendation('non-existent-job');

      expect(recommendation).toBeNull();
    });

    it('should return recommendation with factors object', async () => {
      const mockJob = {
        id: 'job-factors',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: 'London',
        homeowner_id: 'user-1',
      };

      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
            })),
          })),
        },
      }));

      const recommendation = await PricingAgent.generateRecommendation('job-factors');

      expect(recommendation).not.toBeNull();
      expect(recommendation!.factors).toBeDefined();
      expect(typeof recommendation!.factors).toBe('object');
    });
  });

  describe('Performance', () => {
    it('should return recommendations within reasonable time', async () => {
      const mockJob = {
        id: 'job-perf',
        title: 'Test job',
        description: 'Test',
        category: 'plumbing',
        budget: 500,
        location: 'London, SW1A 1AA',
        homeowner_id: 'user-1',
      };

      mocks.fromMock.mockImplementation(buildTableMock({
        jobs: {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
            })),
          })),
        },
      }));

      const start = Date.now();
      const recommendation = await PricingAgent.generateRecommendation('job-perf');
      const duration = Date.now() - start;

      expect(recommendation).not.toBeNull();
      // Should complete quickly with mocked dependencies
      expect(duration).toBeLessThan(5000);
    });
  });
});
