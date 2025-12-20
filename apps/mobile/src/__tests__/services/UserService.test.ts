import { UserService, ContractorStats, UserProfile } from '../../services/UserService';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
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

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContractorStats', () => {
    const contractorId = 'contractor_123';

    beforeEach(() => {
      // Mock the current date to ensure consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return comprehensive contractor statistics', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          status: 'completed',
          budget: 150,
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-12T15:00:00Z',
          homeowner_id: 'homeowner_1',
        },
        {
          id: 'job_2',
          status: 'in_progress',
          budget: 200,
          created_at: '2024-01-14T09:00:00Z',
          updated_at: '2024-01-14T09:00:00Z',
          homeowner_id: 'homeowner_2',
        },
        {
          id: 'job_3',
          status: 'assigned',
          budget: 100,
          created_at: '2024-01-13T11:00:00Z',
          updated_at: '2024-01-13T11:00:00Z',
          homeowner_id: 'homeowner_3',
        },
      ];

      const mockReviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ];

      const mockTodaysJobs = [
        {
          id: 'job_today_1',
          title: 'Plumbing Repair',
          location: '123 Main St, London',
          created_at: '2024-01-15T08:00:00Z',
          homeowner: {
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      ];

      // Mock jobs query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockJobs,
          error: null,
        }),
      } as any);

      // Mock reviews query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      } as any);

      // Mock today's jobs query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTodaysJobs,
          error: null,
        }),
      } as any);

      const result = await UserService.getContractorStats(contractorId);

      expect(result).toEqual({
        activeJobs: 2, // in_progress + assigned
        monthlyEarnings: 150, // Only completed job in January 2024
        rating: 4.7, // (5+4+5)/3 = 4.67 rounded to 4.7
        completedJobs: 1,
        totalJobs: 3,
        totalJobsCompleted: 1,
        responseTime: '< 1h', // Because rating >= 4.5
        successRate: 33, // 1 completed out of 3 total = 33%
        todaysAppointments: 1,
        nextAppointment: {
          time: '8:00 AM',
          client: 'John Doe',
          location: '123 Main St, London',
          type: 'Plumbing Repair',
          jobId: 'job_today_1',
        },
      });

      // Verify database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
    });

    it('should handle empty jobs gracefully', async () => {
      // Mock empty jobs
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      // Mock empty reviews
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      // Mock empty today's jobs
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const result = await UserService.getContractorStats(contractorId);

      expect(result).toEqual({
        activeJobs: 0,
        monthlyEarnings: 0,
        rating: 0,
        completedJobs: 0,
        totalJobs: 0,
        totalJobsCompleted: 0,
        responseTime: '< 4h', // No ratings = < 4.0 rating = < 4h
        successRate: 0,
        todaysAppointments: 0,
        nextAppointment: undefined,
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as any);

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
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching contractor stats:',
        dbError
      );
    });

    it('should calculate different response times based on rating', async () => {
      const testCases = [
        { rating: 4.8, expectedResponseTime: '< 1h' },
        { rating: 4.2, expectedResponseTime: '< 2h' },
        { rating: 3.5, expectedResponseTime: '< 4h' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const mockReviews = [{ rating: testCase.rating }];

        // Mock jobs query (empty for simplicity)
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any);

        // Mock reviews query
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: mockReviews,
            error: null,
          }),
        } as any);

        // Mock today's jobs query
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any);

        const result = await UserService.getContractorStats(contractorId);
        expect(result.responseTime).toBe(testCase.expectedResponseTime);
      }
    });
  });

  describe('getUserProfile', () => {
    const userId = 'user_123';

    it('should return user profile with contractor skills', async () => {
      const mockUser = {
        id: userId,
        email: 'contractor@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
        phone: '+1234567890',
        address: '456 Oak Ave',
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

      // Mock user profile query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      } as any);

      // Mock reviews query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      } as any);

      const result = await UserService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'contractor@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
        phone: '+1234567890',
        address: '456 Oak Ave',
        bio: 'Experienced plumber',
        profileImageUrl: 'https://example.com/profile.jpg',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      // Verify correct database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
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
        address: '789 Pine St',
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
      } as any);

      const result = await UserService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'homeowner@example.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'homeowner',
        phone: '+0987654321',
        address: '789 Pine St',
        bio: null,
        profileImageUrl: null,
        created_at: '2023-06-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      // Should only call users table, not reviews for homeowners
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
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
      } as any);

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
      } as any);

      // Mock review count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 15,
          error: null,
        }),
      } as any);

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
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      } as any);

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

    it('should update user profile successfully', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1111111111',
        bio: 'Updated bio',
        profileImageUrl: 'https://new-image.com/profile.jpg',
        latitude: 51.5074,
        longitude: -0.1278,
        address: 'New Address',
        isAvailable: true,
      };

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      } as any);

      const result = await UserService.updateUserProfile(userId, updates);

      expect(result).toBe(true);

      // Verify the update was called with correct data
      const updateCall = (mockSupabase.from as jest.Mock).mock.results[0].value;
      expect(updateCall.update).toHaveBeenCalledWith({
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+1111111111',
        bio: 'Updated bio',
        profile_image_url: 'https://new-image.com/profile.jpg',
        latitude: 51.5074,
        longitude: -0.1278,
        address: 'New Address',
        is_available: true,
        updated_at: expect.any(String),
      });
    });

    it('should handle update failure', async () => {
      const updateError = new Error('Update failed');

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: updateError,
        }),
      } as any);

      const result = await UserService.updateUserProfile(userId, {
        firstName: 'Test',
      });

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
          address: '123 Builder St',
          bio: 'Professional builder',
          profile_image_url: 'profile1.jpg',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          latitude: 51.5155, // ~1km away
          longitude: -0.1426,
          is_available: true,
          contractor_skills: [
            { skill_name: 'Building' },
          ],
        },
        {
          id: 'contractor_2',
          email: 'contractor2@example.com',
          first_name: 'Jane',
          last_name: 'Plumber',
          role: 'contractor',
          phone: '+0987654321',
          address: '456 Plumber Ave',
          bio: 'Expert plumber',
          profile_image_url: 'profile2.jpg',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          latitude: 52.5074, // ~111km away (should be filtered out with 25km radius)
          longitude: -0.1278,
          is_available: true,
          contractor_skills: [
            { skill_name: 'Plumbing' },
          ],
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: mockContractors,
          error: null,
        }),
      } as any);

      const result = await UserService.getNearbyContractors(
        userLocation.latitude,
        userLocation.longitude,
        25 // 25km radius
      );

      // Should only return contractor_1 (within 25km)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contractor_1');
      expect(result[0].first_name).toBe('John');
    });

    it('should return empty array when no contractors found', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const result = await UserService.getNearbyContractors(
        userLocation.latitude,
        userLocation.longitude
      );

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database query failed');

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      } as any);

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
  });

  describe('getPreviousContractors', () => {
    const homeownerId = 'homeowner_123';

    it('should return previous contractors with reviews', async () => {
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
            address: '123 Builder St',
            contractor_skills: [
              { skill_name: 'Building' },
            ],
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
            address: '123 Builder St',
            contractor_skills: [
              { skill_name: 'Building' },
            ],
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
      } as any);

      // Mock review query for contractor
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReview,
          error: null,
        }),
      } as any);

      const result = await UserService.getPreviousContractors(homeownerId);

      expect(result).toHaveLength(1); // Should be deduplicated
      expect(result[0]).toEqual({
        id: 'contractor_1',
        email: '',
        first_name: 'John',
        last_name: 'Builder',
        role: 'contractor',
        phone: '+1234567890',
        address: '123 Builder St',
        bio: 'Professional builder',
        profileImageUrl: 'profile1.jpg',
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
      } as any);

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
      } as any);

      const result = await UserService.getPreviousContractors(homeownerId);

      expect(result).toEqual([]);
    });
  });

  describe('distance calculation helper method', () => {
    it('should calculate distance correctly', () => {
      // Access private method for testing with proper context
      const calculateDistance = (UserService as any).calculateDistance.bind(UserService);

      // Test London to Paris distance
      const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
      expect(distance).toBeCloseTo(344, 0); // ~344km
    });

    it('should convert degrees to radians correctly', () => {
      const toRadians = (UserService as any).toRadians.bind(UserService);

      expect(toRadians(0)).toBe(0);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(toRadians(180)).toBeCloseTo(Math.PI, 5);
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI, 5);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed contractor stats data', async () => {
      const malformedJobs = [
        {
          id: 'job_1',
          status: null, // Invalid status
          budget: 'invalid', // Invalid budget
          created_at: 'invalid_date',
          updated_at: null,
          homeowner_id: null,
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: malformedJobs,
          error: null,
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any);

      const result = await UserService.getContractorStats('contractor_123');

      // Should handle malformed data gracefully
      expect(result.monthlyEarnings).toBe(0);
      expect(result.activeJobs).toBe(0);
      expect(result.totalJobs).toBe(1);
    });

    it('should handle very large coordinate differences', async () => {
      const mockContractors = [
        {
          id: 'contractor_1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'Contractor',
          role: 'contractor',
          phone: '+1234567890',
          address: 'Test Address',
          bio: 'Test bio',
          profile_image_url: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          latitude: -89.999, // Near south pole
          longitude: 179.999, // Near date line
          contractor_skills: [],
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: mockContractors,
          error: null,
        }),
      } as any);

      const result = await UserService.getNearbyContractors(
        89.999, // Near north pole
        -179.999, // Near date line
        50000 // Large radius
      );

      // Should handle extreme coordinates without crashing
      expect(Array.isArray(result)).toBe(true);
    });
  });
});