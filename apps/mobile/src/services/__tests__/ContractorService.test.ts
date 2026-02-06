/**
 * Tests for ContractorService - Contractor Management Operations
 * Tests actual service functionality, not just existence
 */

import { ContractorService } from '../ContractorService';
import { LocationData } from '@mintenance/types';

// Import mocked modules
import { supabase } from '../../config/supabase';
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

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock SQL sanitization
jest.mock('../../utils/sqlSanitization', () => ({
  sanitizeForSQL: jest.fn((input: string) => input.replace(/[';]/g, '')),
}));

describe('ContractorService', () => {
  // Mock data
  const mockContractor = {
    id: 'contractor-123',
    email: 'contractor@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'contractor',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Main St, New York, NY',
    profile_image_url: 'https://example.com/profile.jpg',
    bio: 'Experienced plumber with 10 years in the field',
    rating: 4.5,
    total_jobs_completed: 50,
    is_available: true,
    contractor_skills: [
      { id: 'skill-1', skill_name: 'Plumbing', created_at: '2025-01-01T00:00:00Z' },
      { id: 'skill-2', skill_name: 'Electrical', created_at: '2025-01-01T00:00:00Z' },
    ],
    reviews: [
      { id: 'review-1', rating: 5, comment: 'Great work!', created_at: '2025-01-10T00:00:00Z' },
      { id: 'review-2', rating: 4, comment: 'Good service', created_at: '2025-01-12T00:00:00Z' },
    ],
  };

  const mockLocation: LocationData = {
    latitude: 40.7580,
    longitude: -73.9855,
    address: 'Times Square, New York, NY',
  };

  // Helper function to create mock query chain
  const createMockQueryChain = (returnData: any = null, shouldThrow: boolean = false) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => {
        if (shouldThrow) {
          return Promise.resolve({ data: null, error: new Error('Database error') });
        }
        return Promise.resolve({ data: returnData, error: null });
      }),
      then: (callback: (result: any) => any) => {
        if (shouldThrow) {
          return Promise.resolve(callback({ data: null, error: new Error('Database error') }));
        }
        return Promise.resolve(callback({ data: returnData, error: null }));
      },
    };
    return chain;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContractorProfile', () => {
    it('should fetch contractor profile successfully', async () => {
      const mockProfile = {
        ...mockContractor,
        user: {
          first_name: mockContractor.first_name,
          last_name: mockContractor.last_name,
          email: mockContractor.email,
        },
      };

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(mockProfile)
      );

      const result = await ContractorService.getContractorProfile('contractor-123');

      expect(supabase.from).toHaveBeenCalledWith('contractor_profiles');
      expect(result).toEqual(mockProfile);
    });

    it('should return null when contractor not found', async () => {
      const mockError = { code: 'PGRST116', message: 'Not found' };
      const chain = createMockQueryChain(null);
      chain.single = jest.fn(() =>
        Promise.resolve({ data: null, error: mockError })
      );

      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.getContractorProfile('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on general database errors', async () => {
      // The service actually returns null for any error that's not specifically thrown
      const error = { message: 'Connection failed', code: 'CONN_ERR' };
      const chain = createMockQueryChain(null);
      chain.single = jest.fn(() =>
        Promise.resolve({ data: null, error })
      );

      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.getContractorProfile('contractor-123');

      // Based on the implementation, errors with non-PGRST116 codes don't throw,
      // they just continue and return null when data is null
      expect(result).toBeNull();
    });
  });

  describe('getNearbyContractors', () => {
    it('should fetch and filter contractors within radius', async () => {
      const nearbyContractor = { ...mockContractor };
      const farContractor = {
        ...mockContractor,
        id: 'contractor-456',
        latitude: 41.8781, // Chicago coordinates (far from NYC)
        longitude: -87.6298,
      };

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain([nearbyContractor, farContractor])
      );

      const result = await ContractorService.getNearbyContractors(mockLocation, 10);

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contractor-123');
      expect(result[0].distance).toBeLessThan(10);
    });

    it('should handle empty results', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain([])
      );

      const result = await ContractorService.getNearbyContractors(mockLocation, 25);

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(null, true)
      );

      await expect(ContractorService.getNearbyContractors(mockLocation, 25))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should calculate distance correctly', async () => {
      const contractor = {
        ...mockContractor,
        // Set location approximately 5km from mockLocation
        latitude: 40.7128,
        longitude: -74.0060,
      };

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain([contractor])
      );

      const result = await ContractorService.getNearbyContractors(mockLocation, 50);

      expect(result[0].distance).toBeGreaterThan(0);
      expect(result[0].distance).toBeLessThan(10);
    });
  });

  describe('findNearbyContractors', () => {
    it('should find contractors within radius', async () => {
      const contractors = [
        { ...mockContractor, user_id: 'contractor-123' },
        {
          ...mockContractor,
          user_id: 'contractor-456',
          latitude: 40.7580,
          longitude: -73.9855,
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(contractors)
      );

      const location = {
        latitude: 40.7580,
        longitude: -73.9855,
        radius: 10,
      };

      const result = await ContractorService.findNearbyContractors(location, 'user-123');

      expect(supabase.from).toHaveBeenCalledWith('contractor_profiles');
      expect(result).toHaveLength(2);
    });

    it('should exclude current user', async () => {
      const chain = createMockQueryChain([mockContractor]);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await ContractorService.findNearbyContractors(
        { latitude: 40.7580, longitude: -73.9855, radius: 10 },
        'current-user'
      );

      expect(chain.neq).toHaveBeenCalledWith('user_id', 'current-user');
    });
  });

  describe('searchContractors', () => {
    it('should search contractors by string query', async () => {
      const searchResults = [
        { ...mockContractor, skills: 'plumbing,electrical' },
      ];

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(searchResults)
      );

      const result = await ContractorService.searchContractors('plumbing');

      expect(supabase.from).toHaveBeenCalledWith('contractor_profiles');
      expect(result).toEqual(searchResults);
    });

    it('should handle empty search term', async () => {
      const result = await ContractorService.searchContractors('');

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle search with advanced filters', async () => {
      const contractors = [mockContractor];
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(contractors)
      );

      const params = {
        query: 'plumber',
        skills: ['Plumbing'],
        location: mockLocation,
        maxDistance: 10,
        minRating: 4.0,
      };

      const result = await ContractorService.searchContractors(params);

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(result).toHaveLength(1);
      expect(result[0].skills).toContainEqual(
        expect.objectContaining({ skillName: 'Plumbing' })
      );
    });

    it('should filter by minimum rating', async () => {
      const highRatedContractor = { ...mockContractor, rating: 4.8 };
      const lowRatedContractor = {
        ...mockContractor,
        id: 'contractor-456',
        rating: 3.5,
      };

      const chain = createMockQueryChain([highRatedContractor, lowRatedContractor]);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await ContractorService.searchContractors({
        location: mockLocation,
        minRating: 4.0,
      });

      expect(chain.gte).toHaveBeenCalledWith('rating', 4.0);
    });
  });

  describe('swipeContractor', () => {
    it('should record a like action', async () => {
      const mockMatch = {
        id: 'match-123',
        homeowner_id: 'homeowner-123',
        contractor_id: 'contractor-123',
        action: 'liked',
        created_at: '2025-01-15T10:00:00Z',
      };

      const chain = createMockQueryChain(mockMatch);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.swipeContractor(
        'homeowner-123',
        'contractor-123',
        'liked'
      );

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          homeowner_id: 'homeowner-123',
          contractor_id: 'contractor-123',
          action: 'liked',
        })
      );
      expect(result).toEqual(mockMatch);
    });

    it('should record a pass action', async () => {
      const mockMatch = {
        id: 'match-124',
        homeowner_id: 'homeowner-123',
        contractor_id: 'contractor-456',
        action: 'passed',
        created_at: '2025-01-15T11:00:00Z',
      };

      const chain = createMockQueryChain(mockMatch);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.swipeContractor(
        'homeowner-123',
        'contractor-456',
        'passed'
      );

      expect(result.action).toBe('passed');
    });
  });

  describe('updateContractorAvailability', () => {
    it('should update availability to true', async () => {
      const chain = createMockQueryChain({ is_available: true });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.updateContractorAvailability(
        'contractor-123',
        true
      );

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_available: true,
        })
      );
      expect(result).toEqual({ isAvailable: true });
    });

    it('should update availability to false', async () => {
      const chain = createMockQueryChain({ is_available: false });
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.updateContractorAvailability(
        'contractor-123',
        false
      );

      expect(result).toEqual({ isAvailable: false });
    });

    it('should throw error on update failure', async () => {
      const chain = createMockQueryChain(null);
      chain.single = jest.fn(() =>
        Promise.resolve({ data: null, error: new Error('Update failed') })
      );
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(
        ContractorService.updateContractorAvailability('contractor-123', true)
      ).rejects.toThrow('Update failed');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateContractorLocation', () => {
    it('should update contractor location successfully', async () => {
      const newLocation: LocationData = {
        latitude: 40.7489,
        longitude: -73.9680,
        address: '456 Park Ave, New York, NY',
      };

      const chain = createMockQueryChain();
      chain.eq = jest.fn(() =>
        Promise.resolve({ data: null, error: null })
      );
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await ContractorService.updateContractorLocation('contractor-123', newLocation);

      expect(chain.update).toHaveBeenCalledWith({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        address: newLocation.address,
      });
    });

    it('should throw error on location update failure', async () => {
      const chain = createMockQueryChain();
      chain.eq = jest.fn(() =>
        Promise.resolve({ data: null, error: new Error('Location update failed') })
      );
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(
        ContractorService.updateContractorLocation('contractor-123', mockLocation)
      ).rejects.toThrow('Location update failed');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('addContractorSkill', () => {
    it('should add a new skill to contractor', async () => {
      const mockSkill = {
        id: 'skill-3',
        contractor_id: 'contractor-123',
        skill_name: 'HVAC',
        created_at: '2025-01-15T10:00:00Z',
      };

      const chain = createMockQueryChain(mockSkill);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.addContractorSkill(
        'contractor-123',
        'HVAC'
      );

      expect(chain.insert).toHaveBeenCalledWith({
        contractor_id: 'contractor-123',
        skill_name: 'HVAC',
      });
      expect(result).toEqual({
        id: mockSkill.id,
        contractorId: mockSkill.contractor_id,
        skillName: mockSkill.skill_name,
        createdAt: mockSkill.created_at,
      });
    });
  });

  describe('getLikedContractors', () => {
    it('should fetch all liked contractors', async () => {
      const mockMatches = [
        {
          contractor_id: 'contractor-123',
          contractor: mockContractor,
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(mockMatches)
      );

      const result = await ContractorService.getLikedContractors('homeowner-123');

      expect(supabase.from).toHaveBeenCalledWith('contractor_matches');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contractor-123');
    });

    it('should return empty array when no liked contractors', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain([])
      );

      const result = await ContractorService.getLikedContractors('homeowner-123');

      expect(result).toEqual([]);
    });
  });

  describe('getMatches', () => {
    it('should fetch contractor matches with details', async () => {
      const mockMatches = [
        {
          id: 'match-123',
          homeowner_id: 'homeowner-123',
          contractor_id: 'contractor-123',
          action: 'liked',
          created_at: '2025-01-15T10:00:00Z',
          contractor: {
            ...mockContractor,
            user: { email: mockContractor.email },
            skills: [{ skill_name: 'Plumbing' }],
          },
        },
      ];

      const chain = createMockQueryChain(mockMatches);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const result = await ContractorService.getMatches('homeowner-123');

      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockMatches);
    });
  });

  describe('updateContractorProfile', () => {
    it('should update contractor profile successfully', async () => {
      const profileUpdate = {
        bio: 'Updated bio',
        companyName: 'Best Plumbing Co',
        hourlyRate: 75,
        yearsExperience: 12,
      };

      const updatedProfile = {
        user_id: 'contractor-123',
        bio: profileUpdate.bio,
        company_name: profileUpdate.companyName,
        hourly_rate: profileUpdate.hourlyRate,
        years_experience: profileUpdate.yearsExperience,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };

      // Mock user update
      const userChain = createMockQueryChain();
      userChain.eq = jest.fn(() =>
        Promise.resolve({ data: null, error: null })
      );

      // Mock contractor profile upsert
      const profileChain = createMockQueryChain(updatedProfile);

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(userChain) // First call for users table
        .mockReturnValueOnce(profileChain); // Second call for contractor_profiles

      const result = await ContractorService.updateContractorProfile(
        'contractor-123',
        profileUpdate
      );

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(supabase.from).toHaveBeenNthCalledWith(1, 'users');
      expect(supabase.from).toHaveBeenNthCalledWith(2, 'contractor_profiles');
      expect(logger.info).toHaveBeenCalledWith('Contractor profile updated successfully');
    });
  });
});