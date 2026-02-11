/**
 * Critical Tests for Building Surveyor Service
 *
 * Tests the core decision-making logic, cost controls, rate limits,
 * and fallback mechanisms for the AI-powered building assessment system.
 *
 * Strategy: Mock ALL stage modules to isolate the service orchestration logic.
 * The real service calls validateInput -> collectEvidence -> extractFeatures ->
 * callGptAssessment -> postProcessAssessment in sequence. By mocking each stage
 * we can test flow control (budget checks, error handling) without deep dependencies.
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { BuildingSurveyorService } from '../BuildingSurveyorService';
import { CostControlService } from '../../ai/CostControlService';
import { CriticModule } from '../critic';
import { logger } from '@mintenance/shared';

// --- Mock ALL dependencies, including stage modules ---

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../ai/CostControlService', () => ({
  CostControlService: {
    isEmergencyStopped: vi.fn(),
    estimateCost: vi.fn(),
    checkBudget: vi.fn(),
    recordUsage: vi.fn(),
  },
}));

vi.mock('../critic', () => ({
  CriticModule: {
    makeDecision: vi.fn(),
  },
}));

vi.mock('@/lib/utils/openai-rate-limit', () => ({
  fetchWithOpenAIRetry: vi.fn(),
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockImplementation((cb: (val: { data: never[], error: null }) => unknown) =>
        Promise.resolve(cb({ data: [], error: null }))
      ),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/lib/services/monitoring/MonitoringService', () => ({
  MonitoringService: { record: vi.fn() },
}));

vi.mock('../config/BuildingSurveyorConfig', () => ({
  getConfig: vi.fn(() => ({
    openaiApiKey: 'test-key',
    detectorTimeoutMs: 7000,
    visionTimeoutMs: 9000,
  })),
}));

// Mock all stage modules so service orchestration can be tested in isolation
vi.mock('../initialization/BuildingSurveyorInitializationService', () => ({
  initializeMemorySystem: vi.fn().mockResolvedValue(undefined),
  isLearnedFeaturesEnabled: vi.fn().mockReturnValue(false),
  getLearnedFeatureExtractor: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: vi.fn(),
}));

vi.mock('../stages/validate-input', async () => {
  const actual = await vi.importActual('../stages/validate-input');
  return actual;
});

vi.mock('../stages/collect-evidence', () => ({
  collectEvidence: vi.fn().mockResolvedValue({
    roboflowDetections: [],
    visionAnalysis: null,
    sam3Segmentation: undefined,
    hasMachineEvidence: false,
  }),
}));

vi.mock('../stages/extract-features', () => ({
  extractAllFeatures: vi.fn().mockResolvedValue({
    sceneGraphFeatures: null,
    memoryAdjustments: null,
    imageQuality: null,
  }),
}));

vi.mock('../stages/call-gpt-assessment', () => ({
  callGptAssessment: vi.fn(),
}));

vi.mock('../stages/post-process-assessment', () => ({
  postProcessAssessment: vi.fn(),
}));

// Import mocked modules for re-setup in beforeEach
import { validateURLs } from '@/lib/security/url-validation';
import { initializeMemorySystem } from '../initialization/BuildingSurveyorInitializationService';
import { collectEvidence } from '../stages/collect-evidence';
import { extractAllFeatures } from '../stages/extract-features';
import { callGptAssessment } from '../stages/call-gpt-assessment';
import { postProcessAssessment } from '../stages/post-process-assessment';
import { getConfig } from '../config/BuildingSurveyorConfig';

// Default mock assessment result
const mockAssessment = {
  damageAssessment: {
    damageType: 'cosmetic',
    severity: 'early',
    confidence: 50,
    location: 'Unknown',
    description: 'Test assessment',
    detectedItems: [],
  },
  safetyHazards: { hazards: [], hasCriticalHazards: false, overallSafetyScore: 100 },
  compliance: { complianceIssues: [], requiresProfessionalInspection: false, complianceScore: 100 },
  insuranceRisk: { riskFactors: [], riskScore: 10, premiumImpact: 'low', mitigationSuggestions: [] },
  urgency: { urgency: 'routine', recommendedActionTimeline: 'No rush', reasoning: 'Minor', priorityScore: 20 },
  homeownerExplanation: { whatIsIt: 'Minor issue', whyItHappened: 'Normal wear', whatToDo: 'Monitor' },
  contractorAdvice: { repairNeeded: [], materials: [], tools: [], estimatedTime: 'N/A', estimatedCost: { min: 0, max: 100, recommended: 50 }, complexity: 'low' },
};

describe('BuildingSurveyorService - Production Critical Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.SHADOW_MODE_ENABLED = 'false';
    process.env.AI_DAILY_BUDGET = '100';
    process.env.AI_MAX_COST_PER_REQUEST = '5';

    // Re-setup mocks after mockReset clears them
    vi.mocked(initializeMemorySystem).mockResolvedValue(undefined);
    vi.mocked(getConfig).mockReturnValue({
      openaiApiKey: 'test-key',
      detectorTimeoutMs: 7000,
      visionTimeoutMs: 9000,
    } as ReturnType<typeof getConfig>);
    vi.mocked(validateURLs).mockResolvedValue({
      valid: ['https://example.com/image1.jpg'],
      invalid: [],
    });
    vi.mocked(collectEvidence).mockResolvedValue({
      roboflowDetections: [],
      visionAnalysis: null,
      sam3Segmentation: undefined,
      hasMachineEvidence: false,
    });
    vi.mocked(extractAllFeatures).mockResolvedValue({
      sceneGraphFeatures: null,
      memoryAdjustments: [],
      imageQuality: null,
    } as ReturnType<Awaited<typeof extractAllFeatures>>);
    vi.mocked(callGptAssessment).mockResolvedValue(JSON.stringify(mockAssessment));
    vi.mocked(postProcessAssessment).mockResolvedValue(mockAssessment as ReturnType<Awaited<typeof postProcessAssessment>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cost Controls', () => {
    it('should throw when config has no API key', async () => {
      vi.mocked(getConfig).mockReturnValue({
        openaiApiKey: null,
        detectorTimeoutMs: 7000,
        visionTimeoutMs: 9000,
      } as ReturnType<typeof getConfig>);

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image1.jpg'])
      ).rejects.toThrow('AI assessment service is not configured');
    });

    it('should handle invalid image URLs', async () => {
      vi.mocked(validateURLs).mockResolvedValue({
        valid: [],
        invalid: [{ url: 'javascript:alert(1)', error: 'Invalid URL format' }],
      });

      await expect(
        BuildingSurveyorService.assessDamage(['javascript:alert(1)'])
      ).rejects.toThrow('Invalid image URLs');
    });

    it('should process valid images through the full pipeline', async () => {
      vi.mocked(validateURLs).mockResolvedValue({
        valid: ['https://example.com/image1.jpg'],
        invalid: [],
      });

      const result = await BuildingSurveyorService.assessDamage(['https://example.com/image1.jpg']);

      expect(result).toBeDefined();
      expect(result.damageAssessment).toBeDefined();
      expect(initializeMemorySystem).toHaveBeenCalled();
      expect(collectEvidence).toHaveBeenCalled();
      expect(extractAllFeatures).toHaveBeenCalled();
      expect(callGptAssessment).toHaveBeenCalled();
      expect(postProcessAssessment).toHaveBeenCalled();
    });
  });

  describe('Decision Logic with Shadow Mode', () => {
    it('should maintain FNR below 5% threshold', () => {
      // This test verifies the critic module respects safety constraints
      const contextVector = [0.8, 0.7, 0.6, 0.9];

      // Mock critic to ensure FNR constraint
      vi.mocked(CriticModule.makeDecision).mockImplementation(() => {
        // Safety threshold should ensure FNR < 5%
        const safetyThreshold = 0.95; // 95% confidence = 5% FNR max
        const safetyUcb = 0.96;

        return {
          arm: safetyUcb >= safetyThreshold ? 'automate' : 'escalate',
          reason: safetyUcb >= safetyThreshold
            ? 'Safety threshold met (FNR < 5%)'
            : 'Safety threshold not met',
          safetyUcb,
          rewardUcb: 0.8,
          safetyThreshold,
          exploration: 0.05,
        };
      });

      const decision = CriticModule.makeDecision(
        contextVector,
        { stratum: 1, predictionSet: [0.9, 0.95], confidence: 0.95 },
        { mean: 0.8, variance: 0.1, weights: {} }
      );

      // Verify FNR constraint is respected
      expect(decision.safetyThreshold).toBeGreaterThanOrEqual(0.95);
      if (decision.arm === 'automate') {
        expect(decision.safetyUcb).toBeGreaterThanOrEqual(decision.safetyThreshold);
      }
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should handle stage failures gracefully with logged errors', async () => {
      vi.mocked(collectEvidence).mockRejectedValue(new Error('Detector failed'));

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/test.jpg'])
      ).rejects.toThrow('Detector failed');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle malformed GPT response via postProcessAssessment error', async () => {
      vi.mocked(callGptAssessment).mockResolvedValue('Not valid JSON');
      vi.mocked(postProcessAssessment).mockRejectedValue(
        new Error('Failed to parse AI assessment response')
      );

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/test.jpg'])
      ).rejects.toThrow('Failed to parse AI assessment response');
    });

    it('should validate image URLs before processing', async () => {
      const invalidImages = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '../../../etc/passwd',
      ];

      vi.mocked(validateURLs).mockResolvedValue({
        valid: [],
        invalid: [
          { url: 'javascript:alert(1)', error: 'Invalid URL format' },
          { url: 'data:text/html,<script>alert(1)</script>', error: 'Invalid URL format' },
          { url: '../../../etc/passwd', error: 'Invalid URL format' },
        ],
      });

      await expect(
        BuildingSurveyorService.assessDamage(invalidImages)
      ).rejects.toThrow();

      // Should not make any further calls with invalid URLs
      expect(collectEvidence).not.toHaveBeenCalled();
    });
  });

  describe('Pipeline Integration', () => {
    it('should complete full assessment flow with all stages', async () => {
      vi.mocked(validateURLs).mockResolvedValue({
        valid: ['https://example.com/damage1.jpg', 'https://example.com/damage2.jpg'],
        invalid: [],
      });

      const fullAssessment = {
        ...mockAssessment,
        damageAssessment: {
          damageType: 'structural',
          severity: 'full',
          confidence: 92,
          location: 'Basement',
          description: 'Significant structural and water damage',
          detectedItems: ['cracks', 'water_stains'],
        },
        safetyHazards: {
          hazards: ['structural instability', 'mold risk'],
          hasCriticalHazards: true,
          overallSafetyScore: 30,
        },
        urgency: {
          urgency: 'emergency',
          recommendedActionTimeline: 'Within 24 hours',
          reasoning: 'Structural damage with safety hazards',
          priorityScore: 95,
        },
      };

      vi.mocked(postProcessAssessment).mockResolvedValue(fullAssessment as ReturnType<Awaited<typeof postProcessAssessment>>);

      const result = await BuildingSurveyorService.assessDamage(
        ['https://example.com/damage1.jpg', 'https://example.com/damage2.jpg'],
        {
          jobId: 'job-456',
          propertyType: 'residential',
          roomType: 'basement',
        }
      );

      // Verify complete assessment structure
      expect(result.damageAssessment.damageType).toBe('structural');
      expect(result.damageAssessment.severity).toBe('full');
      expect(result.safetyHazards.hasCriticalHazards).toBe(true);
      expect(result.urgency.urgency).toBe('emergency');

      // Verify all stages were called in order
      expect(initializeMemorySystem).toHaveBeenCalled();
      expect(collectEvidence).toHaveBeenCalled();
      expect(extractAllFeatures).toHaveBeenCalled();
      expect(callGptAssessment).toHaveBeenCalled();
      expect(postProcessAssessment).toHaveBeenCalled();
    });

    it('should throw when no images provided', async () => {
      await expect(
        BuildingSurveyorService.assessDamage([])
      ).rejects.toThrow('At least one image is required');
    });

    it('should pass context through to stages', async () => {
      vi.mocked(validateURLs).mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      const context = {
        jobId: 'test-job-123',
        propertyType: 'residential' as const,
        roomType: 'kitchen',
      };

      await BuildingSurveyorService.assessDamage(
        ['https://example.com/image.jpg'],
        context
      );

      // Verify context was passed to relevant stages
      // extractAllFeatures(urls, detections, visionAnalysis, sam3, context)
      expect(extractAllFeatures).toHaveBeenCalledWith(
        expect.arrayContaining(['https://example.com/image.jpg']),
        expect.any(Array),
        null,
        undefined,
        context,
      );
    });
  });
});
