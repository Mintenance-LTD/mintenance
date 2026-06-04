import { RealAIAnalysisService } from '../../services/RealAIAnalysisService';
import { Job } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// NOTE: RealAIAnalysisService is exercised against its REAL implementation.
// A previous self-mock spread the class via {...Class}, which silently drops
// static methods (they live non-enumerably on the constructor), making every
// `analyzeJobPhotos is not a function`. The service is also security-hardened:
// the mobile bundle carries NO API keys (config/ai.config.ts hardcodes
// apiKey: ''), so OpenAI/AWS are never reachable from mobile and the service
// always uses the deterministic rule-based fallback. Tests below reflect that.

// Mock fetch globally to prove it is never called from the mobile client.
global.fetch = jest.fn();

describe('RealAIAnalysisService', () => {
  const mockJob: Job = {
    id: 'test-job-1',
    title: 'Kitchen Faucet Repair',
    description: 'Leaky faucet in kitchen sink, dripping constantly',
    location: 'Kitchen',
    homeownerId: 'homeowner-1',
    contractorId: undefined,
    status: 'posted',
    budget: 150,
    category: 'plumbing',
    subcategory: 'faucet',
    priority: 'high',
    photos: [
      'https://example.com/faucet1.jpg',
      'https://example.com/faucet2.jpg',
    ],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.GOOGLE_CLOUD_API_KEY;
  });

  describe('analyzeJobPhotos', () => {
    it('never calls the OpenAI REST API directly from the mobile client', async () => {
      // SECURITY: the mobile bundle carries no API keys, so even with an env var
      // set the service must NOT hit api.openai.com. It uses the rule-based
      // fallback instead and returns a well-formed analysis.
      process.env.OPENAI_API_KEY = 'sk-test-' + 'x'.repeat(45);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(fetch).not.toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.anything()
      );

      expect(result).toBeDefined();
      // mockJob is plumbing -> deterministic fallback content
      expect(result?.detectedItems).toContain('Plumbing fixtures');
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it('returns a valid fallback analysis regardless of any env configuration', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-' + 'x'.repeat(45);

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      // Always falls back to enhanced rule-based analysis on mobile
      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.detectedItems.length).toBeGreaterThan(0);
    });

    it('should use fallback analysis when no API key is provided', async () => {
      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.detectedItems).toContain('Plumbing fixtures');
      expect(result?.safetyConcerns.length).toBeGreaterThan(0);
    });

    it('should adjust analysis based on job category', async () => {
      const electricalJob: Job = {
        ...mockJob,
        category: 'electrical',
        description: 'Outlet not working, sparking when plugged in',
      };

      const result =
        await RealAIAnalysisService.analyzeJobPhotos(electricalJob);

      expect(result?.estimatedComplexity).toBe('High'); // Electrical is always high complexity
      expect(result?.safetyConcerns.some((c) => c.severity === 'High')).toBe(
        true
      );
      expect(result?.suggestedTools).toContain('Digital multimeter');
    });

    it('should handle jobs without photos', async () => {
      const jobWithoutPhotos: Job = {
        ...mockJob,
        photos: undefined,
      };

      const result =
        await RealAIAnalysisService.analyzeJobPhotos(jobWithoutPhotos);

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.detectedItems.length).toBeGreaterThan(0);
    });

    it('should prioritize safety for high-priority jobs', async () => {
      const highPriorityJob: Job = {
        ...mockJob,
        priority: 'high',
        category: 'electrical',
      };

      const result =
        await RealAIAnalysisService.analyzeJobPhotos(highPriorityJob);

      expect(result?.estimatedComplexity).toBe('High');
      expect(result?.safetyConcerns.length).toBeGreaterThan(0);
    });
  });

  describe('service configuration detection', () => {
    // SECURITY: the mobile bundle never carries provider API keys, so on-device
    // detection always reports "not configured" and the rule-based fallback name.
    // Env vars are intentionally ignored by the service.
    it('reports no on-device AI service even when env keys are present', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(RealAIAnalysisService.isAIServiceConfigured()).toBe(false);
      expect(RealAIAnalysisService.getConfiguredService()).toBe(
        'Enhanced Rule-based Analysis'
      );
    });

    it('reports no on-device AI service when AWS env keys are present', () => {
      process.env.AWS_ACCESS_KEY_ID = 'AKIA' + 'X'.repeat(16);
      expect(RealAIAnalysisService.isAIServiceConfigured()).toBe(false);
      expect(RealAIAnalysisService.getConfiguredService()).toBe(
        'Enhanced Rule-based Analysis'
      );
    });

    it('should fallback to enhanced analysis when no service is configured', () => {
      expect(RealAIAnalysisService.isAIServiceConfigured()).toBe(false);
      expect(RealAIAnalysisService.getConfiguredService()).toBe(
        'Enhanced Rule-based Analysis'
      );
    });
  });

  describe('equipment detection', () => {
    it('should detect relevant equipment based on job category', async () => {
      const plumbingJob: Job = {
        ...mockJob,
        description: 'toilet is running constantly and making noise',
        category: 'plumbing',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(plumbingJob);

      expect(result?.detectedEquipment?.length).toBeGreaterThan(0);
      expect(
        result?.detectedEquipment?.some((eq) => eq.name.includes('Toilet'))
      ).toBe(true);
    });

    it('should provide confidence scores for detected equipment', async () => {
      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      if (result?.detectedEquipment) {
        result.detectedEquipment.forEach((equipment) => {
          expect(equipment.confidence).toBeGreaterThanOrEqual(60);
          expect(equipment.confidence).toBeLessThanOrEqual(95);
          expect(equipment.location).toBeDefined();
        });
      }
    });
  });

  describe('safety analysis', () => {
    it('should identify high-severity safety concerns for electrical work', async () => {
      const electricalJob: Job = {
        ...mockJob,
        category: 'electrical',
        description: 'exposed wires sparking',
      };

      const result =
        await RealAIAnalysisService.analyzeJobPhotos(electricalJob);

      expect(result?.safetyConcerns.some((c) => c.severity === 'High')).toBe(
        true
      );
      expect(
        result?.recommendedActions.some((a) => a.includes('Turn off power'))
      ).toBe(true);
    });

    it('should provide appropriate safety measures for each category', async () => {
      const hvacJob: Job = {
        ...mockJob,
        category: 'hvac',
        description: 'air conditioner not cooling',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(hvacJob);

      expect(result?.safetyConcerns.length).toBeGreaterThan(0);
      expect(result?.recommendedActions.some((a) => a.includes('filter'))).toBe(
        true
      );
    });
  });
});
