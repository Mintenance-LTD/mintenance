import { RealAIAnalysisService } from '../../services/RealAIAnalysisService';
import { Job } from '../../types';

// Mock fetch globally
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
    photos: ['https://example.com/faucet1.jpg', 'https://example.com/faucet2.jpg'],
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
    it('should use OpenAI when API key is available', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              confidence: 85,
              detectedItems: ['Kitchen Faucet', 'Sink'],
              safetyConcerns: [{
                concern: 'Water damage risk',
                severity: 'Medium',
                description: 'Continued dripping may cause damage'
              }],
              recommendedActions: ['Turn off water supply', 'Replace washers'],
              estimatedComplexity: 'Medium',
              suggestedTools: ['Wrench', 'Replacement washers'],
              estimatedDuration: '1-2 hours',
              detectedEquipment: [{
                name: 'Kitchen Faucet',
                confidence: 90,
                location: 'Above sink'
              }]
            })
          }
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-test-key',
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('gpt-4-vision-preview'),
      });

      expect(result).toBeDefined();
      expect(result?.confidence).toBe(85);
      expect(result?.detectedItems).toContain('Kitchen Faucet');
      expect(result?.estimatedComplexity).toBe('Medium');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      // Should fall back to enhanced analysis
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

      const result = await RealAIAnalysisService.analyzeJobPhotos(electricalJob);

      expect(result?.estimatedComplexity).toBe('High'); // Electrical is always high complexity
      expect(result?.safetyConcerns.some(c => c.severity === 'High')).toBe(true);
      expect(result?.suggestedTools).toContain('Multimeter');
    });

    it('should handle jobs without photos', async () => {
      const jobWithoutPhotos: Job = {
        ...mockJob,
        photos: undefined,
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(jobWithoutPhotos);

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

      const result = await RealAIAnalysisService.analyzeJobPhotos(highPriorityJob);

      expect(result?.estimatedComplexity).toBe('High');
      expect(result?.safetyConcerns.length).toBeGreaterThan(0);
    });
  });

  describe('service configuration detection', () => {
    it('should detect when OpenAI is configured', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(RealAIAnalysisService.isAIServiceConfigured()).toBe(true);
      expect(RealAIAnalysisService.getConfiguredService()).toBe('OpenAI GPT-4 Vision');
    });

    it('should detect when AWS is configured', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      expect(RealAIAnalysisService.isAIServiceConfigured()).toBe(true);
      expect(RealAIAnalysisService.getConfiguredService()).toBe('AWS Rekognition');
    });

    it('should fallback to enhanced analysis when no service is configured', () => {
      expect(RealAIAnalysisService.isAIServiceConfigured()).toBe(false);
      expect(RealAIAnalysisService.getConfiguredService()).toBe('Enhanced Rule-based Analysis');
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
      expect(result?.detectedEquipment?.some(eq => eq.name.includes('Toilet'))).toBe(true);
    });

    it('should provide confidence scores for detected equipment', async () => {
      const result = await RealAIAnalysisService.analyzeJobPhotos(mockJob);

      if (result?.detectedEquipment) {
        result.detectedEquipment.forEach(equipment => {
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

      const result = await RealAIAnalysisService.analyzeJobPhotos(electricalJob);

      expect(result?.safetyConcerns.some(c => c.severity === 'High')).toBe(true);
      expect(result?.recommendedActions.some(a => a.includes('Turn off power'))).toBe(true);
    });

    it('should provide appropriate safety measures for each category', async () => {
      const hvacJob: Job = {
        ...mockJob,
        category: 'hvac',
        description: 'air conditioner not cooling',
      };

      const result = await RealAIAnalysisService.analyzeJobPhotos(hvacJob);

      expect(result?.safetyConcerns.length).toBeGreaterThan(0);
      expect(result?.recommendedActions.some(a => a.includes('filter'))).toBe(true);
    });
  });
});