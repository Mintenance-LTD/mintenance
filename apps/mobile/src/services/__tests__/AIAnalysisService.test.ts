import { AIAnalysisService } from '../AIAnalysisService';
import { Job } from '@mintenance/types';
import { logger } from '../../utils/logger';

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

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AIAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeJobPhotos', () => {
    describe('with photos', () => {
      it('should analyze plumbing job with photos', async () => {
        const job: Job = {
          id: '1',
          title: 'Leaky Pipe',
          description: 'Emergency plumbing repair needed',
          location: '123 Main St',
          homeowner_id: 'user1',
          status: 'posted',
          budget: 500,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          priority: 'high',
          photos: ['photo1.jpg', 'photo2.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBeGreaterThan(75); // Base + photo bonus
        expect(result?.detectedItems).toContain('Plumbing fixtures');
        expect(result?.detectedItems).toContain('Visual damage assessment');
        expect(result?.detectedItems).toContain('Photo documentation');
        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({
            concern: 'Water damage risk',
            severity: 'High',
          })
        );
        expect(result?.estimatedComplexity).toBe('High'); // High priority
        expect(result?.suggestedTools).toContain('Pipe wrench set');
        expect(result?.estimatedDuration).toBe('1-2 hours'); // High priority
        expect(result?.detectedEquipment).toBeDefined();
        expect(result?.detectedEquipment?.length).toBeGreaterThan(0);
      });

      it('should analyze electrical job with photos', async () => {
        const job: Job = {
          id: '2',
          title: 'Faulty Outlet',
          description: 'Outlet not working',
          location: '456 Oak Ave',
          homeowner_id: 'user2',
          status: 'posted',
          budget: 300,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
          photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBeGreaterThan(75);
        expect(result?.detectedItems).toContain('Electrical components');
        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({
            concern: 'Electrical shock hazard',
            severity: 'High',
          })
        );
        expect(result?.estimatedComplexity).toBe('High'); // Electrical is always high
        expect(result?.suggestedTools).toContain('Multimeter');
        expect(result?.estimatedDuration).toBe('3-6 hours');
        expect(result?.detectedEquipment).toBeDefined();
      });

      it('should analyze hvac job with photos', async () => {
        const job: Job = {
          id: '3',
          title: 'AC Not Cooling',
          description: 'Air conditioner not cooling properly',
          location: '789 Pine St',
          homeowner_id: 'user3',
          status: 'posted',
          budget: 400,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'hvac',
          photos: ['photo1.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBeGreaterThan(75);
        expect(result?.detectedItems).toContain('HVAC unit');
        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({
            concern: 'Poor air quality',
            severity: 'Medium',
          })
        );
        expect(result?.estimatedComplexity).toBe('Medium');
        expect(result?.suggestedTools).toContain('HVAC gauges');
        expect(result?.estimatedDuration).toBe('2-5 hours');
      });

      it('should analyze appliance job with photos', async () => {
        const job: Job = {
          id: '4',
          title: 'Broken Dishwasher',
          description: 'Dishwasher not draining',
          location: '321 Elm St',
          homeowner_id: 'user4',
          status: 'posted',
          budget: 250,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'appliance',
          photos: ['photo1.jpg', 'photo2.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBeGreaterThan(75);
        expect(result?.detectedItems).toContain('Appliance components');
        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({
            concern: 'Electrical safety',
            severity: 'Medium',
          })
        );
        expect(result?.estimatedComplexity).toBe('Medium');
        expect(result?.suggestedTools).toContain('Appliance-specific tools');
      });

      it('should increase confidence with more photos', async () => {
        const jobWith1Photo: Job = {
          id: '5',
          title: 'Test Job',
          description: 'Test description',
          location: 'Test Location',
          homeowner_id: 'user5',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'general',
          photos: ['photo1.jpg'],
        };

        const jobWith3Photos: Job = {
          ...jobWith1Photo,
          photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
        };

        const result1 = await AIAnalysisService.analyzeJobPhotos(jobWith1Photo);
        const result3 = await AIAnalysisService.analyzeJobPhotos(jobWith3Photos);

        expect(result3?.confidence).toBeGreaterThan(result1?.confidence!);
      });

      it('should cap confidence at 95', async () => {
        const jobWithManyPhotos: Job = {
          id: '6',
          title: 'Test Job',
          description: 'Test description',
          location: 'Test Location',
          homeowner_id: 'user6',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
          photos: Array(20).fill('photo.jpg'),
        };

        const result = await AIAnalysisService.analyzeJobPhotos(jobWithManyPhotos);

        expect(result?.confidence).toBeLessThanOrEqual(95);
      });
    });

    describe('without photos', () => {
      it('should analyze plumbing job without photos', async () => {
        const job: Job = {
          id: '7',
          title: 'Leaky Pipe',
          description: 'Standard plumbing repair',
          location: '123 Main St',
          homeowner_id: 'user7',
          status: 'posted',
          budget: 500,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          priority: 'medium',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBe(85); // Base confidence for plumbing
        expect(result?.detectedItems).toContain('Plumbing fixtures');
        expect(result?.detectedItems).not.toContain('Visual damage assessment');
        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({
            concern: 'Water damage risk',
            severity: 'High',
          })
        );
        expect(result?.estimatedComplexity).toBe('Medium');
        expect(result?.estimatedDuration).toBe('2-4 hours');
      });

      it('should analyze electrical job without photos', async () => {
        const job: Job = {
          id: '8',
          title: 'Outlet Issue',
          description: 'Outlet needs replacement',
          location: '456 Oak Ave',
          homeowner_id: 'user8',
          status: 'posted',
          budget: 200,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBe(90);
        expect(result?.detectedItems).toContain('Electrical components');
        expect(result?.estimatedComplexity).toBe('High'); // Electrical always high
      });

      it('should analyze general job without photos', async () => {
        const job: Job = {
          id: '9',
          title: 'General Maintenance',
          description: 'Miscellaneous repairs',
          location: '789 Pine St',
          homeowner_id: 'user9',
          status: 'posted',
          budget: 150,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'general',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBe(70);
        expect(result?.detectedItems).toContain('General maintenance items');
        expect(result?.estimatedComplexity).toBe('Low');
        expect(result?.estimatedDuration).toBe('1-3 hours');
      });

      it('should handle empty photos array', async () => {
        const job: Job = {
          id: '10',
          title: 'Test Job',
          description: 'Test description',
          location: 'Test Location',
          homeowner_id: 'user10',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          photos: [],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBe(85); // No photo bonus
      });
    });

    describe('priority handling', () => {
      it('should set high complexity for high priority jobs', async () => {
        const job: Job = {
          id: '11',
          title: 'General Repair',
          description: 'Urgent repair needed',
          location: 'Test Location',
          homeowner_id: 'user11',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'general',
          priority: 'high',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.estimatedComplexity).toBe('High');
      });

      it('should not override already high complexity', async () => {
        const job: Job = {
          id: '12',
          title: 'Electrical Work',
          description: 'Low priority electrical',
          location: 'Test Location',
          homeowner_id: 'user12',
          status: 'posted',
          budget: 200,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
          priority: 'low',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.estimatedComplexity).toBe('High'); // Electrical is always high
      });

      it('should adjust duration for high priority plumbing', async () => {
        const job: Job = {
          id: '13',
          title: 'Emergency Plumbing',
          description: 'Urgent leak',
          location: 'Test Location',
          homeowner_id: 'user13',
          status: 'posted',
          budget: 500,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          priority: 'high',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.estimatedDuration).toBe('1-2 hours');
      });
    });

    describe('category-specific analysis', () => {
      it('should provide plumbing-specific recommendations', async () => {
        const job: Job = {
          id: '14',
          title: 'Plumbing Work',
          description: 'Pipe repair',
          location: 'Test Location',
          homeowner_id: 'user14',
          status: 'posted',
          budget: 300,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.recommendedActions).toContain('Turn off water supply before starting work');
        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({ concern: 'Mold growth potential' })
        );
      });

      it('should provide electrical-specific safety warnings', async () => {
        const job: Job = {
          id: '15',
          title: 'Electrical Work',
          description: 'Wiring issue',
          location: 'Test Location',
          homeowner_id: 'user15',
          status: 'posted',
          budget: 400,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.safetyConcerns).toContainEqual(
          expect.objectContaining({ concern: 'Fire hazard' })
        );
        expect(result?.recommendedActions).toContain('Turn off power at circuit breaker');
      });

      it('should handle unknown category with default analysis', async () => {
        const job: Job = {
          id: '16',
          title: 'Unknown Work',
          description: 'Some repair',
          location: 'Test Location',
          homeowner_id: 'user16',
          status: 'posted',
          budget: 200,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'unknown-category',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBe(75); // Default confidence
        expect(result?.estimatedComplexity).toBe('Medium');
      });

      it('should handle missing category', async () => {
        const job: Job = {
          id: '17',
          title: 'No Category Job',
          description: 'Generic repair',
          location: 'Test Location',
          homeowner_id: 'user17',
          status: 'posted',
          budget: 150,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBe(75);
      });
    });

    describe('equipment detection', () => {
      it('should detect plumbing equipment', async () => {
        const job: Job = {
          id: '18',
          title: 'Plumbing Job',
          description: 'Toilet repair',
          location: 'Test Location',
          homeowner_id: 'user18',
          status: 'posted',
          budget: 200,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          photos: ['photo.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.detectedEquipment).toBeDefined();
        expect(result?.detectedEquipment?.length).toBeGreaterThan(0);

        const equipment = result?.detectedEquipment![0];
        expect(equipment).toHaveProperty('name');
        expect(equipment).toHaveProperty('confidence');
        expect(equipment).toHaveProperty('location');
        expect(equipment?.confidence).toBeGreaterThan(0);
        expect(equipment?.confidence).toBeLessThanOrEqual(100);
      });

      it('should detect electrical equipment', async () => {
        const job: Job = {
          id: '19',
          title: 'Electrical Job',
          description: 'Panel work',
          location: 'Test Location',
          homeowner_id: 'user19',
          status: 'posted',
          budget: 500,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
          photos: ['photo.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.detectedEquipment).toBeDefined();
        expect(result?.detectedEquipment?.some(e => e.name === 'Electrical Panel' || e.name === 'Outlet')).toBe(true);
      });

      it('should detect hvac equipment', async () => {
        const job: Job = {
          id: '20',
          title: 'HVAC Job',
          description: 'AC repair',
          location: 'Test Location',
          homeowner_id: 'user20',
          status: 'posted',
          budget: 400,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'hvac',
          photos: ['photo.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.detectedEquipment).toBeDefined();
        expect(result?.detectedEquipment?.some(e => e.name === 'AC Unit' || e.name === 'Thermostat')).toBe(true);
      });

      it('should return limited number of equipment items', async () => {
        const job: Job = {
          id: '21',
          title: 'Test Job',
          description: 'Test',
          location: 'Test Location',
          homeowner_id: 'user21',
          status: 'posted',
          budget: 300,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          photos: ['photo.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.detectedEquipment?.length).toBeLessThanOrEqual(4);
      });
    });

    describe('error handling', () => {
      it('should handle errors and fall back to category analysis', async () => {
        // Create a job with photos to trigger generateEnhancedAnalysis
        const job: Job = {
          id: '22',
          title: 'Test Job',
          description: 'Test',
          location: 'Test Location',
          homeowner_id: 'user22',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          photos: ['photo.jpg'], // Add photos to trigger generateEnhancedAnalysis
        };

        // Force an error by mocking the private method
        const originalMethod = (AIAnalysisService as any).generateEnhancedAnalysis;
        (AIAnalysisService as any).generateEnhancedAnalysis = jest.fn(() => {
          throw new Error('Simulated error');
        });

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(logger.error).toHaveBeenCalled();

        // Restore original method
        (AIAnalysisService as any).generateEnhancedAnalysis = originalMethod;
      });

      it('should return analysis even with minimal job data', async () => {
        const minimalJob: Job = {
          id: '23',
          title: 'Minimal Job',
          description: '',
          location: 'Location',
          homeowner_id: 'user23',
          status: 'posted',
          budget: 50,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(minimalJob);

        expect(result).toBeDefined();
        expect(result?.confidence).toBeGreaterThan(0);
        expect(result?.detectedItems).toBeDefined();
        expect(result?.safetyConcerns).toBeDefined();
      });

      it('should handle null or undefined fields gracefully', async () => {
        const job: Job = {
          id: '24',
          title: 'Test',
          description: 'Test',
          location: 'Test',
          homeowner_id: 'user24',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: undefined,
          priority: undefined,
          photos: undefined,
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result).toBeDefined();
        expect(result?.confidence).toBeGreaterThan(0);
      });
    });

    describe('analysis structure validation', () => {
      it('should return properly structured AIAnalysis object', async () => {
        const job: Job = {
          id: '25',
          title: 'Test Job',
          description: 'Test description',
          location: 'Test Location',
          homeowner_id: 'user25',
          status: 'posted',
          budget: 200,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
          photos: ['photo.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        // Base structure that's always present
        expect(result).toMatchObject({
          confidence: expect.any(Number),
          detectedItems: expect.any(Array),
          safetyConcerns: expect.any(Array),
          recommendedActions: expect.any(Array),
          estimatedComplexity: expect.stringMatching(/^(Low|Medium|High)$/),
          suggestedTools: expect.any(Array),
          estimatedDuration: expect.any(String),
        });

        // detectedEquipment is only present when photos exist
        if (job.photos && job.photos.length > 0) {
          expect(result?.detectedEquipment).toBeDefined();
          expect(result?.detectedEquipment).toBeInstanceOf(Array);
        }
      });

      it('should have valid safety concern structure', async () => {
        const job: Job = {
          id: '26',
          title: 'Test Job',
          description: 'Test',
          location: 'Test',
          homeowner_id: 'user26',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'electrical',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        result?.safetyConcerns.forEach(concern => {
          expect(concern).toMatchObject({
            concern: expect.any(String),
            severity: expect.stringMatching(/^(Low|Medium|High)$/),
            description: expect.any(String),
          });
        });
      });

      it('should have valid equipment detection structure', async () => {
        const job: Job = {
          id: '27',
          title: 'Test Job',
          description: 'Test',
          location: 'Test',
          homeowner_id: 'user27',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'hvac',
          photos: ['photo.jpg'],
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        result?.detectedEquipment?.forEach(equipment => {
          expect(equipment).toMatchObject({
            name: expect.any(String),
            confidence: expect.any(Number),
            location: expect.any(String),
          });
          expect(equipment.name).toBeTruthy();
          expect(equipment.location).toBeTruthy();
        });
      });
    });

    describe('edge cases', () => {
      it('should handle case-insensitive category matching', async () => {
        const job1: Job = {
          id: '28',
          title: 'Test',
          description: 'Test',
          location: 'Test',
          homeowner_id: 'user28',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'PLUMBING',
        };

        const job2: Job = { ...job1, id: '29', category: 'Plumbing' };
        const job3: Job = { ...job1, id: '30', category: 'plumbing' };

        const result1 = await AIAnalysisService.analyzeJobPhotos(job1);
        const result2 = await AIAnalysisService.analyzeJobPhotos(job2);
        const result3 = await AIAnalysisService.analyzeJobPhotos(job3);

        expect(result1?.confidence).toBe(result2?.confidence);
        expect(result2?.confidence).toBe(result3?.confidence);
      });

      it('should handle description with emergency keyword', async () => {
        const job: Job = {
          id: '31',
          title: 'Emergency Repair',
          description: 'This is an emergency plumbing situation',
          location: 'Test',
          homeowner_id: 'user31',
          status: 'posted',
          budget: 500,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'plumbing',
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.estimatedComplexity).toBe('High');
      });

      it('should maintain confidence within valid range', async () => {
        const job: Job = {
          id: '32',
          title: 'Test',
          description: 'Test',
          location: 'Test',
          homeowner_id: 'user32',
          status: 'posted',
          budget: 100,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          category: 'general',
          photos: Array(50).fill('photo.jpg'),
        };

        const result = await AIAnalysisService.analyzeJobPhotos(job);

        expect(result?.confidence).toBeGreaterThanOrEqual(0);
        expect(result?.confidence).toBeLessThanOrEqual(100);
      });
    });
  });
});
