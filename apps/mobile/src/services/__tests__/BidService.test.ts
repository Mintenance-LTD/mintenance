/**
 * Tests for BidService - Financial Transaction and Bidding Operations
 *
 * BidService now delegates to mobileApiClient for all operations.
 * - createBid: validates then delegates to BidManagementService.submitBid (which uses mobileApiClient)
 * - getBidsByJob/getBidsByContractor/acceptBid/rejectBid/withdrawBid/updateBid: all use mobileApiClient
 */

import { BidService, BidData, Bid } from '../BidService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';

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

// Note: supabase is provided by the global mock via moduleNameMapper.
// Do NOT add an inline jest.mock for config/supabase here.

const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

/**
 * Helper: prime the global supabase mock so `getBidJobId(bidId)`
 * returns `{ data: { job_id }, error }`.
 *
 * `getBidJobId` is the only direct-Supabase read left in BidService —
 * a single-row RLS-scoped lookup that translates a bidId into the
 * jobId needed for the nested `/api/jobs/[id]/bids/[bidId]/...`
 * mutation routes. Future cleanup (TODO in BidService.ts) is to add
 * `jobId` as an explicit second arg to the mutation methods, which
 * would remove this mock pattern entirely.
 */
function mockBidJobIdLookup(payload: {
  jobId?: string;
  error?: unknown;
}): void {
  const single = jest.fn().mockResolvedValue({
    data: payload.jobId ? { job_id: payload.jobId } : null,
    error: payload.error ?? null,
  });
  const eq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  (supabase.from as jest.Mock).mockReturnValue({ select });
}

describe('BidService', () => {
  // Test data fixtures
  const mockBidData: BidData = {
    job_id: 'job-123',
    contractor_id: 'contractor-456',
    amount: 2500.5,
    message:
      'I can complete this project within 2 weeks with quality materials',
    estimated_duration: '2 weeks',
    availability: '2025-02-01',
  };

  const mockBid: Bid = {
    id: 'bid-789',
    ...mockBidData,
    status: 'pending',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
    contractor: {
      id: 'contractor-456',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      rating: 4.8,
      reviews_count: 25,
      profile_picture: 'https://example.com/profile.jpg',
    },
  };

  const mockBidWithJob: Bid = {
    ...mockBid,
    job: {
      id: 'job-123',
      title: 'Kitchen Renovation',
      description: 'Complete kitchen remodel',
      budget: 5000,
      category: 'renovation',
      status: 'open',
      location: 'New York, NY',
      created_at: '2025-01-15T08:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBid', () => {
    it('should create a bid successfully with valid data', async () => {
      // createBid delegates to BidManagementService.submitBid which calls mobileApiClient.post
      mockedApiClient.post.mockResolvedValue({
        bid: {
          id: 'bid-789',
          job_id: 'job-123',
          contractor_id: 'contractor-456',
          amount: 2500.5,
          message: mockBidData.message,
          status: 'pending',
          created_at: '2025-01-20T10:00:00Z',
        },
      });

      const result = await BidService.createBid(mockBidData);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        expect.objectContaining({
          jobId: 'job-123',
          bidAmount: 2500.5,
        })
      );
      expect(result.id).toBe('bid-789');
      expect(result.status).toBe('pending');
    });

    it('should throw error when amount is zero', async () => {
      const invalidBidData: BidData = {
        ...mockBidData,
        amount: 0,
      };

      await expect(BidService.createBid(invalidBidData)).rejects.toThrow(
        'Bid amount must be greater than 0'
      );
    });

    it('should throw error when amount is negative', async () => {
      const invalidBidData: BidData = {
        ...mockBidData,
        amount: -100,
      };

      await expect(BidService.createBid(invalidBidData)).rejects.toThrow(
        'Bid amount must be greater than 0'
      );
    });

    it('should throw error when message is empty', async () => {
      const invalidBidData: BidData = {
        ...mockBidData,
        message: '   ',
      };

      await expect(BidService.createBid(invalidBidData)).rejects.toThrow(
        'Bid message is required'
      );
    });

    it('should handle API errors during creation', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(BidService.createBid(mockBidData)).rejects.toThrow(
        'Network error'
      );
    });

    it('should accept decimal amounts for bids', async () => {
      const bidWithDecimal: BidData = {
        ...mockBidData,
        amount: 1999.99,
      };

      mockedApiClient.post.mockResolvedValue({
        bid: {
          id: 'bid-789',
          job_id: 'job-123',
          contractor_id: 'contractor-456',
          amount: 1999.99,
          message: bidWithDecimal.message,
          status: 'pending',
          created_at: '2025-01-20T10:00:00Z',
        },
      });

      await BidService.createBid(bidWithDecimal);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        expect.objectContaining({
          bidAmount: 1999.99,
        })
      );
    });

    it('should handle very large bid amounts', async () => {
      const largeBid: BidData = {
        ...mockBidData,
        amount: 999999.99,
      };

      mockedApiClient.post.mockResolvedValue({
        bid: {
          id: 'bid-789',
          job_id: 'job-123',
          contractor_id: 'contractor-456',
          amount: 999999.99,
          message: largeBid.message,
          status: 'pending',
          created_at: '2025-01-20T10:00:00Z',
        },
      });

      await BidService.createBid(largeBid);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        expect.objectContaining({
          bidAmount: 999999.99,
        })
      );
    });
  });

  describe('getBidsByJob', () => {
    it('should get all bids for a job', async () => {
      mockedApiClient.get.mockResolvedValue({
        bids: [mockBid, { ...mockBid, id: 'bid-002', amount: 3000 }],
      });

      const result = await BidService.getBidsByJob('job-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids'
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockBid);
    });

    it('should filter bids by status when provided', async () => {
      mockedApiClient.get.mockResolvedValue({
        bids: [mockBid],
      });

      const result = await BidService.getBidsByJob('job-123', 'pending');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids?status=pending'
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no bids found', async () => {
      mockedApiClient.get.mockResolvedValue({ bids: null });

      const result = await BidService.getBidsByJob('job-999');

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('API connection failed'));

      await expect(BidService.getBidsByJob('job-123')).rejects.toThrow(
        'API connection failed'
      );
    });
  });

  describe('getBidsByContractor', () => {
    it('should get all bids for a contractor with job details', async () => {
      mockedApiClient.get.mockResolvedValue({
        bids: [mockBidWithJob],
      });

      const result = await BidService.getBidsByContractor('contractor-456');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/api/contractor/bids?contractorId=contractor-456'
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockBidWithJob);
    });

    it('should return empty array when contractor has no bids', async () => {
      mockedApiClient.get.mockResolvedValue({ bids: [] });

      const result = await BidService.getBidsByContractor('contractor-999');

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Query timeout'));

      await expect(
        BidService.getBidsByContractor('contractor-456')
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('acceptBid', () => {
    it('should accept a bid and update job status via API', async () => {
      // First the helper resolves the bid's job_id (single-row
      // direct-DB read; remaining read in BidService — see TODO).
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockResolvedValue({
        bid: { ...mockBid, status: 'accepted' },
      });

      const result = await BidService.acceptBid('bid-789', 'homeowner-123');

      expect(supabase.from).toHaveBeenCalledWith('bids');
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-789/accept'
      );
      expect(result.status).toBe('accepted');
    });

    it('should throw error when bid not found', async () => {
      mockBidJobIdLookup({ jobId: undefined });

      await expect(
        BidService.acceptBid('bid-999', 'homeowner-123')
      ).rejects.toThrow('Bid not found');
    });

    it('should handle helper lookup errors', async () => {
      mockBidJobIdLookup({ error: { message: 'lookup failed' } });

      await expect(
        BidService.acceptBid('bid-999', 'homeowner-123')
      ).rejects.toThrow('Bid not found');
    });
  });

  describe('rejectBid', () => {
    it('should reject a bid with a reason', async () => {
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockResolvedValue({
        bid: {
          ...mockBid,
          status: 'rejected',
          rejection_reason: 'Too expensive',
        },
      });

      const result = await BidService.rejectBid(
        'bid-789',
        'homeowner-123',
        'Too expensive'
      );

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-789/reject',
        { reason: 'Too expensive' }
      );
      expect(result.status).toBe('rejected');
      expect(result.rejection_reason).toBe('Too expensive');
    });

    it('should reject a bid without a reason', async () => {
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockResolvedValue({
        bid: { ...mockBid, status: 'rejected' },
      });

      const result = await BidService.rejectBid('bid-789', 'homeowner-123');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-789/reject',
        { reason: undefined }
      );
      expect(result.status).toBe('rejected');
    });

    it('should throw error when bid not found', async () => {
      mockBidJobIdLookup({ jobId: undefined });

      await expect(
        BidService.rejectBid('bid-789', 'homeowner-123')
      ).rejects.toThrow('Bid not found');
    });
  });

  describe('withdrawBid', () => {
    it('should withdraw a pending bid', async () => {
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockResolvedValue({});

      await BidService.withdrawBid('bid-789', 'contractor-456');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-789/withdraw'
      );
    });

    it('should throw error when bid not found', async () => {
      mockBidJobIdLookup({ jobId: undefined });

      await expect(
        BidService.withdrawBid('bid-789', 'contractor-456')
      ).rejects.toThrow('Bid not found');
    });

    it('should handle API deletion errors', async () => {
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockRejectedValue(new Error('Withdrawal failed'));

      await expect(
        BidService.withdrawBid('bid-789', 'contractor-456')
      ).rejects.toThrow('Withdrawal failed');
    });
  });

  describe('updateBid', () => {
    it('should update a pending bid with new amount', async () => {
      const updates = {
        amount: 3000,
        message: 'Updated proposal with better pricing',
      };
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.patch.mockResolvedValue({
        bid: { ...mockBid, ...updates },
      });

      const result = await BidService.updateBid(
        'bid-789',
        'contractor-456',
        updates
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-789',
        updates
      );
      expect(result.amount).toBe(3000);
      expect(result.message).toBe('Updated proposal with better pricing');
    });

    it('should throw error when bid not found', async () => {
      mockBidJobIdLookup({ jobId: undefined });

      await expect(
        BidService.updateBid('bid-789', 'contractor-456', { amount: 3000 })
      ).rejects.toThrow('Bid not found');
    });

    it('should handle partial updates', async () => {
      const updates = { estimated_duration: '3 weeks' };
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.patch.mockResolvedValue({
        bid: { ...mockBid, ...updates },
      });

      const result = await BidService.updateBid(
        'bid-789',
        'contractor-456',
        updates
      );

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/api/jobs/job-123/bids/bid-789',
        updates
      );
      expect(result.estimated_duration).toBe('3 weeks');
    });
  });

  // `getBidStatistics` was a TODO/unused method — removed in audit
  // step 5 (2026-04-29). The describe block previously here is gone
  // alongside the implementation.

  describe('Bid State Transitions', () => {
    it('should transition from pending to accepted', async () => {
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockResolvedValue({
        bid: { ...mockBid, status: 'accepted' },
      });

      const result = await BidService.acceptBid('bid-789', 'homeowner-123');

      expect(result.status).toBe('accepted');
    });

    it('should transition from pending to rejected', async () => {
      mockBidJobIdLookup({ jobId: 'job-123' });
      mockedApiClient.post.mockResolvedValue({
        bid: {
          ...mockBid,
          status: 'rejected',
          rejection_reason: 'Budget exceeded',
        },
      });

      const result = await BidService.rejectBid(
        'bid-789',
        'homeowner-123',
        'Budget exceeded'
      );

      expect(result.status).toBe('rejected');
      expect(result.rejection_reason).toBe('Budget exceeded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing contractor information gracefully', async () => {
      const bidWithoutContractor = {
        ...mockBid,
        contractor: undefined,
      };

      mockedApiClient.get.mockResolvedValue({
        bids: [bidWithoutContractor],
      });

      const result = await BidService.getBidsByJob('job-123');

      expect(result[0].contractor).toBeUndefined();
    });

    it('should handle null job information in contractor bids', async () => {
      const bidWithoutJob = {
        ...mockBid,
        job: null,
      };

      mockedApiClient.get.mockResolvedValue({
        bids: [bidWithoutJob],
      });

      const result = await BidService.getBidsByContractor('contractor-456');

      expect(result[0].job).toBeNull();
    });

    it('should return empty array for getBidsByJobs with empty array', async () => {
      const result = await BidService.getBidsByJobs([]);
      expect(result).toEqual([]);
      expect(mockedApiClient.get).not.toHaveBeenCalled();
    });

    it('should fetch bids for multiple jobs in parallel', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({
          bids: [
            { ...mockBid, job_id: 'job-1', created_at: '2025-01-20T10:00:00Z' },
          ],
        })
        .mockResolvedValueOnce({
          bids: [
            {
              ...mockBid,
              id: 'bid-2',
              job_id: 'job-2',
              created_at: '2025-01-21T10:00:00Z',
            },
          ],
        });

      const result = await BidService.getBidsByJobs(['job-1', 'job-2']);

      expect(mockedApiClient.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      // Should be sorted by created_at descending
      expect(result[0].id).toBe('bid-2');
    });
  });
});
