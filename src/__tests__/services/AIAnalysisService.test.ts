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
      expect(result!.confidence).toBeLessThanOrEqual(1);
    });

    it('should analyze job without photos using category-based analysis', async () => {
      const result =
        await AIAnalysisService.analyzeJobPhotos(mockJobWithoutPhotos);

      expect(result).toBeDefined();
      expect(result!.detectedItems).toContain('Kitchen sink components');
      expect(result!.suggestedTools.length).toBeGreaterThan(0);
    });

    it('should return null for invalid job', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(null as any);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Error analyzing job photos:',
        expect.any(Error)
      );
    });

    it('should handle plumbing category analysis', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      expect(result).toBeDefined();
      expect(result!.detectedItems).toEqual(
        expect.arrayContaining([
          'Sink faucet',
          'Water pipes',
          'Shut-off valves',
        ])
      );
      expect(result!.suggestedTools).toEqual(
        expect.arrayContaining([
          'Pipe wrench',
          'Adjustable wrench',
          "Plumber's tape",
        ])
      );
    });

    it('should handle electrical category analysis', async () => {
      const result =
        await AIAnalysisService.analyzeJobPhotos(mockElectricalJob);

      expect(result).toBeDefined();
      expect(result!.detectedItems).toEqual(
        expect.arrayContaining([
          'Ceiling electrical box',
          'Wire connections',
          'Circuit breaker',
        ])
      );
      expect(result!.suggestedTools).toEqual(
        expect.arrayContaining([
          'Wire strippers',
          'Voltage tester',
          'Screwdrivers',
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

      expect(plumbingResult!.estimatedComplexity).toBe('Medium');
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

  describe('generateTextAnalysis', () => {
    it('should analyze job description text', async () => {
      const result =
        await AIAnalysisService.generateTextAnalysis(mockPlumbingJob);

      expect(result).toBeDefined();
      expect(result).toMatchObject({
        keywords: expect.any(Array),
        category: expect.any(String),
        urgency: expect.stringMatching(/^(Low|Medium|High)$/),
        complexity: expect.stringMatching(/^(Low|Medium|High)$/),
        estimatedCost: expect.objectContaining({
          min: expect.any(Number),
          max: expect.any(Number),
        }),
        suggestedContractorTypes: expect.any(Array),
      });
    });

    it('should extract relevant keywords from description', async () => {
      const result =
        await AIAnalysisService.generateTextAnalysis(mockPlumbingJob);

      expect(result.keywords).toEqual(
        expect.arrayContaining(['leak', 'kitchen', 'sink', 'faucet'])
      );
    });

    it('should determine appropriate urgency levels', async () => {
      const urgentJob = {
        ...mockPlumbingJob,
        priority: JobPriority.URGENT,
        description: 'Emergency water leak flooding the basement',
      };

      const result = await AIAnalysisService.generateTextAnalysis(
        urgentJob as Job
      );

      expect(result.urgency).toBe('High');
    });

    it('should suggest appropriate contractor types', async () => {
      const result =
        await AIAnalysisService.generateTextAnalysis(mockPlumbingJob);

      expect(result.suggestedContractorTypes).toEqual(
        expect.arrayContaining(['Plumber', 'General Contractor'])
      );
    });

    it('should handle missing description gracefully', async () => {
      const jobWithoutDescription = {
        ...mockPlumbingJob,
        description: '',
      };

      const result = await AIAnalysisService.generateTextAnalysis(
        jobWithoutDescription as Job
      );

      expect(result).toBeDefined();
      expect(result.keywords).toEqual([]);
      expect(result.category).toBe('General');
    });
  });

  describe('generateJobRecommendations', () => {
    it('should generate appropriate recommendations', async () => {
      const result =
        await AIAnalysisService.generateJobRecommendations(mockPlumbingJob);

      expect(result).toBeDefined();
      expect(result).toMatchObject({
        contractorSkills: expect.any(Array),
        budgetRange: expect.objectContaining({
          min: expect.any(Number),
          max: expect.any(Number),
        }),
        timelineEstimate: expect.any(String),
        preparationSteps: expect.any(Array),
        materialsList: expect.any(Array),
        riskFactors: expect.any(Array),
      });
    });

    it('should recommend appropriate contractor skills', async () => {
      const result =
        await AIAnalysisService.generateJobRecommendations(mockPlumbingJob);

      expect(result.contractorSkills).toEqual(
        expect.arrayContaining(['Plumbing', 'Pipe repair'])
      );
    });

    it('should provide realistic budget ranges', async () => {
      const result =
        await AIAnalysisService.generateJobRecommendations(mockPlumbingJob);

      expect(result.budgetRange.min).toBeGreaterThan(0);
      expect(result.budgetRange.max).toBeGreaterThan(result.budgetRange.min);
    });

    it('should include relevant preparation steps', async () => {
      const result =
        await AIAnalysisService.generateJobRecommendations(mockPlumbingJob);

      expect(result.preparationSteps).toEqual(
        expect.arrayContaining([
          'Turn off water supply to the sink',
          'Clear the area under the sink',
        ])
      );
    });

    it('should list necessary materials', async () => {
      const result =
        await AIAnalysisService.generateJobRecommendations(mockPlumbingJob);

      expect(result.materialsList).toEqual(
        expect.arrayContaining([
          'Replacement faucet parts',
          "Plumber's putty",
          'Thread sealant tape',
        ])
      );
    });

    it('should identify potential risk factors', async () => {
      const electricalResult =
        await AIAnalysisService.generateJobRecommendations(mockElectricalJob);

      expect(electricalResult.riskFactors).toEqual(
        expect.arrayContaining([
          'Electrical shock hazard - turn off power at breaker',
          'Working at height - use proper ladder safety',
        ])
      );
    });
  });

  describe('getBatchAnalysis', () => {
    it('should analyze multiple jobs in batch', async () => {
      const jobs = [mockPlumbingJob, mockElectricalJob];
      const results = await AIAnalysisService.getBatchAnalysis(jobs);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        jobId: 'job-1',
        analysis: expect.any(Object),
      });
    });

    it('should handle empty job array', async () => {
      const results = await AIAnalysisService.getBatchAnalysis([]);

      expect(results).toHaveLength(0);
    });

    it('should handle individual job analysis failures gracefully', async () => {
      const invalidJob = { ...mockPlumbingJob, id: null } as any;
      const validJob = mockElectricalJob;

      const results = await AIAnalysisService.getBatchAnalysis([
        invalidJob,
        validJob,
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].jobId).toBe(mockElectricalJob.id);
    });

    it('should process jobs in parallel efficiently', async () => {
      const jobs = Array(5)
        .fill(mockPlumbingJob)
        .map((job, index) => ({
          ...job,
          id: `job-${index}`,
        }));

      const startTime = Date.now();
      const results = await AIAnalysisService.getBatchAnalysis(jobs);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      // Should process in parallel, not sequentially
      expect(endTime - startTime).toBeLessThan(1000); // Should be much faster than sequential
    });
  });

  describe('error handling', () => {
    it('should handle null job gracefully', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(null as any);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle undefined job gracefully', async () => {
      const result = await AIAnalysisService.analyzeJobPhotos(undefined as any);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle job with missing required fields', async () => {
      const incompleteJob = { id: 'incomplete' } as Job;

      const result = await AIAnalysisService.analyzeJobPhotos(incompleteJob);

      expect(result).toBeDefined(); // Should still provide basic analysis
      expect(result!.detectedItems).toEqual(['General maintenance items']);
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
      expect(result!.estimatedComplexity).toBe('Medium'); // Should default to medium
    });
  });

  describe('category-specific analysis', () => {
    const categories = [
      'plumbing',
      'electrical',
      'painting',
      'flooring',
      'roofing',
      'hvac',
      'general',
    ];

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

    it('should provide higher complexity for electrical and plumbing', async () => {
      const electricalJob = {
        ...mockJobBase,
        category: 'electrical',
        photos: [],
      } as Job;
      const paintingJob = {
        ...mockJobBase,
        category: 'painting',
        photos: [],
      } as Job;

      const electricalResult =
        await AIAnalysisService.analyzeJobPhotos(electricalJob);
      const paintingResult =
        await AIAnalysisService.analyzeJobPhotos(paintingJob);

      expect(electricalResult!.estimatedComplexity).toBe('High');
      expect(paintingResult!.estimatedComplexity).toBe('Low');
    });

    it('should include more safety concerns for high-risk categories', async () => {
      const roofingJob = {
        ...mockJobBase,
        category: 'roofing',
        photos: [],
      } as Job;
      const paintingJob = {
        ...mockJobBase,
        category: 'painting',
        photos: [],
      } as Job;

      const roofingResult =
        await AIAnalysisService.analyzeJobPhotos(roofingJob);
      const paintingResult =
        await AIAnalysisService.analyzeJobPhotos(paintingJob);

      expect(roofingResult!.safetyConcerns.length).toBeGreaterThan(
        paintingResult!.safetyConcerns.length
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

    it('should provide consistent results for same job', async () => {
      const result1 = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);
      const result2 = await AIAnalysisService.analyzeJobPhotos(mockPlumbingJob);

      expect(result1).toEqual(result2);
    });

    it('should handle high load batch processing', async () => {
      const largeJobBatch = Array(50)
        .fill(mockPlumbingJob)
        .map((job, index) => ({
          ...job,
          id: `batch-job-${index}`,
        }));

      const startTime = Date.now();
      const results = await AIAnalysisService.getBatchAnalysis(largeJobBatch);
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should handle batch efficiently
    });
  });
});
