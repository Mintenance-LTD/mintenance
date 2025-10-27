/**
 * Tests for BidManagementService - Bid Management Operations
 */

import { BidManagementService } from '../BidManagementService';
import { supabase } from '../../config/supabase';
import { Bid } from '../../types';

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('BidManagementService', () => {
  const mockBidData = {
    id: 'bid-123',
    job_id: 'job-123',
    contractor_id: 'contractor-123',
    amount: 1500,
    description: 'I can complete this job in 2 weeks',
    status: 'pending',
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
    it('should submit a bid successfully', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBidData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const bidData = {
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'I can complete this job in 2 weeks',
      };

      const result = await BidManagementService.submitBid(bidData);

      expect(supabase.from).toHaveBeenCalledWith('bids');
      expect(mockFrom.insert).toHaveBeenCalledWith([
        {
          job_id: 'job-123',
          contractor_id: 'contractor-123',
          amount: 1500,
          description: 'I can complete this job in 2 weeks',
          status: 'pending',
          created_at: expect.any(String),
        },
      ]);
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

    it('should throw error when bid submission fails', async () => {
      const error = new Error('Database error');
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const bidData = {
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'Test bid',
      };

      await expect(BidManagementService.submitBid(bidData)).rejects.toThrow('Database error');
    });

    it('should set status to pending by default', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBidData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await BidManagementService.submitBid({
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'Test',
      });

      const insertCall = mockFrom.insert.mock.calls[0][0][0];
      expect(insertCall.status).toBe('pending');
    });

    it('should include timestamp in created_at', async () => {
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBidData, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await BidManagementService.submitBid({
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 1500,
        description: 'Test',
      });

      const insertCall = mockFrom.insert.mock.calls[0][0][0];
      expect(insertCall.created_at).toBeDefined();
      expect(typeof insertCall.created_at).toBe('string');
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
    it('should accept a bid and update job status', async () => {
      const mockBidFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job_id: 'job-123', contractor_id: 'contractor-123' },
          error: null,
        }),
      };

      const mockUpdateBidFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockUpdateJobFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockRejectBidsFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockBidFrom) // First call - get bid
        .mockReturnValueOnce(mockUpdateBidFrom) // Second call - update accepted bid
        .mockReturnValueOnce(mockUpdateJobFrom) // Third call - update job
        .mockReturnValueOnce(mockRejectBidsFrom); // Fourth call - reject other bids

      await BidManagementService.acceptBid('bid-123');

      // Verify bid fetch
      expect(mockBidFrom.select).toHaveBeenCalledWith('job_id, contractor_id');
      expect(mockBidFrom.eq).toHaveBeenCalledWith('id', 'bid-123');

      // Verify bid update
      expect(mockUpdateBidFrom.update).toHaveBeenCalledWith({ status: 'accepted' });
      expect(mockUpdateBidFrom.eq).toHaveBeenCalledWith('id', 'bid-123');

      // Verify job update
      expect(mockUpdateJobFrom.update).toHaveBeenCalledWith({
        status: 'assigned',
        contractor_id: 'contractor-123',
        updated_at: expect.any(String),
      });
      expect(mockUpdateJobFrom.eq).toHaveBeenCalledWith('id', 'job-123');

      // Verify other bids rejected
      expect(mockRejectBidsFrom.update).toHaveBeenCalledWith({ status: 'rejected' });
      expect(mockRejectBidsFrom.eq).toHaveBeenCalledWith('job_id', 'job-123');
      expect(mockRejectBidsFrom.neq).toHaveBeenCalledWith('id', 'bid-123');
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

    it('should throw error when bid update fails', async () => {
      const mockBidFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job_id: 'job-123', contractor_id: 'contractor-123' },
          error: null,
        }),
      };

      const error = new Error('Update failed');
      const mockUpdateBidFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockBidFrom)
        .mockReturnValueOnce(mockUpdateBidFrom);

      await expect(BidManagementService.acceptBid('bid-123')).rejects.toThrow('Update failed');
    });

    it('should throw error when job update fails', async () => {
      const mockBidFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job_id: 'job-123', contractor_id: 'contractor-123' },
          error: null,
        }),
      };

      const mockUpdateBidFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const error = new Error('Job update failed');
      const mockUpdateJobFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockBidFrom)
        .mockReturnValueOnce(mockUpdateBidFrom)
        .mockReturnValueOnce(mockUpdateJobFrom);

      await expect(BidManagementService.acceptBid('bid-123')).rejects.toThrow('Job update failed');
    });

    it('should throw error when rejecting other bids fails', async () => {
      const mockBidFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { job_id: 'job-123', contractor_id: 'contractor-123' },
          error: null,
        }),
      };

      const mockUpdateBidFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockUpdateJobFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const error = new Error('Reject bids failed');
      const mockRejectBidsFrom = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({ error }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockBidFrom)
        .mockReturnValueOnce(mockUpdateBidFrom)
        .mockReturnValueOnce(mockUpdateJobFrom)
        .mockReturnValueOnce(mockRejectBidsFrom);

      await expect(BidManagementService.acceptBid('bid-123')).rejects.toThrow(
        'Reject bids failed'
      );
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
