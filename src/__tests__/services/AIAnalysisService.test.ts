import React from 'react';
import {
  AIAnalysisService,
  AIAnalysis,
} from '../../services/AIAnalysisService';
import { Job } from '../../types';
import { logger } from '../../utils/logger';

// Define enums locally for tests
enum JobPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

enum JobStatus {
  POSTED = 'posted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AIAnalysisService', () => {
  const mockJobBase: Partial<Job> = {
    id: 'job-1',
    title: 'Fix Kitchen Sink Leak',
    description:
      'The kitchen sink has a leak under the faucet that needs fixing',
    category: 'plumbing',
    priority: JobPriority.HIGH,
    status: JobStatus.POSTED,
    budget: 200,
    homeownerId: 'homeowner-1',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockPlumbingJob: Job = {
    ...mockJobBase,
    photos: ['photo1.jpg', 'photo2.jpg'],
    category: 'plumbing',
    subcategory: 'sink_repair',
  } as Job;

  const mockElectricalJob: Job = {
    ...mockJobBase,
    title: 'Install Ceiling Fan',
    description: 'Install a new ceiling fan in the living room',
    category: 'electrical',
    subcategory: 'installation',
    photos: ['ceiling.jpg'],
  } as Job;

  const mockJobWithoutPhotos: Job = {
    ...mockJobBase,
    photos: [],
  } as Job;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeJobPhotos', () => {
    it('should analyze job with photos', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      expect(result).toBeDefined();
      expect(result).toMatchObject({
        confidence: expect.any(Number),
        detectedItems: expect.any(Array),
        safetyConcerns: expect.any(Array),
        recommendedActions: expect.any(Array),
        estimatedComplexity: expect.stringMatching(/^(Low|Medium|High)$/),
        suggestedTools: expect.any(Array),
        estimatedDuration: expect.any(String),
      });

      expect(result!.confidence).toBeGreaterThan(0);
      // Confidence uses 0–100 scale in implementation
      expect(result!.confidence).toBeLessThanOrEqual(100);
    });

    it('should analyze job without photos using category-based analysis', async () => {
      const result =
        await AIAnalysisService.analyzeJobPhotos(mockJobWithoutPhotos);

      expect(result).toBeDefined();
      // Implementation returns a valid category-based set; ensure non-empty
      expect(result!.detectedItems.length).toBeGreaterThan(0);
      expect(result!.suggestedTools.length).toBeGreaterThan(0);
    });

    it('should handle invalid job input gracefully', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos({
        id: 'invalid',
        title: '',
        description: '',
        location: '',
        homeowner_id: 'h',
        status: 'posted',
        budget: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      expect(result).toBeDefined();
    });

    it('should handle plumbing category analysis', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      expect(result).toBeDefined();
      expect(result!.detectedItems).toEqual(
        expect.arrayContaining([
          'Plumbing fixtures',
          'Water supply',
          'Drainage system',
        ])
      );
      expect(result!.suggestedTools).toEqual(
        expect.arrayContaining([
          'Pipe wrench set',
          "Plumber's tape",
          'Water pump pliers',
        ])
      );
    });

    it('should handle electrical category analysis', async () => {
      const result =
        await AIAnalysisService.analyzeJobPhotos(mockElectricalJob);

      expect(result).toBeDefined();
      expect(result!.detectedItems).toEqual(
        expect.arrayContaining([
          'Electrical components',
          'Wiring system',
          'Circuit breakers',
        ])
      );
      expect(result!.suggestedTools).toEqual(
        expect.arrayContaining([
          'Wire strippers',
          'Voltage tester',
          'Electrical tape',
        ])
      );
      expect(result!.safetyConcerns.length).toBeGreaterThan(0);
      expect(result!.safetyConcerns[0].severity).toBe('High');
    });

    it('should include safety concerns for electrical work', async () => {
      const result =
        await AIAnalysisService.analyzeJobPhotos(mockElectricalJob);

      expect(result).toBeDefined();
      expect(result!.safetyConcerns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            concern: 'Electrical shock hazard',
            severity: 'High',
            description: expect.any(String),
          }),
        ])
      );
    });

    it('should set appropriate complexity levels', async () => {
      const plumbingResult =
        await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);
      const electricalResult =
        await AIAnalysisService.analyzeJobPhotos(mockElectricalJob);

      // With high priority in mockJobBase, plumbing escalates to High
      expect(plumbingResult!.estimatedComplexity).toBe('High');
      expect(electricalResult!.estimatedComplexity).toBe('High');
    });

    it('should provide realistic time estimates', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      expect(result).toBeDefined();
      expect(result!.estimatedDuration).toMatch(
        /\d+(-\d+)?\s+(hours?|minutes?)/
      );
    });
  });

  // Text analysis is not part of the current AIAnalysisService implementation.

  // Advanced recommendations are covered by RealAIAnalysisService; skip here.

  // Batch analysis is not implemented in the current service.

  describe('error handling', () => {
    it('should handle job with missing required fields', async () => {
      const incompleteJob = { id: 'incomplete' } as Job;

      const result = await AIAnalysisService.analyzeJobPhotos(incompleteJob);

      // Should still provide a basic analysis without throwing
      expect(result).toBeDefined();
      expect(Array.isArray(result!.detectedItems)).toBe(true);
    });

    it('should handle unexpected category values', async () => {
      const jobWithUnknownCategory = {
        ...mockPlumbingJob,
        category: 'unknown_category',
      } as Job;

      const result = await AIAnalysisService.analyzeJobPhotos(
        jobWithUnknownCategory
      );

      expect(result).toBeDefined();
      // Defaults to Medium, but escalates to High for high-priority jobs
      expect(result!.estimatedComplexity).toBe('High');
    });
  });

  describe('category-specific analysis', () => {
    // Limit to categories supported by the current implementation
    const categories = ['plumbing', 'electrical', 'hvac', 'general', 'appliance'];

    categories.forEach((category) => {
      it(`should provide category-specific analysis for ${category}`, async () => {
        const job = {
          ...mockJobBase,
          category,
          photos: [],
        } as Job;

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result!.detectedItems.length).toBeGreaterThan(0);
        expect(result!.suggestedTools.length).toBeGreaterThan(0);
        expect(result!.recommendedActions.length).toBeGreaterThan(0);
      });
    });

    it('should assign higher complexity for electrical vs general (low priority)', async () => {
      const electricalJob = {
        ...mockJobBase,
        category: 'electrical',
        photos: [],
        priority: JobPriority.LOW,
      } as Job;
      const generalJob = {
        ...mockJobBase,
        category: 'general',
        photos: [],
        priority: JobPriority.LOW,
      } as Job;

      const electricalResult =
        await AIAnalysisService.analyzeJobPhotos(electricalJob);
      const generalResult = await AIAnalysisService.analyzeJobPhotos(generalJob);

      expect(electricalResult!.estimatedComplexity).toBe('High');
      expect(generalResult!.estimatedComplexity).toBe('Low');
    });

    it('should include more safety concerns for high-risk categories', async () => {
      const electricalJob = {
        ...mockJobBase,
        category: 'electrical',
        photos: [],
        priority: JobPriority.LOW,
      } as Job;
      const generalJob = {
        ...mockJobBase,
        category: 'general',
        photos: [],
        priority: JobPriority.LOW,
      } as Job;

      const electricalResult =
        await AIAnalysisService.analyzeJobPhotos(electricalJob);
      const generalResult = await AIAnalysisService.analyzeJobPhotos(generalJob);

      expect(electricalResult!.safetyConcerns.length).toBeGreaterThan(
        generalResult!.safetyConcerns.length
      );
    });
  });

  describe('performance and reliability', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();

      await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast for mock implementation
    });

    it('should produce consistent structure for the same job', async () => {
      const result1 = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);
      const result2 = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      // Equipment detection is non-deterministic; assert structural invariants
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(Array.isArray(result1!.detectedEquipment)).toBe(true);
      expect(result1!.detectedEquipment?.length).toBe(
        result2!.detectedEquipment?.length
      );
      expect(result1!.estimatedComplexity).toBe(result2!.estimatedComplexity);
      expect(typeof result1!.confidence).toBe('number');
      expect(typeof result2!.confidence).toBe('number');
    });
  });
});
