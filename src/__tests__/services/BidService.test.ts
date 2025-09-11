import React from 'react';
import { BidService } from '../../services/BidService';
import { supabase } from '../../config/supabase';
import { Bid, BidData } from '../../types';

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const mockBidData: BidData = {
  job_id: 'job-1',
  contractor_id: 'contractor-1',
  amount: 140,
  message: 'I can complete this job today with 5+ years experience',
  estimated_duration: 'Same day',
  availability: '2024-01-15',
};

const mockBid: Bid = {
  id: 'bid-1',
  ...mockBidData,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  contractor: {
    id: 'contractor-1',
    first_name: 'Jane',
    last_name: 'Contractor',
    email: 'jane@example.com',
    rating: 4.8,
    reviews_count: 25,
    profile_picture: 'avatar.jpg',
  },
};

describe('BidService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockBid, error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    } as any);
  });

  describe('createBid', () => {
    it('creates a new bid successfully', async () => {
      const result = await BidService.createBid(mockBidData);

      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
      expect(result).toEqual(mockBid);
    });

    it('handles bid creation errors', async () => {
      const error = { message: 'Job not found' };
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      } as any);

      await expect(BidService.createBid(mockBidData)).rejects.toThrow(
        'Job not found'
      );
    });

    it('validates bid amount', async () => {
      const invalidBidData = { ...mockBidData, amount: 0 };

      await expect(BidService.createBid(invalidBidData)).rejects.toThrow(
        'Bid amount must be greater than 0'
      );
    });

    it('validates bid message', async () => {
      const invalidBidData = { ...mockBidData, message: '' };

      await expect(BidService.createBid(invalidBidData)).rejects.toThrow(
        'Bid message is required'
      );
    });

    it('prevents duplicate bids from same contractor', async () => {
      const error = { message: 'You have already placed a bid on this job' };
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      } as any);

      await expect(BidService.createBid(mockBidData)).rejects.toThrow(
        'You have already placed a bid on this job'
      );
    });

    it('validates availability date format', async () => {
      const invalidBidData = { ...mockBidData, availability: 'tomorrow' };

      await expect(BidService.createBid(invalidBidData)).rejects.toThrow(
        'Invalid availability date format'
      );
    });

    it('prevents bidding on own jobs', async () => {
      // Mock checking if contractor is also homeowner of the job
      const contractorOwnedJob = {
        ...mockBidData,
        contractor_id: 'homeowner-1',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { homeowner_id: 'homeowner-1' },
          error: null,
        }),
      } as any);

      await expect(BidService.createBid(contractorOwnedJob)).rejects.toThrow(
        'Cannot bid on your own job'
      );
    });
  });

  describe('getBidsByJob', () => {
    it('fetches bids for a job successfully', async () => {
      const mockBids = [mockBid, { ...mockBid, id: 'bid-2' }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBids, error: null }),
      } as any);

      const result = await BidService.getBidsByJob('job-1');

      expect(result).toEqual(mockBids);
      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
    });

    it('includes contractor profile information', async () => {
      const result = await BidService.getBidsByJob('job-1');

      expect(mockSupabase.from().select).toHaveBeenCalledWith(`
        *,
        contractor:contractor_id (
          id,
          first_name,
          last_name,
          email,
          rating,
          reviews_count,
          profile_picture
        )
      `);
    });

    it('orders bids by creation time', async () => {
      await BidService.getBidsByJob('job-1');

      expect(mockSupabase.from().select().eq().order).toHaveBeenCalledWith(
        'created_at',
        { ascending: false }
      );
    });

    it('filters by bid status', async () => {
      await BidService.getBidsByJob('job-1', 'accepted');

      const mockQuery = mockSupabase.from().select().eq();
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'accepted');
    });
  });

  describe('getBidsByContractor', () => {
    it('fetches contractor bids successfully', async () => {
      const mockBids = [mockBid];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBids, error: null }),
      } as any);

      const result = await BidService.getBidsByContractor('contractor-1');

      expect(result).toEqual(mockBids);
    });

    it('includes job information in contractor bids', async () => {
      await BidService.getBidsByContractor('contractor-1');

      expect(mockSupabase.from().select).toHaveBeenCalledWith(`
        *,
        job:job_id (
          id,
          title,
          description,
          budget,
          category,
          status,
          location,
          created_at
        )
      `);
    });
  });

  describe('acceptBid', () => {
    it('accepts a bid successfully', async () => {
      const acceptedBid = { ...mockBid, status: 'accepted' };
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: acceptedBid, error: null }),
      } as any);

      const result = await BidService.acceptBid('bid-1', 'homeowner-1');

      expect(result.status).toBe('accepted');
    });

    it('rejects other bids when one is accepted', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBid, error: null }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
        } as any);

      await BidService.acceptBid('bid-1', 'homeowner-1');

      // Should update other bids to rejected
      expect(mockSupabase.from).toHaveBeenNthCallWith(2, 'bids');
    });

    it('updates job status to assigned', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBid, error: null }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        } as any);

      await BidService.acceptBid('bid-1', 'homeowner-1');

      // Should update job status
      expect(mockSupabase.from).toHaveBeenNthCallWith(3, 'jobs');
    });

    it('validates homeowner authorization', async () => {
      // Mock job with different homeowner
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job: { homeowner_id: 'other-homeowner' } },
          error: null,
        }),
      } as any);

      await expect(
        BidService.acceptBid('bid-1', 'homeowner-1')
      ).rejects.toThrow('Not authorized to accept this bid');
    });

    it('prevents accepting already accepted bids', async () => {
      const acceptedBid = { ...mockBid, status: 'accepted' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: acceptedBid, error: null }),
      } as any);

      await expect(
        BidService.acceptBid('bid-1', 'homeowner-1')
      ).rejects.toThrow('Bid has already been accepted');
    });
  });

  describe('rejectBid', () => {
    it('rejects a bid successfully', async () => {
      const rejectedBid = { ...mockBid, status: 'rejected' };
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: rejectedBid, error: null }),
      } as any);

      const result = await BidService.rejectBid('bid-1', 'homeowner-1');

      expect(result.status).toBe('rejected');
    });

    it('allows providing rejection reason', async () => {
      const rejectedBid = {
        ...mockBid,
        status: 'rejected',
        rejection_reason: 'Budget too high',
      };
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: rejectedBid, error: null }),
      } as any);

      const result = await BidService.rejectBid(
        'bid-1',
        'homeowner-1',
        'Budget too high'
      );

      expect(result.rejection_reason).toBe('Budget too high');
    });
  });

  describe('withdrawBid', () => {
    it('allows contractor to withdraw their bid', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await BidService.withdrawBid('bid-1', 'contractor-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
    });

    it('validates contractor authorization for withdrawal', async () => {
      // Mock bid from different contractor
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { contractor_id: 'other-contractor' },
          error: null,
        }),
      } as any);

      await expect(
        BidService.withdrawBid('bid-1', 'contractor-1')
      ).rejects.toThrow('Not authorized to withdraw this bid');
    });

    it('prevents withdrawal of accepted bids', async () => {
      const acceptedBid = { ...mockBid, status: 'accepted' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: acceptedBid, error: null }),
      } as any);

      await expect(
        BidService.withdrawBid('bid-1', 'contractor-1')
      ).rejects.toThrow('Cannot withdraw an accepted bid');
    });
  });

  describe('updateBid', () => {
    it('updates bid amount and message', async () => {
      const updates = {
        amount: 160,
        message: 'Updated pricing based on materials',
      };
      const updatedBid = { ...mockBid, ...updates };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedBid, error: null }),
      } as any);

      const result = await BidService.updateBid(
        'bid-1',
        'contractor-1',
        updates
      );

      expect(result.amount).toBe(160);
      expect(result.message).toBe('Updated pricing based on materials');
    });

    it('validates contractor authorization for updates', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { contractor_id: 'other-contractor', status: 'pending' },
          error: null,
        }),
      } as any);

      await expect(
        BidService.updateBid('bid-1', 'contractor-1', { amount: 160 })
      ).rejects.toThrow('Not authorized to update this bid');
    });

    it('prevents updates to non-pending bids', async () => {
      const acceptedBid = { ...mockBid, status: 'accepted' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: acceptedBid, error: null }),
      } as any);

      await expect(
        BidService.updateBid('bid-1', 'contractor-1', { amount: 160 })
      ).rejects.toThrow('Cannot update a bid that is not pending');
    });
  });

  describe('getBidStatistics', () => {
    it('returns bid statistics for a job', async () => {
      const mockStats = {
        total_bids: 5,
        average_bid: 155,
        lowest_bid: 120,
        highest_bid: 180,
        pending_bids: 3,
        accepted_bids: 1,
        rejected_bids: 1,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await BidService.getBidStatistics('job-1');

      expect(result).toEqual(mockStats);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'get-bid-statistics',
        {
          body: { jobId: 'job-1' },
        }
      );
    });

    it('handles statistics calculation errors', async () => {
      const error = { message: 'Job not found' };
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error,
      });

      await expect(BidService.getBidStatistics('job-1')).rejects.toThrow(
        'Job not found'
      );
    });
  });
});
