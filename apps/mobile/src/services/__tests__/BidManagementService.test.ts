/**
 * Tests for BidManagementService - Bid Management Operations
 *
 * The service uses mobileApiClient for submitBid/acceptBid (via web API)
 * and supabase directly for getBidsByJob/getBidsByContractor (direct DB queries).
 */

import { BidManagementService } from '../BidManagementService';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';

// Auto-mock mobileApiClient (picks up __mocks__/mobileApiClient.ts)
jest.mock('../../utils/mobileApiClient');

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

// Note: supabase is provided by the global mock via moduleNameMapper
// (src/config/__mocks__/supabase.ts) which includes auth.getSession.
// Do NOT add an inline jest.mock for config/supabase here.

const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

describe('BidManagementService', () => {
  const mockBidData = {
    id: 'bid-123',
    job_id: 'job-123',
    contractor_id: 'contractor-123',
    amount: 1500,
    message: 'I can complete this job in 2 weeks',
    status: 'pending' as const,
    created_at: '2025-01-15T10:00:00Z',
  };

  const mockBidWithContractor = {
    ...mockBidData,
    contractor: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    },
  };

  const mockBidWithJob = {
    ...mockBidData,
    job: {
      title: 'Plumbing Repair',
      description: 'Fix leaky faucet',
      location: 'New York',
      budget: 2000,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitBid', () => {
    it('should submit a bid successfully via API', async () => {
      mockedApiClient.post.mockResolvedValue({
        bid: mockBidData,
      });

      const bidData = {
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'I can complete this job in 2 weeks',
      };

      const result = await BidManagementService.submitBid(bidData);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        expect.objectContaining({
          jobId: 'job-123',
          bidAmount: 1500,
          proposalText: 'I can complete this job in 2 weeks',
        })
      );
      expect(result).toEqual({
        id: 'bid-123',
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'I can complete this job in 2 weeks',
        status: 'pending',
        createdAt: '2025-01-15T10:00:00Z',
      });
    });

    it('should throw error when API returns no bid', async () => {
      mockedApiClient.post.mockResolvedValue({});

      const bidData = {
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'Test bid',
      };

      await expect(BidManagementService.submitBid(bidData)).rejects.toThrow(
        'No bid returned from API'
      );
    });

    it('should throw error when API call fails', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('Network error'));

      const bidData = {
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'Test bid',
      };

      await expect(BidManagementService.submitBid(bidData)).rejects.toThrow('Network error');
    });

    it('should send correct field mapping to API', async () => {
      mockedApiClient.post.mockResolvedValue({ bid: mockBidData });

      await BidManagementService.submitBid({
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'Test',
        estimatedDurationDays: 14,
        proposedStartDate: '2025-02-01',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        {
          jobId: 'job-123',
          bidAmount: 1500,
          proposalText: 'Test',
          estimatedDuration: 14,
          proposedStartDate: '2025-02-01',
        }
      );
    });
  });

  describe('getBidsByJob', () => {
    it('should get all bids for a job', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockBidWithContractor],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByJob('job-123');

      expect(supabase.from).toHaveBeenCalledWith('bids');
      expect(mockFrom.select).toHaveBeenCalledWith(
        expect.stringContaining('contractor:users')
      );
      expect(mockFrom.eq).toHaveBeenCalledWith('job_id', 'job-123');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'bid-123',
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'I can complete this job in 2 weeks',
        status: 'pending',
        createdAt: '2025-01-15T10:00:00Z',
        contractorName: 'John Doe',
        contractorEmail: 'john@example.com',
      });
    });

    it('should return empty array when no bids found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByJob('job-999');

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const error = new Error('Query failed');
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(BidManagementService.getBidsByJob('job-123')).rejects.toThrow('Query failed');
    });

    it('should include contractor information', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockBidWithContractor],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByJob('job-123');

      expect(result[0].contractorName).toBe('John Doe');
      expect(result[0].contractorEmail).toBe('john@example.com');
    });

    it('should handle bids without contractor info', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockBidData],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByJob('job-123');

      expect(result[0].contractorName).toBeUndefined();
      expect(result[0].contractorEmail).toBeUndefined();
    });
  });

  describe('getBidsByContractor', () => {
    it('should get all bids by a contractor', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockBidWithJob],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByContractor('contractor-123');

      expect(supabase.from).toHaveBeenCalledWith('bids');
      expect(mockFrom.select).toHaveBeenCalledWith(expect.stringContaining('job:jobs'));
      expect(mockFrom.eq).toHaveBeenCalledWith('contractor_id', 'contractor-123');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'bid-123',
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'I can complete this job in 2 weeks',
        status: 'pending',
        createdAt: '2025-01-15T10:00:00Z',
        jobTitle: 'Plumbing Repair',
        jobDescription: 'Fix leaky faucet',
        jobLocation: 'New York',
        jobBudget: 2000,
      });
    });

    it('should return empty array when no bids found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByContractor('contractor-999');

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const error = new Error('Query failed');
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(BidManagementService.getBidsByContractor('contractor-123')).rejects.toThrow(
        'Query failed'
      );
    });

    it('should include job information', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockBidWithJob],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByContractor('contractor-123');

      expect(result[0].jobTitle).toBe('Plumbing Repair');
      expect(result[0].jobDescription).toBe('Fix leaky faucet');
      expect(result[0].jobLocation).toBe('New York');
      expect(result[0].jobBudget).toBe(2000);
    });

    it('should handle bids without job info', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockBidData],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByContractor('contractor-123');

      expect(result[0].jobTitle).toBeUndefined();
      expect(result[0].jobDescription).toBeUndefined();
    });
  });

  describe('acceptBid', () => {
    it('should fetch bid via supabase and accept via API', async () => {
      // acceptBid first fetches bid from supabase, then calls mobileApiClient.post
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job_id: 'job-123', contractor_id: 'contractor-123' },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);
      mockedApiClient.post.mockResolvedValue({});

      await BidManagementService.acceptBid('bid-123');

      // Verify supabase bid lookup
      expect(supabase.from).toHaveBeenCalledWith('bids');
      expect(mockFrom.select).toHaveBeenCalledWith('job_id, contractor_id');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'bid-123');

      // Verify API call
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-123/accept'
      );
    });

    it('should throw error when bid not found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(BidManagementService.acceptBid('non-existent')).rejects.toThrow(
        'Bid not found'
      );
    });

    it('should throw error when bid fetch fails', async () => {
      const error = { message: 'Database connection failed' };
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(BidManagementService.acceptBid('bid-123')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should throw error when API accept call fails', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job_id: 'job-123', contractor_id: 'contractor-123' },
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);
      mockedApiClient.post.mockRejectedValue(new Error('Accept failed'));

      await expect(BidManagementService.acceptBid('bid-123')).rejects.toThrow('Accept failed');
    });
  });

  describe('formatBid (via integration tests)', () => {
    it('should format bid with all fields', async () => {
      const completeBidData = {
        ...mockBidWithContractor,
        job: {
          title: 'Test Job',
          description: 'Test description',
          location: 'Test location',
          budget: 5000,
        },
      };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [completeBidData],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByJob('job-123');

      expect(result[0]).toEqual({
        id: 'bid-123',
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'I can complete this job in 2 weeks',
        status: 'pending',
        createdAt: '2025-01-15T10:00:00Z',
        contractorName: 'John Doe',
        contractorEmail: 'john@example.com',
        jobTitle: 'Test Job',
        jobDescription: 'Test description',
        jobLocation: 'Test location',
        jobBudget: 5000,
      });
    });

    it('should handle partial contractor data', async () => {
      const bidWithPartialContractor = {
        ...mockBidData,
        contractor: {
          first_name: 'John',
          // Missing last_name
        },
      };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [bidWithPartialContractor],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByJob('job-123');

      expect(result[0].contractorName).toBeUndefined();
    });

    it('should handle partial job data', async () => {
      const bidWithPartialJob = {
        ...mockBidData,
        job: {
          // Missing title
          description: 'Test description',
        },
      };

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [bidWithPartialJob],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await BidManagementService.getBidsByContractor('contractor-123');

      expect(result[0].jobTitle).toBeUndefined();
    });
  });
});
