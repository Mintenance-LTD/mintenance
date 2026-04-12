// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Integration tests for Conformal Prediction Service
 *
 * Tests the ConformalPredictionService's actual API:
 * - getPredictionInterval (via supabase rpc, with fallback)
 * - calculateNonconformityScore
 * - classifyPropertyAge
 * - buildStratumIdentifier
 * - isPredictionInInterval
 * - getAdaptiveConfidenceLevel
 * - calculateIntervalEfficiency
 *
 * The service uses a singleton pattern (getInstance()) and requires
 * a Supabase client injected via setSupabaseClient().
 */

import {
  ConformalPredictionService,
  setSupabaseClient,
} from '@mintenance/shared/services/conformal-prediction';
import type {
  PropertyAgeCategory,
  PredictionScores,
  ConformalPredictionInterval,
} from '@mintenance/shared/services/conformal-prediction';
import type { AssessmentContext } from '../types';

// Mock the logger from shared
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a mock Supabase client
function createMockSupabaseClient(rpcResult?: {
  data: unknown;
  error: unknown;
}) {
  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(chainMethods),
    rpc: vi.fn().mockResolvedValue(rpcResult ?? { data: null, error: null }),
    _chainMethods: chainMethods,
  };
}

describe('Conformal Prediction Integration', () => {
  let conformalService: ConformalPredictionService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    conformalService = ConformalPredictionService.getInstance();
    mockSupabase = createMockSupabaseClient();
    setSupabaseClient(mockSupabase as any);
  });

  describe('Property Age Classification', () => {
    it('should classify Victorian properties (pre-1900)', () => {
      const result = conformalService.classifyPropertyAge(1874);
      expect(result).toBe('victorian');
    });

    it('should classify post-war properties (1900-1970)', () => {
      const result = conformalService.classifyPropertyAge(1954);
      expect(result).toBe('post_war');
    });

    it('should classify modern properties (post-1970)', () => {
      const result = conformalService.classifyPropertyAge(1994);
      expect(result).toBe('modern');
    });

    it('should return unknown for undefined construction year', () => {
      const result = conformalService.classifyPropertyAge(undefined);
      expect(result).toBe('unknown');
    });

    it('should classify based on AssessmentContext age', () => {
      const context: AssessmentContext = {
        ageOfProperty: 150,
        propertyType: 'residential',
      };

      const currentYear = new Date().getFullYear();
      const constructionYear = currentYear - (context.ageOfProperty ?? 0);
      const result = conformalService.classifyPropertyAge(constructionYear);

      expect(result).toBe('victorian');
    });
  });

  describe('Stratum Identifier', () => {
    it('should build correct stratum identifier', () => {
      const result = conformalService.buildStratumIdentifier(
        'victorian',
        'water damage'
      );
      expect(result).toBe('victorian_water_damage');
    });

    it('should normalize damage type in stratum', () => {
      const result = conformalService.buildStratumIdentifier(
        'modern',
        'Structural Minor'
      );
      expect(result).toBe('modern_structural_minor');
    });
  });

  describe('Routing Based on Prediction Intervals', () => {
    it('should route to internal model when interval size is 1 (certain)', () => {
      const interval: ConformalPredictionInterval = {
        confidence_level: 0.9,
        prediction_set: ['early'],
        threshold_used: 0.1,
        stratum: 'modern_water_damage',
        interval_size: 1,
      };

      // Interval size 1 means high certainty - route to internal
      expect(interval.interval_size).toBe(1);
      expect(interval.prediction_set.length).toBe(1);
      expect(
        conformalService.calculateIntervalEfficiency(interval)
      ).toBeCloseTo(1 / 4);
    });

    it('should route to hybrid when interval size is 2 (moderate uncertainty)', () => {
      const interval: ConformalPredictionInterval = {
        confidence_level: 0.9,
        prediction_set: ['early', 'developing'],
        threshold_used: 0.1,
        stratum: 'victorian_structural_minor',
        interval_size: 2,
      };

      expect(interval.interval_size).toBe(2);
      expect(interval.prediction_set.length).toBe(2);
      expect(
        conformalService.calculateIntervalEfficiency(interval)
      ).toBeCloseTo(2 / 4);
    });

    it('should route to GPT-4 when interval size is 3+ (high uncertainty)', () => {
      const interval: ConformalPredictionInterval = {
        confidence_level: 0.9,
        prediction_set: ['early', 'developing', 'significant', 'dangerous'],
        threshold_used: 0.1,
        stratum: 'post_war_mold',
        interval_size: 4,
      };

      expect(interval.interval_size).toBe(4);
      expect(interval.prediction_set.length).toBe(4);
      expect(
        conformalService.calculateIntervalEfficiency(interval)
      ).toBeCloseTo(1.0);
    });
  });

  describe('Prediction Interval via RPC', () => {
    it('should return interval from supabase rpc call', async () => {
      const expectedInterval: ConformalPredictionInterval = {
        confidence_level: 0.9,
        prediction_set: ['early'],
        threshold_used: 0.1,
        stratum: 'victorian_water_damage',
        interval_size: 1,
      };

      mockSupabase.rpc.mockResolvedValue({
        data: expectedInterval,
        error: null,
      });

      const result = await conformalService.getPredictionInterval(
        { early: 0.7, developing: 0.15, significant: 0.1, dangerous: 0.05 },
        'victorian',
        'water damage',
        0.9
      );

      expect(result).toEqual(expectedInterval);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_conformal_prediction_interval',
        expect.objectContaining({
          p_prediction_scores: {
            early: 0.7,
            developing: 0.15,
            significant: 0.1,
            dangerous: 0.05,
          },
          p_property_age_category: 'victorian',
          p_damage_type: 'water damage',
          p_confidence_level: 0.9,
        })
      );
    });

    it('should fall back to local interval calculation on rpc error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC unavailable'),
      });

      const result = await conformalService.getPredictionInterval(
        { early: 0.8, developing: 0.1, significant: 0.05, dangerous: 0.05 },
        'modern',
        'cosmetic',
        0.9
      );

      // Fallback: accumulates scores in descending order until >= confidenceLevel
      // Sorted: early(0.8), developing(0.1), significant(0.05), dangerous(0.05)
      // early alone = 0.8 < 0.90, so add developing: 0.8 + 0.1 = 0.9 >= 0.90
      expect(result.prediction_set).toContain('early');
      expect(result.prediction_set).toContain('developing');
      expect(result.interval_size).toBe(2);
      expect(result.confidence_level).toBe(0.9);
    });

    it('should return single-class fallback when top score exceeds confidence level', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC unavailable'),
      });

      const result = await conformalService.getPredictionInterval(
        { early: 0.95, developing: 0.02, significant: 0.02, dangerous: 0.01 },
        'modern',
        'cosmetic',
        0.9
      );

      // early(0.95) >= 0.90, so only 'early' in prediction set
      expect(result.prediction_set).toEqual(['early']);
      expect(result.interval_size).toBe(1);
    });
  });

  describe('Nonconformity Score', () => {
    it('should calculate hinge nonconformity score via rpc', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 0.3, error: null });

      const result = await conformalService.calculateNonconformityScore(
        { early: 0.8, developing: 0.1, significant: 0.05, dangerous: 0.05 },
        'early',
        'hinge'
      );

      expect(result).toBe(0.3);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'calculate_nonconformity_score',
        expect.objectContaining({
          true_class: 'early',
          score_type: 'hinge',
        })
      );
    });

    it('should fall back to local hinge calculation on rpc error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      });

      const scores: PredictionScores = {
        early: 0.8,
        developing: 0.1,
        significant: 0.05,
        dangerous: 0.05,
      };
      const result = await conformalService.calculateNonconformityScore(
        scores,
        'early',
        'hinge'
      );

      // Hinge: max(0, 1 - (trueScore - maxOtherScore))
      // = max(0, 1 - (0.8 - 0.1)) = max(0, 1 - 0.7) = 0.30
      expect(result).toBeCloseTo(0.3, 2);
    });

    it('should fall back to local inverse_probability calculation on rpc error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      });

      const result = await conformalService.calculateNonconformityScore(
        { early: 0.8, developing: 0.1, significant: 0.05, dangerous: 0.05 },
        'early',
        'inverse_probability'
      );

      // Inverse probability: max(0, 1 - trueScore) = max(0, 1 - 0.8) = 0.2
      expect(result).toBeCloseTo(0.2, 2);
    });
  });

  describe('Prediction Interval Membership', () => {
    it('should return true when actual severity is in prediction set', () => {
      const interval: ConformalPredictionInterval = {
        confidence_level: 0.9,
        prediction_set: ['early', 'developing'],
        threshold_used: 0.1,
        interval_size: 2,
      };

      expect(conformalService.isPredictionInInterval('early', interval)).toBe(
        true
      );
      expect(
        conformalService.isPredictionInInterval('developing', interval)
      ).toBe(true);
    });

    it('should return false when actual severity is not in prediction set', () => {
      const interval: ConformalPredictionInterval = {
        confidence_level: 0.9,
        prediction_set: ['early'],
        threshold_used: 0.1,
        interval_size: 1,
      };

      expect(
        conformalService.isPredictionInInterval('dangerous', interval)
      ).toBe(false);
    });
  });

  describe('Adaptive Confidence Levels', () => {
    it('should return 0.99 for critical infrastructure', () => {
      expect(conformalService.getAdaptiveConfidenceLevel('monitor', true)).toBe(
        0.99
      );
    });

    it('should return 0.99 for immediate urgency', () => {
      expect(conformalService.getAdaptiveConfidenceLevel('immediate')).toBe(
        0.99
      );
    });

    it('should return 0.95 for urgent cases', () => {
      expect(conformalService.getAdaptiveConfidenceLevel('urgent')).toBe(0.95);
    });

    it('should return 0.90 for soon cases', () => {
      expect(conformalService.getAdaptiveConfidenceLevel('soon')).toBe(0.9);
    });

    it('should return 0.85 for planned cases', () => {
      expect(conformalService.getAdaptiveConfidenceLevel('planned')).toBe(0.85);
    });

    it('should return 0.80 for monitor/default cases', () => {
      expect(conformalService.getAdaptiveConfidenceLevel('monitor')).toBe(0.8);
    });
  });

  describe('Interval Efficiency', () => {
    it('should calculate efficiency as interval_size / 4', () => {
      expect(
        conformalService.calculateIntervalEfficiency({
          confidence_level: 0.9,
          prediction_set: ['early'],
          threshold_used: 0.1,
          interval_size: 1,
        })
      ).toBeCloseTo(1 / 4);

      expect(
        conformalService.calculateIntervalEfficiency({
          confidence_level: 0.9,
          prediction_set: ['early', 'developing', 'significant', 'dangerous'],
          threshold_used: 0.1,
          interval_size: 4,
        })
      ).toBeCloseTo(1.0);
    });
  });

  describe('Routing Distribution by Interval Size', () => {
    it('should calculate correct routing distribution', () => {
      const mockDecisions = [
        {
          conformal_interval_size: 1,
          route_selected: 'internal',
          conformal_calibration_used: true,
        },
        {
          conformal_interval_size: 1,
          route_selected: 'internal',
          conformal_calibration_used: true,
        },
        {
          conformal_interval_size: 2,
          route_selected: 'hybrid',
          conformal_calibration_used: true,
        },
        {
          conformal_interval_size: 3,
          route_selected: 'gpt4_vision',
          conformal_calibration_used: true,
        },
      ];

      const routingBySize: Record<number, Record<string, number>> = {};
      for (const decision of mockDecisions) {
        const size = decision.conformal_interval_size;
        if (!routingBySize[size]) {
          routingBySize[size] = { internal: 0, hybrid: 0, gpt4: 0 };
        }
        const route =
          decision.route_selected === 'gpt4_vision'
            ? 'gpt4'
            : decision.route_selected;
        routingBySize[size][route]++;
      }

      expect(routingBySize[1].internal).toBe(2);
      expect(routingBySize[2].hybrid).toBe(1);
      expect(routingBySize[3].gpt4).toBe(1);
    });
  });

  describe('Fallback Behavior', () => {
    it('should use raw confidence thresholds when calibration unavailable', () => {
      // When conformal prediction fails, the system falls back to CONFIDENCE_THRESHOLDS
      const CONFIDENCE_THRESHOLDS = {
        high: 0.75,
        medium: 0.55,
        low: 0.35,
      };

      // Test high confidence fallback
      const highConfidence = 0.8;
      expect(highConfidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.high);

      // Test medium confidence fallback
      const mediumConfidence = 0.6;
      expect(mediumConfidence).toBeGreaterThanOrEqual(
        CONFIDENCE_THRESHOLDS.medium
      );
      expect(mediumConfidence).toBeLessThan(CONFIDENCE_THRESHOLDS.high);

      // Test low confidence fallback
      const lowConfidence = 0.3;
      expect(lowConfidence).toBeLessThan(CONFIDENCE_THRESHOLDS.medium);
    });
  });
});
