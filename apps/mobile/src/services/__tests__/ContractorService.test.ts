/**
 * Tests for ContractorService - Contractor Management Operations
 *
 * ContractorService is a thin facade over contractor/*.ts. Its public surface
 * (verified 2026-06-04 against src/services/ContractorService.ts) is:
 *   getContractorProfile      -> mobileApiClient GET /api/contractor/profile-data
 *   updateContractorProfile   -> mobileApiClient postFormData /api/contractor/update-profile
 *   uploadContractorImage     -> mobileApiClient postFormData /api/contractor/update-profile
 *   addContractorSkill        -> supabase contractor_skills insert
 *   updateContractorLocation  -> supabase profiles update (lat/lng only)
 *   updateContractorAvailability -> supabase profiles update
 *   searchContractors         -> supabase profiles (both string + advanced branches)
 *
 * The previous suite tested removed methods (getNearbyContractors,
 * findNearbyContractors, swipeContractor, getLikedContractors, getMatches)
 * and asserted a direct-Supabase read for getContractorProfile that moved to
 * mobileApiClient. Realigned to the current implementation.
 */

import { ContractorService } from '../ContractorService';
import { LocationData } from '@mintenance/types';

// Import mocked modules
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { mobileApiClient } from '../../utils/mobileApiClient';

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
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

// Manual mock at src/utils/__mocks__/mobileApiClient.ts
jest.mock('../../utils/mobileApiClient');

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
  const mockContractor = {
    id: 'contractor-123',
    email: 'contractor@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'contractor',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main St, New York, NY',
    profile_image_url: 'https://example.com/profile.jpg',
    bio: 'Experienced plumber with 10 years in the field',
    rating: 4.5,
    total_jobs_completed: 50,
    is_available: true,
    company_name: 'Best Plumbing Co',
    hourly_rate: 75,
    contractor_skills: [
      {
        id: 'skill-1',
        skill_name: 'Plumbing',
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'skill-2',
        skill_name: 'Electrical',
        created_at: '2025-01-01T00:00:00Z',
      },
    ],
    reviews: [
      {
        id: 'review-1',
        rating: 5,
        comment: 'Great work!',
        created_at: '2025-01-10T00:00:00Z',
      },
    ],
  };

  const mockLocation: LocationData = {
    latitude: 40.758,
    longitude: -73.9855,
    address: 'Times Square, New York, NY',
  };

  // Generic Supabase query-chain mock. `single`/`then` resolve to the supplied
  // data (or an error when shouldThrow).
  const createMockQueryChain = (
    returnData: unknown = null,
    shouldThrow = false
  ) => {
    const result = shouldThrow
      ? { data: null, error: new Error('Database error') }
      : { data: returnData, error: null };
    const chain: Record<string, jest.Mock | unknown> = {
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
      single: jest.fn(() => Promise.resolve(result)),
      then: (cb: (r: unknown) => unknown) => Promise.resolve(cb(result)),
    };
    return chain;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContractorProfile', () => {
    it('should fetch contractor profile via the profile-data API', async () => {
      (mobileApiClient.get as jest.Mock).mockResolvedValueOnce({
        contractor: {
          id: 'contractor-123',
          first_name: 'John',
          last_name: 'Doe',
          email: 'contractor@example.com',
          bio: 'Experienced plumber',
          company_name: 'Best Plumbing Co',
          hourly_rate: 75,
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.006,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
        },
      });

      const result =
        await ContractorService.getContractorProfile('contractor-123');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/profile-data'
      );
      expect(result).toMatchObject({
        id: 'contractor-123',
        user_id: 'contractor-123',
        company_name: 'Best Plumbing Co',
        bio: 'Experienced plumber',
        business_address: '123 Main St',
        hourly_rate: 75,
        user: {
          email: 'contractor@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      });
    });

    it('should return null when contractor not found', async () => {
      (mobileApiClient.get as jest.Mock).mockResolvedValueOnce({
        contractor: null,
      });

      const result =
        await ContractorService.getContractorProfile('non-existent');

      expect(result).toBeNull();
    });

    it('should return null and log on API error', async () => {
      (mobileApiClient.get as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const result =
        await ContractorService.getContractorProfile('contractor-123');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('searchContractors', () => {
    it('should search contractors by string query against profiles', async () => {
      // Legacy contractor-profiles side table retired 2026-07: keyword
      // search reads the canonical `profiles` table (role='contractor').
      const searchResults = [
        { ...mockContractor, skills: ['plumbing', 'electrical'] },
      ];

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain(searchResults)
      );

      const result = await ContractorService.searchContractors('plumbing');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual(searchResults);
    });

    it('should handle empty search term', async () => {
      const result = await ContractorService.searchContractors('');

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should search with advanced filters against profiles', async () => {
      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryChain([mockContractor])
      );

      const result = await ContractorService.searchContractors({
        query: 'plumber',
        location: mockLocation,
        minRating: 4.0,
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result).toHaveLength(1);
    });

    it('should filter by minimum rating', async () => {
      const chain = createMockQueryChain([mockContractor]);
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await ContractorService.searchContractors({
        location: mockLocation,
        minRating: 4.0,
      });

      expect(chain.gte).toHaveBeenCalledWith('rating', 4.0);
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

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_available: true })
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
    it('should update contractor lat/lng on profiles', async () => {
      const newLocation: LocationData = {
        latitude: 40.7489,
        longitude: -73.968,
        address: '456 Park Ave, New York, NY',
      };

      const chain = createMockQueryChain();
      // updateContractorLocation awaits .update().eq() directly.
      chain.eq = jest.fn(() => Promise.resolve({ data: null, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await ContractorService.updateContractorLocation(
        'contractor-123',
        newLocation
      );

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(chain.update).toHaveBeenCalledWith({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
      });
    });

    it('should throw error on location update failure', async () => {
      const chain = createMockQueryChain();
      chain.eq = jest.fn(() =>
        Promise.resolve({
          data: null,
          error: new Error('Location update failed'),
        })
      );
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(
        ContractorService.updateContractorLocation(
          'contractor-123',
          mockLocation
        )
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

      expect(supabase.from).toHaveBeenCalledWith('contractor_skills');
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

  describe('updateContractorProfile', () => {
    it('should update contractor profile via the update-profile API', async () => {
      const updatedProfile = {
        user_id: 'contractor-123',
        bio: 'Updated bio',
        company_name: 'Best Plumbing Co',
        hourly_rate: 75,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };

      (mobileApiClient.postFormData as jest.Mock).mockResolvedValueOnce({
        success: true,
        profile: updatedProfile,
      });

      await ContractorService.updateContractorProfile('contractor-123', {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Updated bio',
        companyName: 'Best Plumbing Co',
      });

      expect(mobileApiClient.postFormData).toHaveBeenCalledWith(
        '/api/contractor/update-profile',
        expect.any(Object)
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Contractor profile updated successfully'
      );
    });
  });
});
