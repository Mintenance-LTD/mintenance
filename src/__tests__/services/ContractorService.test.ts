import { ContractorService } from '../../services/ContractorService';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { ContractorProfile, LocationData, ContractorMatch } from '../../types';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => ({
              not: jest.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ContractorService', () => {
  const mockHomeownerLocation: LocationData = {
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
  };

  const mockContractor = {
    id: 'contractor-1',
    email: 'contractor@example.com',
    first_name: 'John',
    last_name: 'Contractor',
    role: 'contractor',
    phone: '555-0123',
    avatar_url: null,
    is_available: true,
    latitude: 40.7589,
    longitude: -73.9851,
    hourly_rate: 50,
    bio: 'Experienced contractor',
    years_experience: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    contractor_skills: [
      {
        id: 'skill-1',
        skill_name: 'Plumbing',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'skill-2',
        skill_name: 'Electrical',
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
    reviews: [
      {
        id: 'review-1',
        rating: 5,
        comment: 'Great work!',
        created_at: '2024-01-01T00:00:00Z',
        reviewer: { first_name: 'Jane', last_name: 'Homeowner' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNearbyContractors', () => {
    it('should return contractors within radius', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        not: jest.fn(() => mockSupabaseChain),
      };

      mockSupabaseChain.not.mockReturnValueOnce({
        not: jest.fn(() => ({
          data: [mockContractor],
          error: null,
        })),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.getNearbyContractors(
        mockHomeownerLocation,
        25
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'contractor-1',
        firstName: 'John',
        lastName: 'Contractor',
        email: 'contractor@example.com',
        skills: expect.arrayContaining([
          expect.objectContaining({
            id: 'skill-1',
            skillName: 'Plumbing',
          }),
          expect.objectContaining({
            id: 'skill-2',
            skillName: 'Electrical',
          }),
        ]),
      });
      expect(result[0].distance).toBeDefined();
      expect(typeof result[0].distance).toBe('number');
    });

    it('should filter contractors by radius', async () => {
      const farContractor = {
        ...mockContractor,
        id: 'contractor-2',
        latitude: 41.8781, // Chicago coordinates (far from NYC)
        longitude: -87.6298,
      };

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        not: jest.fn(() => mockSupabaseChain),
      };

      mockSupabaseChain.not.mockReturnValueOnce({
        not: jest.fn(() => ({
          data: [mockContractor, farContractor],
          error: null,
        })),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.getNearbyContractors(
        mockHomeownerLocation,
        25
      );

      // Should only return the nearby contractor
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contractor-1');
    });

    it('should make calculateDistance method accessible for testing', () => {
      // Make the private method accessible for testing
      const calculateDistance = (
        ContractorService as any
      ).calculateDistance.bind(ContractorService);

      const distance = calculateDistance(40.7128, -74.006, 40.7589, -73.9851);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should handle database error', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        not: jest.fn(() => mockSupabaseChain),
      };

      mockSupabaseChain.not.mockReturnValueOnce({
        not: jest.fn(() => ({
          data: null,
          error: { message: 'Database error' },
        })),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      await expect(
        ContractorService.getNearbyContractors(mockHomeownerLocation, 25)
      ).rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching nearby contractors:',
        expect.any(Object)
      );
    });

    it('should use default radius when none provided', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        not: jest.fn(() => mockSupabaseChain),
      };

      mockSupabaseChain.not.mockReturnValueOnce({
        not: jest.fn(() => ({
          data: [mockContractor],
          error: null,
        })),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.getNearbyContractors(
        mockHomeownerLocation
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('recordContractorMatch', () => {
    it('should record a contractor match', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        insert: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: {
            id: 'match-1',
            homeowner_id: 'homeowner-1',
            contractor_id: 'contractor-1',
            action: 'like',
            created_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.recordContractorMatch(
        'homeowner-1',
        'contractor-1',
        'like'
      );

      expect(result).toMatchObject({
        id: 'match-1',
        homeownerId: 'homeowner-1',
        contractorId: 'contractor-1',
        action: 'like',
      });

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        homeowner_id: 'homeowner-1',
        contractor_id: 'contractor-1',
        action: 'like',
      });
    });

    it('should handle match recording error', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        insert: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: null,
          error: { message: 'Insert failed' },
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      await expect(
        ContractorService.recordContractorMatch(
          'homeowner-1',
          'contractor-1',
          'like'
        )
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('getContractorMatches', () => {
    it('should return contractor matches', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          homeowner_id: 'homeowner-1',
          contractor_id: 'contractor-1',
          action: 'like',
          created_at: '2024-01-01T00:00:00Z',
          contractor: mockContractor,
        },
      ];

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => ({
          data: mockMatches,
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result =
        await ContractorService.getContractorMatches('homeowner-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'match-1',
        homeownerId: 'homeowner-1',
        contractorId: 'contractor-1',
        action: 'like',
      });
      expect(result[0].contractor).toBeDefined();
    });

    it('should handle empty matches', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result =
        await ContractorService.getContractorMatches('homeowner-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateContractorAvailability', () => {
    it('should update contractor availability', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        update: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: {
            ...mockContractor,
            is_available: false,
          },
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.updateContractorAvailability(
        'contractor-1',
        false
      );

      expect(result.isAvailable).toBe(false);
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        is_available: false,
        updated_at: expect.any(String),
      });
    });

    it('should handle update error', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        update: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        single: jest.fn(() => ({
          data: null,
          error: { message: 'Update failed' },
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      await expect(
        ContractorService.updateContractorAvailability('contractor-1', false)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('searchContractors', () => {
    it('should search contractors by skills', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        ilike: jest.fn(() => mockSupabaseChain),
        in: jest.fn(() => ({
          data: [mockContractor],
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.searchContractors({
        skills: ['Plumbing'],
        location: mockHomeownerLocation,
        maxDistance: 50,
      });

      expect(result).toHaveLength(1);
      expect(mockSupabaseChain.in).toHaveBeenCalledWith(
        'id',
        expect.any(Array)
      );
    });

    it('should search contractors by name', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        ilike: jest.fn(() => ({
          data: [mockContractor],
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.searchContractors({
        query: 'John',
        location: mockHomeownerLocation,
      });

      expect(result).toHaveLength(1);
      expect(mockSupabaseChain.ilike).toHaveBeenCalledWith(
        'first_name',
        '%John%'
      );
    });

    it('should handle empty search results', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        ilike: jest.fn(() => ({
          data: [],
          error: null,
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.searchContractors({
        query: 'NonExistent',
        location: mockHomeownerLocation,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const calculateDistance = (
        ContractorService as any
      ).calculateDistance.bind(ContractorService);
      const distance = calculateDistance(
        40.7128,
        -74.006, // NYC
        40.7589,
        -73.9851 // Times Square
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10); // Should be less than 10km
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same coordinates', () => {
      const calculateDistance = (
        ContractorService as any
      ).calculateDistance.bind(ContractorService);
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);

      expect(distance).toBe(0);
    });

    it('should handle large distances', () => {
      const calculateDistance = (
        ContractorService as any
      ).calculateDistance.bind(ContractorService);
      const distance = calculateDistance(
        40.7128,
        -74.006, // NYC
        34.0522,
        -118.2437 // LA
      );

      expect(distance).toBeGreaterThan(3000); // Should be > 3000km (more accurate)
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null coordinates gracefully', async () => {
      const contractorWithNullCoords = {
        ...mockContractor,
        latitude: null,
        longitude: null,
      };

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        not: jest.fn(() => mockSupabaseChain),
      };

      mockSupabaseChain.not.mockReturnValueOnce({
        not: jest.fn(() => ({
          data: [contractorWithNullCoords],
          error: null,
        })),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.getNearbyContractors(
        mockHomeownerLocation,
        25
      );
      expect(result).toHaveLength(0); // Should filter out contractors with null coords
    });

    it('should handle invalid location data', async () => {
      const invalidLocation = {
        latitude: NaN,
        longitude: NaN,
      } as LocationData;

      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        not: jest.fn(() => mockSupabaseChain),
      };

      mockSupabaseChain.not.mockReturnValueOnce({
        not: jest.fn(() => ({
          data: [mockContractor],
          error: null,
        })),
      });

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.getNearbyContractors(
        invalidLocation,
        25
      );
      expect(result).toHaveLength(0);
    });
  });
});
