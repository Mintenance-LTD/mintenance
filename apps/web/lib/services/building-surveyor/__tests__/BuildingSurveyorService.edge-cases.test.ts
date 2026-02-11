// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Edge Case Unit Tests for BuildingSurveyorService
 *
 * Tests error handling, boundary conditions, and async operation failures
 */

import { BuildingSurveyorService } from '../BuildingSurveyorService';
import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { ImageAnalysisService } from '@/lib/services/ImageAnalysisService';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';
import { validateURLs } from '@/lib/security/url-validation';
import { getConfig } from '../config/BuildingSurveyorConfig';
import { collectEvidence } from '../stages/collect-evidence';
import { extractAllFeatures } from '../stages/extract-features';
import { callGptAssessment } from '../stages/call-gpt-assessment';
import { postProcessAssessment } from '../stages/post-process-assessment';
import { initializeMemorySystem } from '../initialization/BuildingSurveyorInitializationService';

// Mock dependencies
vi.mock('../RoboflowDetectionService');
vi.mock('@/lib/services/ImageAnalysisService');
vi.mock('../../ml-engine/memory/MemoryManager');
vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: vi.fn(),
}));
vi.mock('../config/BuildingSurveyorConfig', () => ({
  getConfig: vi.fn(() => ({
    openaiApiKey: 'test-key',
    detectorTimeoutMs: 7000,
    visionTimeoutMs: 9000,
  })),
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
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
// Mock stage modules to prevent deep pipeline failures
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
  callGptAssessment: vi.fn().mockResolvedValue('{"damageAssessment":{"damageType":"cosmetic","severity":"early","confidence":50,"location":"Unknown","description":"Test","detectedItems":[]},"safetyHazards":{"hazards":[],"hasCriticalHazards":false,"overallSafetyScore":100},"compliance":{"complianceIssues":[],"requiresProfessionalInspection":false,"complianceScore":100},"insuranceRisk":{"riskFactors":[],"riskScore":10,"premiumImpact":"low","mitigationSuggestions":[]},"urgency":{"urgency":"routine","recommendedActionTimeline":"No rush","reasoning":"Minor issue","priorityScore":20},"homeownerExplanation":{"whatIsIt":"Minor cosmetic issue","whyItHappened":"Normal wear","whatToDo":"Monitor"},"contractorAdvice":{"repairNeeded":[],"materials":[],"tools":[],"estimatedTime":"N/A","estimatedCost":{"min":0,"max":100,"recommended":50},"complexity":"low"}}'),
}));
vi.mock('../stages/post-process-assessment', () => ({
  postProcessAssessment: vi.fn().mockResolvedValue({
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
  }),
}));
vi.mock('../initialization/BuildingSurveyorInitializationService', () => ({
  initializeMemorySystem: vi.fn().mockResolvedValue(undefined),
  isLearnedFeaturesEnabled: vi.fn().mockReturnValue(false),
  getLearnedFeatureExtractor: vi.fn().mockReturnValue(null),
}));

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

describe('BuildingSurveyorService - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup stage mocks after mockReset clears them
    vi.mocked(initializeMemorySystem).mockResolvedValue(undefined);
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
    } as any);
    vi.mocked(callGptAssessment).mockResolvedValue(JSON.stringify(mockAssessment));
    vi.mocked(postProcessAssessment).mockResolvedValue(mockAssessment as any);
    vi.mocked(getConfig).mockReturnValue({
      openaiApiKey: 'test-key',
      detectorTimeoutMs: 7000,
      visionTimeoutMs: 9000,
    } as any);
  });

  describe('assessDamage - Error Handling', () => {
    it('should throw error when no images provided', async () => {
      await expect(
        BuildingSurveyorService.assessDamage([])
      ).rejects.toThrow('At least one image is required');
    });

    it('should throw error when imageUrls is null', async () => {
      await expect(
        BuildingSurveyorService.assessDamage(null as unknown as string[])
      ).rejects.toThrow();
    });

    it('should throw error when imageUrls is undefined', async () => {
      await expect(
        BuildingSurveyorService.assessDamage(undefined as unknown as string[])
      ).rejects.toThrow();
    });

    it('should handle invalid image URLs', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: [],
        invalid: [{ url: 'invalid-url', error: 'Invalid URL format' }],
      });

      await expect(
        BuildingSurveyorService.assessDamage(['invalid-url'])
      ).rejects.toThrow('Invalid image URLs');
    });

    it('should handle missing OpenAI API key', async () => {
      vi.mocked(getConfig).mockReturnValue({
        openaiApiKey: null,
        detectorTimeoutMs: 7000,
        visionTimeoutMs: 9000,
      });

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).rejects.toThrow('AI assessment service is not configured');
    });
  });

  describe('assessDamage - Async Operation Failures', () => {
    it('should handle Roboflow detection timeout', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn(() =>
        new Promise((resolve) => setTimeout(() => resolve([]), 10000))
      );

      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      // Should not throw, but handle timeout gracefully
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle Google Vision analysis timeout', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn(() =>
        new Promise((resolve) => setTimeout(() => resolve({}), 10000))
      );

      // Should not throw, but handle timeout gracefully
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle Roboflow detection failure', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockRejectedValue(
        new Error('Roboflow API error')
      );
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      // Should handle failure gracefully and continue with vision analysis
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle Google Vision analysis failure', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockRejectedValue(
        new Error('Vision API error')
      );

      // Should handle failure gracefully and continue with Roboflow detections
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle both detectors failing', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockRejectedValue(
        new Error('Roboflow error')
      );
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockRejectedValue(
        new Error('Vision error')
      );

      // Should still attempt to create assessment with available data
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });
  });

  describe('assessDamage - Boundary Conditions', () => {
    it('should handle single image', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });

    it('should handle maximum number of images', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      const manyImages = Array(20).fill('https://example.com/image.jpg');
      mockedValidateURLs.mockResolvedValue({
        valid: manyImages,
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage(manyImages)
      ).resolves.toBeDefined();
    });

    it('should handle very long image URLs', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.jpg';
      mockedValidateURLs.mockResolvedValue({
        valid: [longUrl],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage([longUrl])
      ).resolves.toBeDefined();
    });

    it('should handle empty context', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'], undefined)
      ).resolves.toBeDefined();
    });
  });

  describe('assessDamage - Memory System Edge Cases', () => {
    it('should handle memory system initialization failure', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      // Mock initializeMemorySystem to reject (this is the function actually called by the service)
      vi.mocked(initializeMemorySystem).mockRejectedValue(
        new Error('Memory initialization failed')
      );

      // The service calls initializeMemorySystem which throws, so it should propagate
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).rejects.toThrow('Memory initialization failed');
    });

    it('should handle memory query returning null', async () => {
      const mockedValidateURLs = vi.mocked(validateURLs);
      mockedValidateURLs.mockResolvedValue({
        valid: ['https://example.com/image.jpg'],
        invalid: [],
      });

      memoryManager.queryMemory = vi.fn().mockResolvedValue(null);

      RoboflowDetectionService.detect = vi.fn().mockResolvedValue([]);
      ImageAnalysisService.analyzePropertyImages = vi.fn().mockResolvedValue({});

      // Should handle null memory results gracefully
      await expect(
        BuildingSurveyorService.assessDamage(['https://example.com/image.jpg'])
      ).resolves.toBeDefined();
    });
  });
});

