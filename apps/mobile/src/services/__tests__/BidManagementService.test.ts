/**
 * Tests for BidManagementService — INTERNAL ONLY
 *
 * Only `submitBid` is exercised here; the read methods (getBidsByJob,
 * getBidsByContractor) and the client-side acceptBid that previously
 * lived on this service have been removed. BidService is the single
 * public bid surface and has its own test suite.
 */

import { BidManagementService } from '../BidManagementService';
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

      await expect(BidManagementService.submitBid(bidData)).rejects.toThrow(
        'Network error'
      );
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
});
