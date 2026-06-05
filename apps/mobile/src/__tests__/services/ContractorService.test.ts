// Import supabase and types BEFORE ContractorService so mocks are in place
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { LocationData } from '../../types';

// calculateDistance lives in the contractor/ helpers module after the
// 2026 facade refactor; import it directly to exercise the Haversine math.
import { calculateDistance } from '../../services/contractor/ContractorHelpers';

// Import the REAL ContractorService (not mocked) - we want to test the actual implementation
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

// Use global Supabase mock from jest-setup.js
jest.mock('../../config/supabase');

// getContractorProfile routes through the web API via mobileApiClient.
jest.mock('../../utils/mobileApiClient');

// Logger is not mocked - using real implementation

const { mobileApiClient } = require('../../utils/mobileApiClient');

describe('ContractorService', () => {
  // Spy on logger methods for testing
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockHomeownerLocation: LocationData = {
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
  };

  // Shape returned by the `profiles` query in searchContractors' advanced
  // branch (snake_case columns + embedded contractor_skills/reviews).
  const mockContractorRow = {
    id: 'contractor-1',
    role: 'contractor',
    first_name: 'John',
    last_name: 'Contractor',
    email: 'contractor@example.com',
    is_available: true,
    latitude: 40.7589,
    longitude: -73.9851,
    hourly_rate: 50,
    bio: 'Experienced contractor',
    years_experience: 10,
    rating: 5,
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
      },
    ],
  };

  describe('getContractorProfile', () => {
    it('maps the /api/contractor/profile-data response', async () => {
      mobileApiClient.get.mockResolvedValueOnce({
        contractor: {
          id: 'contractor-1',
          first_name: 'John',
          last_name: 'Contractor',
          email: 'contractor@example.com',
          bio: 'Experienced contractor',
          hourly_rate: 50,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      const result = await ContractorService.getContractorProfile('user-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/profile-data'
      );
      expect(result?.bio).toBe('Experienced contractor');
    });

    it('returns null when the API throws', async () => {
      mobileApiClient.get.mockRejectedValueOnce(new Error('boom'));

      const result = await ContractorService.getContractorProfile('user-1');

      expect(result).toBeNull();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error fetching contractor profile:',
        expect.any(Object)
      );
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
          data: { ...mockContractorRow, is_available: false },
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
      // Scoped to the profiles table + role=contractor guard.
      expect(supabase.from).toHaveBeenCalledWith('profiles');
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

  describe('searchContractors (advanced filters)', () => {
    it('should search contractors by skills', async () => {
      // Advanced search builds a query off `profiles`, filters by an
      // `.in('id', ...)` for skills, then maps + filters in memory.
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        or: jest.fn(() => mockSupabaseChain),
        gte: jest.fn(() => mockSupabaseChain),
        in: jest.fn(() => mockSupabaseChain),
        // The query is awaited directly (no terminal .single); make the
        // chain thenable so `await query` resolves the result set.
        then: (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) =>
          Promise.resolve({ data: [mockContractorRow], error: null }).then(
            resolve,
            reject
          ),
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

    it('should search contractors by name using .or()', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        or: jest.fn(() => mockSupabaseChain),
        gte: jest.fn(() => mockSupabaseChain),
        in: jest.fn(() => mockSupabaseChain),
        then: (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) =>
          Promise.resolve({ data: [mockContractorRow], error: null }).then(
            resolve,
            reject
          ),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = (await ContractorService.searchContractors({
        query: 'John',
        location: mockHomeownerLocation,
      })) as Array<{ firstName?: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
      expect(mockSupabaseChain.or).toHaveBeenCalled();
    });

    it('should propagate database errors', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        eq: jest.fn(() => mockSupabaseChain),
        or: jest.fn(() => mockSupabaseChain),
        gte: jest.fn(() => mockSupabaseChain),
        in: jest.fn(() => mockSupabaseChain),
        then: (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) =>
          Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          }).then(resolve, reject),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      // The service rethrows the raw Supabase error object (not an
      // Error instance), so match on its shape rather than .toThrow.
      await expect(
        ContractorService.searchContractors({
          query: 'John',
          location: mockHomeownerLocation,
        })
      ).rejects.toMatchObject({ message: 'Database error' });

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error searching contractors:',
        expect.any(Object)
      );
    });
  });

  describe('searchContractors (keyword string)', () => {
    it('searches contractor_profiles via .or()', async () => {
      const mockSupabaseChain = {
        from: jest.fn(() => mockSupabaseChain),
        select: jest.fn(() => mockSupabaseChain),
        or: jest.fn(() => mockSupabaseChain),
        order: jest.fn(() => mockSupabaseChain),
        limit: jest.fn(() => ({ data: [mockContractorRow], error: null })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseChain);

      const result = await ContractorService.searchContractors('Plumbing');

      expect(supabase.from).toHaveBeenCalledWith('contractor_profiles');
      expect(mockSupabaseChain.or).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('returns [] for too-short keywords without querying', async () => {
      const result = await ContractorService.searchContractors('a');
      expect(result).toHaveLength(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('calculateDistance (Haversine helper)', () => {
    it('should calculate distance between two points', () => {
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
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it('should handle large distances', () => {
      const distance = calculateDistance(
        40.7128,
        -74.006, // NYC
        34.0522,
        -118.2437 // LA
      );
      expect(distance).toBeGreaterThan(3000); // > 3000km
    });
  });
});
