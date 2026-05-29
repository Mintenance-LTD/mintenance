import { UserService } from '../../services/UserService';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { fetchContractorStats } from '@mintenance/data-access';

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

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// getContractorStats now delegates to the shared @mintenance/data-access query
jest.mock('@mintenance/data-access', () => ({
  fetchContractorStats: jest.fn(),
}));

// updateUserProfile now routes through the mobile API client
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFetchContractorStats = fetchContractorStats as jest.Mock;
const mockApi = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContractorStats', () => {
    const contractorId = 'contractor_123';

    it('should map the shared stats object into the mobile shape', async () => {
      mockFetchContractorStats.mockResolvedValueOnce({
        activeJobs: 2,
        completedJobs: 1,
        monthlyEarnings: 150.4,
        avgRating: 4.7,
        totalReviews: 3,
        successRate: 33,
        todaysAppointments: [
          {
            id: 'job_today_1',
            title: 'Plumbing Repair',
            location: '123 Main St, London',
            scheduled_start_date: '2024-01-15T08:00:00Z',
            homeowner: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        ],
      });

      const result = await UserService.getContractorStats(contractorId);

      const expectedTime = new Date('2024-01-15T08:00:00Z').toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      );

      const expectedJob = {
        time: expectedTime,
        client: 'John Doe',
        location: '123 Main St, London',
        type: 'Plumbing Repair',
        jobId: 'job_today_1',
      };

      expect(result).toEqual({
        activeJobs: 2,
        monthlyEarnings: 150, // Math.round(150.4)
        rating: 4.7,
        completedJobs: 1,
        totalJobs: 3, // activeJobs + completedJobs
        totalJobsCompleted: 1,
        responseTime: '< 1h', // avgRating >= 4.5
        successRate: 33,
        todaysAppointments: 1,
        nextAppointment: expectedJob,
        todaysJobs: [expectedJob],
      });

      expect(mockFetchContractorStats).toHaveBeenCalledWith(
        mockSupabase,
        contractorId
      );
    });

    it('should handle empty data gracefully', async () => {
      mockFetchContractorStats.mockResolvedValueOnce({
        activeJobs: 0,
        completedJobs: 0,
        monthlyEarnings: 0,
        avgRating: 0,
        totalReviews: 0,
        successRate: 0,
        todaysAppointments: [],
      });

      const result = await UserService.getContractorStats(contractorId);

      expect(result).toEqual({
        activeJobs: 0,
        monthlyEarnings: 0,
        rating: 0,
        completedJobs: 0,
        totalJobs: 0,
        totalJobsCompleted: 0,
        responseTime: '< 4h', // avgRating < 4.0
        successRate: 0,
        todaysAppointments: 0,
        nextAppointment: undefined,
        todaysJobs: [],
      });
    });

    it('should return zero-default stats on error', async () => {
      const dbError = new Error('Database connection failed');
      mockFetchContractorStats.mockRejectedValueOnce(dbError);

      const result = await UserService.getContractorStats(contractorId);

      expect(result).toEqual({
        activeJobs: 0,
        monthlyEarnings: 0,
        rating: 0,
        completedJobs: 0,
        totalJobs: 0,
        totalJobsCompleted: 0,
        responseTime: '< 2h',
        successRate: 0,
        todaysAppointments: 0,
        todaysJobs: [],
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching contractor stats:',
        dbError
      );
    });

    it('should calculate different response times based on rating', async () => {
      const testCases = [
        { avgRating: 4.8, expectedResponseTime: '< 1h' },
        { avgRating: 4.2, expectedResponseTime: '< 2h' },
        { avgRating: 3.5, expectedResponseTime: '< 4h' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        mockFetchContractorStats.mockResolvedValueOnce({
          activeJobs: 0,
          completedJobs: 0,
          monthlyEarnings: 0,
          avgRating: testCase.avgRating,
          totalReviews: 1,
          successRate: 0,
          todaysAppointments: [],
        });

        const result = await UserService.getContractorStats(contractorId);
        expect(result.responseTime).toBe(testCase.expectedResponseTime);
      }
    });
  });

  describe('getUserProfile', () => {
    const userId = 'user_123';

    it('should return user profile with contractor skills and reviews', async () => {
      const mockUser = {
        id: userId,
        email: 'contractor@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
        phone: '+1234567890',
        bio: 'Experienced plumber',
        profile_image_url: 'https://example.com/profile.jpg',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        contractor_skills: [
          { skill_name: 'Plumbing' },
          { skill_name: 'Heating' },
        ],
      };

      const mockReviews = [
        {
          rating: 5,
          comment: 'Excellent work!',
          created_at: '2024-01-10T10:00:00Z',
          reviewer: {
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      ];

      // Mock profiles query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      } as never);

      // Mock reviews query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      } as never);

      const result = await UserService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'contractor@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
        phone: '+1234567890',
        bio: 'Experienced plumber',
        profile_image_url: 'https://example.com/profile.jpg',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        skills: [{ skillName: 'Plumbing' }, { skillName: 'Heating' }],
        reviews: [
          {
            rating: 5,
            comment: 'Excellent work!',
            reviewer: 'John Doe',
            createdAt: '2024-01-10T10:00:00Z',
          },
        ],
      });

      // Verify correct database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
    });

    it('should return user profile without reviews for homeowners', async () => {
      const mockUser = {
        id: userId,
        email: 'homeowner@example.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'homeowner',
        phone: '+0987654321',
        bio: null,
        profile_image_url: null,
        created_at: '2023-06-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        contractor_skills: [],
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      } as never);

      const result = await UserService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'homeowner@example.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'homeowner',
        phone: '+0987654321',
        bio: null,
        profile_image_url: null,
        created_at: '2023-06-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        skills: [],
        reviews: undefined,
      });

      // Should only query profiles (no reviews lookup for homeowners)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should return null when user not found', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Row not found' };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: notFoundError,
        }),
      } as never);

      const result = await UserService.getUserProfile('nonexistent_user');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching user profile:',
        expect.any(Error) // Error wraps the Supabase error object
      );
    });
  });

  describe('getHomeownerForJob', () => {
    const homeownerId = 'homeowner_123';

    it('should return homeowner information for job card', async () => {
      const mockHomeowner = {
        first_name: 'Alice',
        last_name: 'Wilson',
        created_at: '2023-03-15T00:00:00Z',
        rating: 4.5,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockHomeowner,
          error: null,
        }),
      } as never);

      // Mock review count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 15,
          error: null,
        }),
      } as never);

      const result = await UserService.getHomeownerForJob(homeownerId);

      expect(result).toEqual({
        name: 'Alice Wilson',
        rating: 4.5,
        reviewCount: 15,
        memberSince: 'Mar 2023',
      });
    });

    it('should handle missing name gracefully', async () => {
      const mockHomeowner = {
        first_name: null,
        last_name: '',
        created_at: '2023-01-01T00:00:00Z',
        rating: null,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockHomeowner,
          error: null,
        }),
      } as never);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      } as never);

      const result = await UserService.getHomeownerForJob(homeownerId);

      expect(result).toEqual({
        name: 'User',
        rating: 0,
        reviewCount: 0,
        memberSince: 'Jan 2023',
      });
    });
  });

  describe('updateUserProfile', () => {
    const userId = 'user_123';

    it('should update user profile successfully via the API', async () => {
      mockApi.put.mockResolvedValueOnce({ success: true, profile: {} });

      const result = await UserService.updateUserProfile(userId, {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1111111111',
        bio: 'Updated bio',
      } as never);

      expect(result).toBe(true);
      expect(mockApi.put).toHaveBeenCalledWith('/api/users/profile', {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+1111111111',
        bio: 'Updated bio',
        location: undefined,
      });
    });

    it('should handle update failure', async () => {
      mockApi.put.mockRejectedValueOnce(new Error('Update failed'));

      const result = await UserService.updateUserProfile(userId, {
        firstName: 'Test',
      } as never);

      expect(result).toBe(false);
    });
  });

  describe('getNearbyContractors', () => {
    const userLocation = {
      latitude: 51.5074,
      longitude: -0.1278,
    };

    it('should return nearby contractors within radius', async () => {
      const mockContractors = [
        {
          id: 'contractor_1',
          email: 'contractor1@example.com',
          first_name: 'John',
          last_name: 'Builder',
          role: 'contractor',
          phone: '+1234567890',
          bio: 'Professional builder',
          profile_image_url: 'profile1.jpg',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          latitude: 51.5155, // ~1km away
          longitude: -0.1426,
          is_available: true,
          contractor_skills: [{ skill_name: 'Building' }],
        },
        {
          id: 'contractor_2',
          email: 'contractor2@example.com',
          first_name: 'Jane',
          last_name: 'Plumber',
          role: 'contractor',
          phone: '+0987654321',
          bio: 'Expert plumber',
          profile_image_url: 'profile2.jpg',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          latitude: 52.5074, // ~111km away (filtered out at 25km radius)
          longitude: -0.1278,
          is_available: true,
          contractor_skills: [{ skill_name: 'Plumbing' }],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        data: mockContractors,
        error: null,
      };

      mockSupabase.from.mockReturnValueOnce(mockQuery as never);

      const result = await UserService.getNearbyContractors(
        userLocation.latitude,
        userLocation.longitude,
        25 // 25km radius
      );

      // Should only return contractor_1 (within 25km); contractor_2 is ~111km away
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contractor_1');
      expect(result[0].first_name).toBe('John');
      expect(result[0].skills).toEqual([{ skillName: 'Building' }]);
      // Distance is computed by the Haversine helper and surfaced on the profile
      expect(result[0].distance).toBeGreaterThan(0);
      expect(result[0].distance).toBeLessThanOrEqual(25);
    });

    it('should return empty array when no contractors found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        data: [],
        error: null,
      };

      mockSupabase.from.mockReturnValueOnce(mockQuery as never);

      const result = await UserService.getNearbyContractors(
        userLocation.latitude,
        userLocation.longitude
      );

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database query failed');

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        data: null,
        error: dbError,
      };

      mockSupabase.from.mockReturnValueOnce(mockQuery as never);

      const result = await UserService.getNearbyContractors(
        userLocation.latitude,
        userLocation.longitude
      );

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching nearby contractors:',
        dbError
      );
    });

    it('should handle very large coordinate differences with a large radius', async () => {
      const mockContractors = [
        {
          id: 'contractor_1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'Contractor',
          role: 'contractor',
          phone: '+1234567890',
          bio: 'Test bio',
          profile_image_url: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          latitude: -89.999, // Near south pole
          longitude: 179.999, // Near date line
          contractor_skills: [],
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        data: mockContractors,
        error: null,
      };

      mockSupabase.from.mockReturnValueOnce(mockQuery as never);

      const result = await UserService.getNearbyContractors(
        89.999, // Near north pole
        -179.999, // Near date line
        50000 // Large radius
      );

      // Should handle extreme coordinates without crashing
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('getPreviousContractors', () => {
    const homeownerId = 'homeowner_123';

    it('should return previous contractors with reviews (deduplicated)', async () => {
      const mockCompletedJobs = [
        {
          contractor_id: 'contractor_1',
          contractor: {
            id: 'contractor_1',
            first_name: 'John',
            last_name: 'Builder',
            bio: 'Professional builder',
            profile_image_url: 'profile1.jpg',
            phone: '+1234567890',
            contractor_skills: [{ skill_name: 'Building' }],
          },
        },
        {
          contractor_id: 'contractor_1', // Same contractor (should be deduplicated)
          contractor: {
            id: 'contractor_1',
            first_name: 'John',
            last_name: 'Builder',
            bio: 'Professional builder',
            profile_image_url: 'profile1.jpg',
            phone: '+1234567890',
            contractor_skills: [{ skill_name: 'Building' }],
          },
        },
      ];

      const mockReview = [
        {
          rating: 5,
          comment: 'Excellent work!',
          created_at: '2024-01-10T10:00:00Z',
        },
      ];

      // Mock completed jobs query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockCompletedJobs,
          error: null,
        }),
      } as never);

      // Mock review query for contractor
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReview,
          error: null,
        }),
      } as never);

      const result = await UserService.getPreviousContractors(homeownerId);

      expect(result).toHaveLength(1); // Should be deduplicated
      expect(result[0]).toEqual({
        id: 'contractor_1',
        email: '',
        first_name: 'John',
        last_name: 'Builder',
        role: 'contractor',
        phone: '+1234567890',
        bio: 'Professional builder',
        profile_image_url: 'profile1.jpg',
        created_at: '',
        updated_at: '',
        skills: [{ skillName: 'Building' }],
        reviews: [
          {
            rating: 5,
            comment: 'Excellent work!',
            reviewer: 'You',
            createdAt: '2024-01-10T10:00:00Z',
          },
        ],
      });
    });

    it('should return empty array when no completed jobs', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as never);

      const result = await UserService.getPreviousContractors(homeownerId);

      expect(result).toEqual([]);
    });

    it('should handle null contractor data gracefully', async () => {
      const mockCompletedJobs = [
        {
          contractor_id: 'contractor_1',
          contractor: null, // Contractor not found
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockCompletedJobs,
          error: null,
        }),
      } as never);

      const result = await UserService.getPreviousContractors(homeownerId);

      expect(result).toEqual([]);
    });
  });
});
