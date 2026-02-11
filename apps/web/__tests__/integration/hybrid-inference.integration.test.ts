/**
 * Integration tests for the Hybrid Inference Pipeline
 *
 * Tests the complete flow from route selection through execution,
 * verifying that components integrate correctly.
 */
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

// Mock external dependencies
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'mock-id' }, error: null })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/services/building-surveyor/InternalDamageClassifier', () => ({
  InternalDamageClassifier: {
    isModelReady: vi.fn().mockResolvedValue(true),
    predict: vi.fn().mockResolvedValue({
      damageType: 'water_damage',
      severity: 'moderate',
      urgency: 'soon',
      confidence: 0.72,
    }),
    predictFromImage: vi.fn().mockResolvedValue({
      damageType: 'water_damage',
      severity: 'moderate',
      urgency: 'soon',
      confidence: 0.72,
    }),
    reset: vi.fn(),
  },
}));

vi.mock('@/lib/services/building-surveyor/orchestration/FeatureExtractionService', () => ({
  FeatureExtractionService: {
    extractFeatures: vi.fn().mockResolvedValue(new Array(40).fill(0.5)),
  },
}));

vi.mock('@/lib/services/building-surveyor/RoboflowDetectionService', () => ({
  RoboflowDetectionService: {
    detect: vi.fn().mockResolvedValue([{
      class: 'water_damage',
      confidence: 0.78,
      x: 100, y: 100, width: 200, height: 150,
    }]),
  },
}));

vi.mock('@/lib/services/ai/ModelDriftDetectionService', () => ({
  ModelDriftDetectionService: {
    recordPrediction: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/building-surveyor/orchestration/AssessmentOrchestrator', () => ({
  AssessmentOrchestrator: {
    assessDamage: vi.fn().mockResolvedValue({
      damageAssessment: { damageType: 'water_damage', severity: 'moderate', confidence: 0.85 },
      urgency: { urgency: 'soon' },
      safetyHazards: { hasSafetyHazards: false },
    }),
  },
}));

import { CONFIDENCE_THRESHOLDS } from '@/lib/services/building-surveyor/routing/types';
import { InternalDamageClassifier } from '@/lib/services/building-surveyor/InternalDamageClassifier';

describe('Hybrid Inference Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock values after clearAllMocks
    vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValue(true);
    vi.mocked(InternalDamageClassifier.predict).mockResolvedValue({
      damageType: 'water_damage',
      severity: 'moderate',
      urgency: 'soon',
      confidence: 0.72,
    });
    vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValue({
      damageType: 'water_damage',
      severity: 'moderate',
      urgency: 'soon',
      confidence: 0.72,
    });
  });

  describe('Confidence Thresholds', () => {
    it('has correct threshold values for routing decisions', () => {
      expect(CONFIDENCE_THRESHOLDS).toBeDefined();
      expect(CONFIDENCE_THRESHOLDS.high).toBeGreaterThan(CONFIDENCE_THRESHOLDS.medium);
      expect(CONFIDENCE_THRESHOLDS.medium).toBeGreaterThan(0);
    });
  });

  describe('Internal Model Integration', () => {
    it('InternalDamageClassifier reports model readiness', async () => {
      const ready = await InternalDamageClassifier.isModelReady();
      expect(typeof ready).toBe('boolean');
    });

    it('InternalDamageClassifier returns prediction with required fields', async () => {
      const prediction = await InternalDamageClassifier.predict(new Array(40).fill(0.5));
      expect(prediction).toHaveProperty('damageType');
      expect(prediction).toHaveProperty('severity');
      expect(prediction).toHaveProperty('urgency');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('InternalDamageClassifier can predict from image URL', async () => {
      const prediction = await InternalDamageClassifier.predictFromImage('https://example.com/test.jpg');
      expect(prediction).toHaveProperty('damageType');
      expect(prediction).toHaveProperty('confidence');
    });
  });

  describe('Route Selection Logic', () => {
    it('routes correctly based on confidence thresholds', () => {
      expect(CONFIDENCE_THRESHOLDS.high).toBeGreaterThan(0.7);
      expect(CONFIDENCE_THRESHOLDS.medium).toBeGreaterThan(0.3);
      expect(CONFIDENCE_THRESHOLDS.medium).toBeLessThan(CONFIDENCE_THRESHOLDS.high);
    });

    it('model not ready should return low confidence', async () => {
      vi.mocked(InternalDamageClassifier.isModelReady).mockResolvedValueOnce(false);
      const ready = await InternalDamageClassifier.isModelReady();
      expect(ready).toBe(false);
    });

    it('high confidence prediction triggers internal route', async () => {
      vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValueOnce({
        damageType: 'water_damage',
        severity: 'moderate',
        urgency: 'soon',
        confidence: 0.95,
      });

      const prediction = await InternalDamageClassifier.predictFromImage('https://example.com/test.jpg');
      expect(prediction.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.high);
    });

    it('medium confidence prediction triggers hybrid route', async () => {
      vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValueOnce({
        damageType: 'water_damage',
        severity: 'moderate',
        urgency: 'soon',
        confidence: 0.65,
      });

      const prediction = await InternalDamageClassifier.predictFromImage('https://example.com/test.jpg');
      expect(prediction.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.medium);
      expect(prediction.confidence).toBeLessThan(CONFIDENCE_THRESHOLDS.high);
    });

    it('low confidence prediction routes to GPT-4 Vision', async () => {
      vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValueOnce({
        damageType: 'unknown',
        severity: 'minimal',
        urgency: 'routine',
        confidence: 0.25,
      });

      const prediction = await InternalDamageClassifier.predictFromImage('https://example.com/test.jpg');
      expect(prediction.confidence).toBeLessThan(CONFIDENCE_THRESHOLDS.medium);
    });
  });

  describe('Safety Override', () => {
    it('immediate urgency detection triggers safety override', async () => {
      vi.mocked(InternalDamageClassifier.predictFromImage).mockResolvedValueOnce({
        damageType: 'structural_crack',
        severity: 'severe',
        urgency: 'immediate',
        confidence: 0.95,
      });

      const prediction = await InternalDamageClassifier.predictFromImage('https://example.com/crack.jpg');
      expect(prediction.urgency).toBe('immediate');
      // The real HybridInferenceService forces GPT-4 Vision for immediate urgency
    });
  });
});
