import { ContractorService } from '../../services/ContractorService';

// Mock only external dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

const { supabase } = require('../../config/supabase');

describe('ContractorService - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContractorProfile', () => {
    it('should fetch contractor profile', async () => {
      const mockProfile = {
        id: 'contractor-1',
        user_id: 'user-1',
        bio: 'Experienced contractor',
        hourly_rate: 50,
        skills: ['plumbing', 'electrical'],
        user: {
          first_name: 'John',
          last_name: 'Contractor',
          email: 'john@example.com',
        },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.getContractorProfile('user-1');

      expect(supabase.from).toHaveBeenCalledWith('contractor_profiles');
      expect(result?.bio).toBe('Experienced contractor');
    });

    it('should return null when profile not found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.getContractorProfile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findNearbyContractors', () => {
    it('should find contractors near location', async () => {
      const mockContractors = [
        {
          id: 'contractor-1',
          user_id: 'user-1',
          skills: ['plumbing'],
          latitude: 40.7128,
          longitude: -74.0060,
          user: { first_name: 'John', last_name: 'Doe' },
        },
        {
          id: 'contractor-2', 
          user_id: 'user-2',
          skills: ['electrical'],
          latitude: 40.7589,
          longitude: -73.9851,
          user: { first_name: 'Jane', last_name: 'Smith' },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ data: mockContractors, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.findNearbyContractors({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 10,
      }, 'user-3');

      expect(result).toHaveLength(2);
      expect(result[0].skills).toContain('plumbing');
    });

    it('should filter out current user from results', async () => {
      const mockContractors = [
        {
          id: 'contractor-1',
          user_id: 'user-1',
          skills: ['plumbing'],
          user: { first_name: 'John', last_name: 'Doe' },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ data: mockContractors, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.findNearbyContractors({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 10,
      }, 'current-user');

      expect(mockChain.neq).toHaveBeenCalledWith('user_id', 'current-user');
    });
  });

  describe('swipeContractor', () => {
    it('should record contractor match', async () => {
      const mockMatch = {
        id: 'match-1',
        homeowner_id: 'user-1',
        contractor_id: 'user-2',
        action: 'liked',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockMatch, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.swipeContractor(
        'user-1',
        'user-2',
        'liked'
      );

      expect(supabase.from).toHaveBeenCalledWith('contractor_matches');
      expect(result.action).toBe('liked');
    });

    it('should handle swipe errors', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Swipe failed')),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(
        ContractorService.swipeContractor('user-1', 'user-2', 'liked')
      ).rejects.toThrow('Swipe failed');
    });
  });

  describe('getMatches', () => {
    it('should get mutual matches', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          contractor: {
            user: { first_name: 'John', last_name: 'Contractor' },
            skills: ['plumbing'],
          },
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockMatches, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.getMatches('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].contractor.skills).toContain('plumbing');
    });
  });

  describe('searchContractors', () => {
    it('should search contractors by skills', async () => {
      const mockContractors = [
        {
          id: 'contractor-1',
          user: { first_name: 'John', last_name: 'Plumber' },
          skills: ['plumbing', 'repair'],
          average_rating: 4.8,
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockContractors, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await ContractorService.searchContractors('plumbing');

      expect(result).toHaveLength(1);
      expect(result[0].skills).toContain('plumbing');
    });
  });
});