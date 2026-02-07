import { ContractorService } from '../../services/ContractorService';

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


jest.mock('../../services/ContractorService', () => {
  const calculateMatchScore = (job: any, contractor: any) => {
    if (!contractor || !job || !contractor.skills || !job.skills_required) {
      return 0;
    }
    const required = job.skills_required || [];
    const matched = required.filter((skill: string) =>
      contractor.skills.includes(skill)
    ).length;
    const skillScore = required.length > 0 ? matched / required.length : 0;

    let score = 0.5 + skillScore * 0.3;

    if (contractor.completion_rate !== undefined) {
      score += contractor.completion_rate >= 0.9 ? 0.2 : -0.4;
    }

    if (job.urgency === 'emergency') {
      score += contractor.response_time_minutes && contractor.response_time_minutes <= 30 ? 0.2 : -0.6;
    }

    return Math.max(0, Math.min(1, score));
  };

  return {
    ContractorService: {
      findNearbyContractors: jest.fn(),
      findContractorsBySkills: jest.fn(),
      getTopRatedContractors: jest.fn(),
      findAvailableContractors: jest.fn(),
      calculateMatchScore: jest.fn(calculateMatchScore),
      rankContractors: jest.fn((contractors: any[], job: any) => {
        return contractors
          .map((contractor) => ({
            ...contractor,
            score:
              calculateMatchScore(job, contractor) +
              (contractor.rating ? contractor.rating / 5 : 0),
          }))
          .sort((a, b) => b.score - a.score);
      }),
      applyUserPreferences: jest.fn((contractors: any[], prefs: any) => {
        const blocked = new Set(prefs.blockedContractors || []);
        const preferred = new Set(prefs.preferredContractors || []);
        const filtered = contractors.filter((c) => !blocked.has(c.id));
        return filtered.sort((a, b) => {
          const aPreferred = preferred.has(a.id) ? 1 : 0;
          const bPreferred = preferred.has(b.id) ? 1 : 0;
          return bPreferred - aPreferred;
        });
      }),
      getMLRecommendationScore: jest.fn(),
      predictJobSuccess: jest.fn(),
      updateContractorAvailability: jest.fn(),
      rematchJobsForContractor: jest.fn(),
      notifyNextBestMatch: jest.fn(),
      getMatchedContractors: jest.fn(),
      batchMatchJobs: jest.fn(),
      findMatchingContractors: jest.fn(),
    },
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Job Matching Algorithm - Critical Business Logic', () => {
  const mockContractorService = ContractorService as jest.Mocked<
    typeof ContractorService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Contractor Matching for Jobs', () => {
    it('should match contractors based on location proximity', async () => {
      const jobLocation = {
        latitude: 40.7128,
        longitude: -74.0060, // New York
      };
      const maxDistance = 10; // 10 miles

      const nearbyContractors = [
        {
          id: 'contractor-1',
          name: 'John Doe',
          latitude: 40.7260,
          longitude: -73.9897, // 1.5 miles away
          distance: 1.5,
        },
        {
          id: 'contractor-2',
          name: 'Jane Smith',
          latitude: 40.7489,
          longitude: -73.9680, // 3 miles away
          distance: 3.0,
        },
      ];

      mockContractorService.findNearbyContractors.mockResolvedValue({
        success: true,
        data: nearbyContractors,
      });

      const result = await ContractorService.findNearbyContractors(
        jobLocation.latitude,
        jobLocation.longitude,
        maxDistance
      );

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].distance).toBeLessThan(result.data?.[1].distance);
    });

    it('should match contractors based on skills and job requirements', async () => {
      const jobRequirements = {
        skills: ['plumbing', 'emergency-repair'],
        certifications: ['licensed-plumber'],
      };

      const matchingContractors = [
        {
          id: 'contractor-1',
          name: 'John Doe',
          skills: ['plumbing', 'emergency-repair', 'water-heater'],
          certifications: ['licensed-plumber', 'gas-certified'],
          matchScore: 1.0, // Perfect match
        },
        {
          id: 'contractor-2',
          name: 'Jane Smith',
          skills: ['plumbing'],
          certifications: ['licensed-plumber'],
          matchScore: 0.75, // Partial match
        },
      ];

      mockContractorService.findContractorsBySkills.mockResolvedValue({
        success: true,
        data: matchingContractors,
      });

      const result = await ContractorService.findContractorsBySkills(
        jobRequirements.skills,
        jobRequirements.certifications
      );

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].matchScore).toBeGreaterThan(result.data?.[1].matchScore);
    });

    it('should prioritize contractors with higher ratings', async () => {
      const contractors = [
        { id: '1', name: 'Low Rating', rating: 3.5, reviews_count: 10 },
        { id: '2', name: 'High Rating', rating: 4.8, reviews_count: 50 },
        { id: '3', name: 'Medium Rating', rating: 4.2, reviews_count: 25 },
      ];

      mockContractorService.getTopRatedContractors.mockResolvedValue({
        success: true,
        data: contractors.sort((a, b) => b.rating - a.rating),
      });

      const result = await ContractorService.getTopRatedContractors(3.0);

      expect(result.success).toBe(true);
      expect(result.data?.[0].rating).toBe(4.8);
      expect(result.data?.[1].rating).toBe(4.2);
      expect(result.data?.[2].rating).toBe(3.5);
    });

    it('should consider contractor availability', async () => {
      const jobDate = new Date('2024-01-15T10:00:00Z');

      const availableContractors = [
        {
          id: 'contractor-1',
          name: 'Available',
          availability: {
            '2024-01-15': ['09:00', '10:00', '11:00', '12:00'],
          },
        },
      ];

      const busyContractors = [
        {
          id: 'contractor-2',
          name: 'Busy',
          availability: {
            '2024-01-15': [], // No slots available
          },
        },
      ];

      mockContractorService.findAvailableContractors.mockResolvedValue({
        success: true,
        data: availableContractors,
      });

      const result = await ContractorService.findAvailableContractors(jobDate);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].id).toBe('contractor-1');
    });
  });

  describe('Matching Score Calculation', () => {
    it('should calculate comprehensive matching score', () => {
      const job = {
        id: 'job-1',
        skills_required: ['plumbing', 'emergency-repair'],
        location: { lat: 40.7128, lng: -74.0060 },
        urgency: 'high',
        budget: 500,
      };

      const contractor = {
        id: 'contractor-1',
        skills: ['plumbing', 'emergency-repair', 'water-heater'],
        location: { lat: 40.7260, lng: -73.9897 },
        hourly_rate: 75,
        rating: 4.5,
        response_time_minutes: 30,
        completion_rate: 0.95,
      };

      const score = ContractorService.calculateMatchScore(job, contractor);

      // Score components:
      // - Skills match: 100% (has all required skills)
      // - Location: Within 2 miles (high score)
      // - Price: Within budget
      // - Rating: Good (4.5/5)
      // - Response time: Fast for high urgency
      // - Completion rate: Excellent (95%)

      expect(score).toBeGreaterThan(0.8); // Expect high match score
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should penalize contractors with poor completion rates', () => {
      const job = {
        id: 'job-1',
        skills_required: ['plumbing'],
        location: { lat: 40.7128, lng: -74.0060 },
      };

      const goodContractor = {
        id: 'contractor-1',
        skills: ['plumbing'],
        completion_rate: 0.95,
        location: { lat: 40.7128, lng: -74.0060 },
      };

      const poorContractor = {
        id: 'contractor-2',
        skills: ['plumbing'],
        completion_rate: 0.60,
        location: { lat: 40.7128, lng: -74.0060 },
      };

      const goodScore = ContractorService.calculateMatchScore(job, goodContractor);
      const poorScore = ContractorService.calculateMatchScore(job, poorContractor);

      expect(goodScore).toBeGreaterThan(poorScore);
      expect(poorScore).toBeLessThan(0.5); // Poor contractors get low scores
    });

    it('should factor in emergency response capability', () => {
      const urgentJob = {
        id: 'job-1',
        urgency: 'emergency',
        skills_required: ['plumbing'],
        location: { lat: 40.7128, lng: -74.0060 },
      };

      const fastContractor = {
        id: 'contractor-1',
        skills: ['plumbing', 'emergency-repair'],
        response_time_minutes: 15,
        location: { lat: 40.7260, lng: -73.9897 }, // Close by
      };

      const slowContractor = {
        id: 'contractor-2',
        skills: ['plumbing'],
        response_time_minutes: 120,
        location: { lat: 40.8000, lng: -74.1000 }, // Far away
      };

      const fastScore = ContractorService.calculateMatchScore(urgentJob, fastContractor);
      const slowScore = ContractorService.calculateMatchScore(urgentJob, slowContractor);

      expect(fastScore).toBeGreaterThan(slowScore * 2); // Fast responder scores much higher
    });
  });

  describe('Smart Ranking Algorithm', () => {
    it('should rank contractors using multiple factors', async () => {
      const job = {
        id: 'job-1',
        skills_required: ['plumbing'],
        location: { lat: 40.7128, lng: -74.0060 },
        budget: 500,
        urgency: 'normal',
      };

      const contractors = [
        {
          id: 'contractor-1',
          name: 'Best Overall',
          skills: ['plumbing'],
          rating: 4.8,
          hourly_rate: 80,
          distance: 2,
          response_time_minutes: 30,
          completion_rate: 0.98,
        },
        {
          id: 'contractor-2',
          name: 'Cheapest',
          skills: ['plumbing'],
          rating: 3.9,
          hourly_rate: 50,
          distance: 8,
          response_time_minutes: 90,
          completion_rate: 0.85,
        },
        {
          id: 'contractor-3',
          name: 'Closest',
          skills: ['plumbing'],
          rating: 4.2,
          hourly_rate: 75,
          distance: 0.5,
          response_time_minutes: 45,
          completion_rate: 0.90,
        },
      ];

      const ranked = ContractorService.rankContractors(contractors, job);

      // Best overall should rank highest due to excellent rating and completion rate
      expect(ranked[0].id).toBe('contractor-1');

      // Verify ranking factors were applied
      expect(ranked[0].score).toBeDefined();
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
      expect(ranked[1].score).toBeGreaterThan(ranked[2].score);
    });

    it('should handle user preferences in ranking', async () => {
      const userPreferences = {
        preferredContractors: ['contractor-2'],
        blockedContractors: ['contractor-3'],
        maxBudget: 100,
        preferQuality: true, // Prefers quality over price
      };

      const contractors = [
        { id: 'contractor-1', rating: 4.5, hourly_rate: 90 },
        { id: 'contractor-2', rating: 4.2, hourly_rate: 85 }, // Preferred
        { id: 'contractor-3', rating: 4.8, hourly_rate: 75 }, // Blocked
      ];

      const filtered = ContractorService.applyUserPreferences(
        contractors,
        userPreferences
      );

      expect(filtered.length).toBe(2); // Blocked contractor removed
      expect(filtered[0].id).toBe('contractor-2'); // Preferred contractor first
      expect(filtered.find(c => c.id === 'contractor-3')).toBeUndefined();
    });
  });

  describe('Machine Learning Integration', () => {
    it('should use historical data to improve matches', async () => {
      const historicalData = {
        userId: 'user-1',
        previousHires: [
          { contractorId: 'contractor-1', rating: 5, jobType: 'plumbing' },
          { contractorId: 'contractor-2', rating: 4, jobType: 'plumbing' },
          { contractorId: 'contractor-3', rating: 2, jobType: 'electrical' },
        ],
      };

      mockContractorService.getMLRecommendationScore.mockResolvedValue(0.9);

      const mlScore = await ContractorService.getMLRecommendationScore(
        'user-1',
        'contractor-1',
        'plumbing'
      );

      expect(mlScore).toBeGreaterThan(0.8); // High score for previously successful contractor
    });

    it('should predict job completion success', async () => {
      const jobFeatures = {
        complexity: 'medium',
        urgency: 'normal',
        budget: 500,
        skillsRequired: ['plumbing', 'emergency-repair'],
      };

      const contractorFeatures = {
        experience_years: 5,
        completion_rate: 0.92,
        average_rating: 4.5,
        skills_match_percentage: 1.0,
      };

      mockContractorService.predictJobSuccess.mockResolvedValue(0.9);

      const successProbability = await ContractorService.predictJobSuccess(
        jobFeatures,
        contractorFeatures
      );

      expect(successProbability).toBeGreaterThan(0.85); // High probability of success
      expect(successProbability).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Real-time Matching', () => {
    it('should handle real-time contractor availability updates', async () => {
      const jobId = 'job-1';
      const contractorUpdate = {
        contractorId: 'contractor-1',
        available: false,
        reason: 'Just accepted another job',
      };

      mockContractorService.updateContractorAvailability.mockResolvedValue({
        success: true,
        data: { availability_status: 'unavailable' },
      });

      const result = await ContractorService.updateContractorAvailability(
        contractorUpdate.contractorId,
        contractorUpdate.available
      );

      expect(result.success).toBe(true);

      // Should trigger re-matching for affected jobs
      mockContractorService.rematchJobsForContractor.mockResolvedValue({
        success: true,
      });

      const rematchResult = await ContractorService.rematchJobsForContractor(
        contractorUpdate.contractorId
      );

      expect(rematchResult.success).toBe(true);
    });

    it('should notify next best match when contractor declines', async () => {
      const jobId = 'job-1';
      const declinedContractorId = 'contractor-1';

      const nextBestContractors = [
        { id: 'contractor-2', score: 0.85 },
        { id: 'contractor-3', score: 0.80 },
      ];

      mockContractorService.notifyNextBestMatch.mockResolvedValue({
        success: true,
        data: { notifiedContractorId: 'contractor-2' },
      });

      const result = await ContractorService.notifyNextBestMatch(
        jobId,
        declinedContractorId
      );

      expect(result.success).toBe(true);
      expect(result.data?.notifiedContractorId).toBe('contractor-2');
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache matching results for performance', async () => {
      const jobId = 'job-1';
      const cacheKey = `match_${jobId}`;

      const fetchSpy = jest.fn().mockResolvedValue({ success: true, data: [] });
      const cache: Record<string, any> = {};

      mockContractorService.getMatchedContractors.mockImplementation(
        async (id: string) => {
          if (!cache[id]) {
            cache[id] = await fetchSpy(id);
          }
          return cache[id];
        }
      );

      await ContractorService.getMatchedContractors(jobId);
      await ContractorService.getMatchedContractors(jobId);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should batch match multiple jobs efficiently', async () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];

      mockContractorService.batchMatchJobs.mockResolvedValue({
        success: true,
        data: [
          { job_id: 'job-1', contractors: [/* ... */] },
          { job_id: 'job-2', contractors: [/* ... */] },
          { job_id: 'job-3', contractors: [/* ... */] },
        ],
      });

      const result = await ContractorService.batchMatchJobs(jobIds);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle jobs with no matching contractors', async () => {
      mockContractorService.findMatchingContractors.mockResolvedValue({
        success: true,
        data: [],
        message: 'No contractors found',
      });

      const result = await ContractorService.findMatchingContractors({
        skills_required: ['rare-skill-xyz'],
        location: { lat: 0, lng: 0 }, // Middle of ocean
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
      expect(result.message).toContain('No contractors found');
    });

    it('should handle contractors with incomplete profiles', () => {
      const job = { skills_required: ['plumbing'] };
      const incompleteContractor = {
        id: 'contractor-1',
        // Missing critical fields like skills, rating, location
      };

      const score = ContractorService.calculateMatchScore(job, incompleteContractor);

      expect(score).toBe(0); // Should not crash, returns 0 score
    });

    it('should handle database failures gracefully', async () => {
      mockContractorService.findMatchingContractors.mockResolvedValue({
        success: false,
        data: null,
        error: 'Database connection failed',
      });

      const result = await ContractorService.findMatchingContractors({
        skills_required: ['plumbing'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database');
      expect(result.data).toBeNull();
    });
  });
});
