// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Edge Case Unit Tests for Agent Services
 *
 * Tests error handling, boundary conditions, and async operation failures
 * for PricingAgent, JobStatusAgent, EscrowReleaseAgent, and PredictiveAgent
 *
 * Uses the REAL public API methods from each agent class.
 */

// Hoist mocks so they survive mockReset
const mocks = vi.hoisted(() => {
  const fromMock = vi.fn();
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

// Override the global setup.ts mocks to use the REAL agent implementations
// (setup.ts globally mocks PricingAgent, JobStatusAgent, etc. with fake stubs)
vi.mock('@/lib/services/agents/PricingAgent', async () => {
  return await vi.importActual<typeof import('../PricingAgent')>('../PricingAgent');
});
vi.mock('@/lib/services/agents/JobStatusAgent', async () => {
  return await vi.importActual<typeof import('../JobStatusAgent')>('../JobStatusAgent');
});
vi.mock('@/lib/services/agents/EscrowReleaseAgent', async () => {
  return await vi.importActual<typeof import('../EscrowReleaseAgent')>('../EscrowReleaseAgent');
});
vi.mock('@/lib/services/agents/PredictiveAgent', async () => {
  return await vi.importActual<typeof import('../PredictiveAgent')>('../PredictiveAgent');
});
// Also mock transitive dependencies used by these agents
vi.mock('@/lib/services/agents/AgentLogger', () => ({
  AgentLogger: {
    logDecision: vi.fn().mockResolvedValue('log-1'),
    logRiskPrediction: vi.fn().mockResolvedValue('log-2'),
  },
}));
vi.mock('@/lib/services/agents/AutomationPreferencesService', () => ({
  AutomationPreferencesService: {
    getPreferences: vi.fn().mockResolvedValue(null),
    isAutomationEnabled: vi.fn().mockResolvedValue(false),
  },
}));
vi.mock('@/lib/job-state-machine', () => ({
  validateStatusTransition: vi.fn().mockReturnValue(true),
}));

import { PricingAgent } from '../PricingAgent';
import { JobStatusAgent } from '../JobStatusAgent';
import { EscrowReleaseAgent } from '../EscrowReleaseAgent';
import { PredictiveAgent } from '../PredictiveAgent';

/**
 * Helper: create a mock Supabase chain that returns given data/error
 * for a select().eq().single() chain.
 */
function mockSelectEqSingle(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data, error }),
        in: vi.fn(() => ({
          data: [],
          error: null,
        })),
        gte: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 0 })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data, error }),
    })),
  };
}

describe('PricingAgent - Edge Cases', () => {
  beforeEach(() => {
    // Re-setup mocks since mockReset clears them
    mocks.fromMock.mockReturnValue(mockSelectEqSingle(null, null));
    mocks.memoryManager.getOrCreateMemorySystem.mockResolvedValue({
      process: vi.fn().mockResolvedValue([0]),
      query: vi.fn().mockResolvedValue({ values: [], keys: [] }),
      addContextFlow: vi.fn().mockResolvedValue(undefined),
      incrementStep: vi.fn(),
      getMemoryLevels: vi.fn().mockReturnValue([]),
      updateMemoryLevel: vi.fn().mockResolvedValue({ updated: true }),
    });
  });

  describe('generateRecommendation - Error Handling', () => {
    it('should return null when job fetch fails with database error', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, { message: 'Database error' })
      );

      const result = await PricingAgent.generateRecommendation('test-job-id');

      // generateRecommendation returns null on error, not throws
      expect(result).toBeNull();
    });

    it('should return null when job data is missing', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, null)
      );

      const result = await PricingAgent.generateRecommendation('non-existent-job');

      expect(result).toBeNull();
    });

    it('should return null on empty job ID', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, { message: 'Invalid ID' })
      );

      const result = await PricingAgent.generateRecommendation('');

      expect(result).toBeNull();
    });
  });

  describe('generateRecommendation - Boundary Conditions', () => {
    it('should handle job with zero budget via fallback', async () => {
      // First call returns job, subsequent calls return empty market data
      mocks.fromMock.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return mockSelectEqSingle(
            { id: 'test-job', budget: 0, category: 'plumbing', location: '', title: 'Test', description: 'Test' },
            null
          );
        }
        // All other tables return empty data
        return mockSelectEqSingle(null, null);
      });

      const result = await PricingAgent.generateRecommendation('test-job');

      // With no market data (sampleSize < 3), returns budget-based fallback
      expect(result).toBeDefined();
      if (result) {
        expect(result.recommendedOptimalPrice).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle job with very high budget', async () => {
      mocks.fromMock.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return mockSelectEqSingle(
            { id: 'test-job', budget: 1000000, category: 'plumbing', location: '', title: 'Test', description: 'Test' },
            null
          );
        }
        return mockSelectEqSingle(null, null);
      });

      const result = await PricingAgent.generateRecommendation('test-job');

      expect(result).toBeDefined();
      if (result) {
        expect(result.recommendedOptimalPrice).toBeLessThanOrEqual(1500000);
      }
    });
  });
});

describe('JobStatusAgent - Edge Cases', () => {
  beforeEach(() => {
    mocks.fromMock.mockReturnValue(mockSelectEqSingle(null, null));
  });

  describe('evaluateAutoComplete - Error Handling', () => {
    it('should return null when job fetch fails', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, { message: 'Database error' })
      );

      const result = await JobStatusAgent.evaluateAutoComplete('test-job');

      expect(result).toBeNull();
    });

    it('should return null when job data is missing', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, null)
      );

      const result = await JobStatusAgent.evaluateAutoComplete('non-existent-job');

      expect(result).toBeNull();
    });

    it('should return null for non-in_progress jobs', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(
          { id: 'test-job', status: 'posted', contractor_id: 'c1', homeowner_id: 'h1' },
          null
        )
      );

      const result = await JobStatusAgent.evaluateAutoComplete('test-job');

      // Only evaluates in_progress jobs
      expect(result).toBeNull();
    });
  });

  describe('evaluateAutoComplete - Boundary Conditions', () => {
    it('should handle in_progress job without error', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(
          {
            id: 'test-job',
            status: 'in_progress',
            contractor_id: 'c1',
            homeowner_id: 'h1',
            scheduled_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          null
        )
      );

      // Should not throw
      const result = await JobStatusAgent.evaluateAutoComplete('test-job');
      // Result can be null or an AgentResult depending on auto-complete criteria
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});

describe('EscrowReleaseAgent - Edge Cases', () => {
  beforeEach(() => {
    mocks.fromMock.mockReturnValue(mockSelectEqSingle(null, null));
  });

  describe('verifyCompletionPhotos - Error Handling', () => {
    it('should return failed result when no photos provided', async () => {
      const result = await EscrowReleaseAgent.verifyCompletionPhotos(
        'escrow-1', 'job-1', []
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result.verificationScore).toBe(0);
        expect(result.status).toBe('failed');
      }
    });

    it('should return null when job fetch fails', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, { message: 'Database error' })
      );

      const result = await EscrowReleaseAgent.verifyCompletionPhotos(
        'escrow-1', 'non-existent-job', ['https://example.com/photo.jpg']
      );

      expect(result).toBeNull();
    });

    it('should return null when job data is missing', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, null)
      );

      const result = await EscrowReleaseAgent.verifyCompletionPhotos(
        'escrow-1', 'non-existent-job', ['https://example.com/photo.jpg']
      );

      expect(result).toBeNull();
    });
  });
});

describe('PredictiveAgent - Edge Cases', () => {
  beforeEach(() => {
    mocks.fromMock.mockReturnValue(mockSelectEqSingle(null, null));
    mocks.memoryManager.getOrCreateMemorySystem.mockResolvedValue({
      process: vi.fn().mockResolvedValue([0]),
      query: vi.fn().mockResolvedValue({ values: [], keys: [] }),
      addContextFlow: vi.fn().mockResolvedValue(undefined),
      incrementStep: vi.fn(),
      getMemoryLevels: vi.fn().mockReturnValue([]),
      updateMemoryLevel: vi.fn().mockResolvedValue({ updated: true }),
    });
  });

  describe('analyzeJob - Error Handling', () => {
    it('should return failure result when job fetch fails with null', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, null)
      );

      const results = await PredictiveAgent.analyzeJob('non-existent-job');

      // analyzeJob returns AgentResult[] with success: false, not throws
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(false);
    });

    it('should return failure result when job fetch fails with DB error', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(null, { message: 'Database error' })
      );

      const results = await PredictiveAgent.analyzeJob('test-job');

      expect(Array.isArray(results)).toBe(true);
      expect(results[0].success).toBe(false);
    });
  });

  describe('analyzeJob - Boundary Conditions', () => {
    it('should handle job with minimal data without throwing', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(
          {
            id: 'test-job',
            status: 'posted',
            homeowner_id: 'test-homeowner',
            budget: null,
            category: null,
            created_at: new Date().toISOString(),
          },
          null
        )
      );

      const results = await PredictiveAgent.analyzeJob('test-job');

      // With status 'posted' and minimal data, may return empty results (no risk found)
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle job with full data without throwing', async () => {
      mocks.fromMock.mockReturnValue(
        mockSelectEqSingle(
          {
            id: 'test-job',
            status: 'posted',
            homeowner_id: 'test-homeowner',
            contractor_id: 'test-contractor',
            budget: 5000,
            category: 'plumbing',
            scheduled_start_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          null
        )
      );

      const results = await PredictiveAgent.analyzeJob('test-job');

      // Returns array of risk assessments (may be empty if no risks detected)
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
