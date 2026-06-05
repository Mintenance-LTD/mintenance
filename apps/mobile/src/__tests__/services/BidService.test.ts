/**
 * BidService unit tests.
 *
 * 2026-06-04 rewrite: the prior suite tested a long-removed
 * direct-Supabase implementation (supabase.from('bids')..., a
 * getBidStatistics edge-function call, bidId-only mutation signatures
 * that returned the updated row). The service was consolidated to route
 * every call through `mobileApiClient` (mobile→web API) and to delegate
 * the rich-payload submit to `BidManagementService.submitBid`. These
 * tests assert the CURRENT contract:
 *   - createBid validates locally then calls BidManagementService.submitBid
 *   - reads (getBidsByJob / getBidsByContractor / getMyBidForJob) GET the
 *     web routes and unwrap { bids }
 *   - mutations (accept/reject/unreject/withdraw/update) POST/PATCH the
 *     nested /api/jobs/:jobId/bids/:bidId routes and require jobId
 */

import { BidService } from '../../services/BidService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { BidManagementService } from '../../services/BidManagementService';

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

// Mock the API client (all bid traffic flows through it).
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the rich-payload submit delegate so createBid/submitBid don't
// reach the real network helper.
jest.mock('../../services/BidManagementService', () => ({
  BidManagementService: {
    submitBid: jest.fn(),
  },
}));

const mockApi = mobileApiClient as jest.Mocked<typeof mobileApiClient>;
const mockSubmitBid = BidManagementService.submitBid as jest.Mock;

const mockBidData = {
  job_id: 'job-1',
  contractor_id: 'contractor-1',
  amount: 140,
  message: 'I can complete this job today with 5+ years experience',
  estimated_duration_days: 1,
  availability: '2024-01-15',
};

describe('BidService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBid', () => {
    it('creates a new bid via BidManagementService.submitBid', async () => {
      mockSubmitBid.mockResolvedValue({
        id: 'bid-1',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const result = await BidService.createBid(mockBidData);

      expect(mockSubmitBid).toHaveBeenCalledWith({
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 140,
        description: mockBidData.message,
      });
      expect(result.id).toBe('bid-1');
      expect(result.status).toBe('pending');
      expect(result.created_at).toBe('2024-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2024-01-01T00:00:00.000Z');
    });

    it('propagates submit errors (e.g. job not found / duplicate bid)', async () => {
      mockSubmitBid.mockRejectedValue(new Error('Job not found'));

      await expect(BidService.createBid(mockBidData)).rejects.toThrow(
        'Job not found'
      );
    });

    it('validates bid amount must be greater than 0', async () => {
      await expect(
        BidService.createBid({ ...mockBidData, amount: 0 })
      ).rejects.toThrow('Bid amount must be greater than 0');
      expect(mockSubmitBid).not.toHaveBeenCalled();
    });

    it('validates bid message is required', async () => {
      await expect(
        BidService.createBid({ ...mockBidData, message: '' })
      ).rejects.toThrow('Bid message is required');
      expect(mockSubmitBid).not.toHaveBeenCalled();
    });
  });

  describe('submitBid', () => {
    it('delegates the rich payload to BidManagementService.submitBid', async () => {
      const richPayload = {
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 200,
        description: 'Full quote',
        estimatedDurationDays: 2,
      };
      const apiBid = { id: 'bid-9', status: 'pending', createdAt: 'now' };
      mockSubmitBid.mockResolvedValue(apiBid);

      const result = await BidService.submitBid(richPayload);

      expect(mockSubmitBid).toHaveBeenCalledWith(richPayload);
      expect(result).toBe(apiBid);
    });
  });

  describe('getBidsByJob', () => {
    it('fetches bids for a job and unwraps { bids }', async () => {
      const bids = [{ id: 'bid-1' }, { id: 'bid-2' }];
      mockApi.get.mockResolvedValue({ bids });

      const result = await BidService.getBidsByJob('job-1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/jobs/job-1/bids');
      expect(result).toEqual(bids);
    });

    it('appends the status filter to the URL', async () => {
      mockApi.get.mockResolvedValue({ bids: [] });

      await BidService.getBidsByJob('job-1', 'accepted');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/jobs/job-1/bids?status=accepted'
      );
    });

    it('returns [] when the response has no bids array', async () => {
      mockApi.get.mockResolvedValue({ bids: null });

      const result = await BidService.getBidsByJob('job-1');

      expect(result).toEqual([]);
    });
  });

  describe('getBidsByJobs', () => {
    it('returns [] for an empty job id list without calling the API', async () => {
      const result = await BidService.getBidsByJobs([]);

      expect(result).toEqual([]);
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('fans out across jobs and sorts by created_at desc', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          bids: [{ id: 'a', created_at: '2024-01-01T00:00:00.000Z' }],
        })
        .mockResolvedValueOnce({
          bids: [{ id: 'b', created_at: '2024-02-01T00:00:00.000Z' }],
        });

      const result = await BidService.getBidsByJobs(['job-1', 'job-2']);

      expect(result.map((b) => b.id)).toEqual(['b', 'a']);
    });

    it('tolerates a per-job failure and still returns the rest', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          bids: [{ id: 'a', created_at: '2024-01-01T00:00:00.000Z' }],
        })
        .mockRejectedValueOnce(new Error('boom'));

      const result = await BidService.getBidsByJobs(['job-1', 'job-2']);

      expect(result.map((b) => b.id)).toEqual(['a']);
    });
  });

  describe('getBidsByContractor', () => {
    it('fetches the contractor bids from /api/contractor/bids', async () => {
      const bids = [{ id: 'bid-1' }];
      mockApi.get.mockResolvedValue({ bids });

      const result = await BidService.getBidsByContractor('contractor-1');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/contractor/bids?contractorId=contractor-1'
      );
      expect(result).toEqual(bids);
    });
  });

  describe('getMyBidForJob', () => {
    it('returns null when jobId is empty', async () => {
      const result = await BidService.getMyBidForJob('');

      expect(result).toBeNull();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('returns the first bid for the job', async () => {
      mockApi.get.mockResolvedValue({
        bids: [{ id: 'bid-1' }, { id: 'bid-2' }],
      });

      const result = await BidService.getMyBidForJob('job-1');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/contractor/bids?jobId=job-1'
      );
      expect(result).toEqual({ id: 'bid-1' });
    });

    it('returns null when the contractor has no bid on the job', async () => {
      mockApi.get.mockResolvedValue({ bids: [] });

      const result = await BidService.getMyBidForJob('job-1');

      expect(result).toBeNull();
    });
  });

  describe('acceptBid', () => {
    it('POSTs the nested accept route and returns the wire shape', async () => {
      const response = { success: true, message: 'Bid accepted' };
      mockApi.post.mockResolvedValue(response);

      const result = await BidService.acceptBid('bid-1', 'job-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/bids/bid-1/accept'
      );
      expect(result).toEqual(response);
    });

    it('throws when jobId is missing', async () => {
      await expect(BidService.acceptBid('bid-1', '')).rejects.toThrow(
        'jobId is required to accept a bid'
      );
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('rejectBid', () => {
    it('POSTs the reject route with the reason body', async () => {
      const response = { success: true, message: 'Bid rejected' };
      mockApi.post.mockResolvedValue(response);

      const result = await BidService.rejectBid(
        'bid-1',
        'job-1',
        'Budget too high'
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/bids/bid-1/reject',
        { reason: 'Budget too high' }
      );
      expect(result).toEqual(response);
    });

    it('throws when jobId is missing', async () => {
      await expect(BidService.rejectBid('bid-1', '')).rejects.toThrow(
        'jobId is required to reject a bid'
      );
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('unrejectBid', () => {
    it('POSTs the unreject route', async () => {
      mockApi.post.mockResolvedValue(undefined);

      await BidService.unrejectBid('bid-1', 'job-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/bids/bid-1/unreject'
      );
    });

    it('throws when jobId is missing', async () => {
      await expect(BidService.unrejectBid('bid-1', '')).rejects.toThrow(
        'jobId is required to unreject a bid'
      );
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('withdrawBid', () => {
    it('POSTs the withdraw route', async () => {
      mockApi.post.mockResolvedValue(undefined);

      await BidService.withdrawBid('bid-1', 'job-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/bids/bid-1/withdraw'
      );
    });

    it('throws when jobId is missing', async () => {
      await expect(BidService.withdrawBid('bid-1', '')).rejects.toThrow(
        'jobId is required to withdraw a bid'
      );
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('updateBid', () => {
    it('PATCHes the bid route with the updates and returns response.bid', async () => {
      const updates = { amount: 160, message: 'Updated pricing' };
      const updatedBid = {
        id: 'bid-1',
        amount: 160,
        message: 'Updated pricing',
      };
      mockApi.patch.mockResolvedValue({ bid: updatedBid });

      const result = await BidService.updateBid('bid-1', 'job-1', updates);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/jobs/job-1/bids/bid-1',
        updates
      );
      expect(result).toEqual(updatedBid);
    });

    it('throws when jobId is missing', async () => {
      await expect(
        BidService.updateBid('bid-1', '', { amount: 160 })
      ).rejects.toThrow('jobId is required to update a bid');
      expect(mockApi.patch).not.toHaveBeenCalled();
    });
  });
});
