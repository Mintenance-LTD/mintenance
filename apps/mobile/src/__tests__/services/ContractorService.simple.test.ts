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

// Mock only external dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// getContractorProfile routes through the web API via mobileApiClient
// (refactored 2026-04-29). Use the manual mock so we don't hit a real
// fetch / supabase.auth.getSession().
jest.mock('../../utils/mobileApiClient');

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { supabase } = require('../../config/supabase');
const { mobileApiClient } = require('../../utils/mobileApiClient');

describe('ContractorService - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContractorProfile', () => {
    it('should fetch contractor profile via /api/contractor/profile-data', async () => {
      // The route bundles profiles.* (including hourly_rate) into a
      // `contractor` block.
      const apiResponse = {
        contractor: {
          id: 'contractor-1',
          first_name: 'John',
          last_name: 'Contractor',
          email: 'john@example.com',
          bio: 'Experienced contractor',
          hourly_rate: 50,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mobileApiClient.get.mockResolvedValueOnce(apiResponse);

      const result = await ContractorService.getContractorProfile('user-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/profile-data'
      );
      expect(result?.bio).toBe('Experienced contractor');
      expect(result?.hourly_rate).toBe(50);
    });

    it('should return null when profile not found', async () => {
      mobileApiClient.get.mockResolvedValueOnce({ contractor: null });

      const result =
        await ContractorService.getContractorProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when the API call throws', async () => {
      mobileApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await ContractorService.getContractorProfile('user-1');

      expect(result).toBeNull();
    });
  });

  describe('updateContractorAvailability', () => {
    it('should toggle availability and return the new flag', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.updateContractorAvailability(
        'contractor-1',
        false
      );

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(result.isAvailable).toBe(false);
    });

    it('should throw on update error', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(
        ContractorService.updateContractorAvailability('contractor-1', false)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('searchContractors', () => {
    it('should search contractors by keyword string using .or()', async () => {
      const mockContractors = [
        {
          id: 'contractor-1',
          company_name: 'John Plumbing',
          skills: ['plumbing', 'repair'],
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValue({ data: mockContractors, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = (await ContractorService.searchContractors(
        'plumbing'
      )) as Array<{ skills?: string[] }>;

      // Legacy contractor-profiles side table retired 2026-07: keyword search reads profiles.
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockChain.or).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].skills).toContain('plumbing');
    });

    it('should return empty array for too-short search terms', async () => {
      const result = await ContractorService.searchContractors('a');

      expect(result).toHaveLength(0);
      // Too-short terms short-circuit before touching the DB.
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
