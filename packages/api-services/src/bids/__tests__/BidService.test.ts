import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BidService } from '../BidService';
import { BidRepository } from '../BidRepository';
import { BidValidator } from '../BidValidator';

// Mock dependencies
vi.mock('../BidRepository');
vi.mock('../BidValidator');

describe('BidService', () => {
  let service: BidService;
  let mockRepo: any;
  let mockValidator: any;

  const mockContractor = { id: 'contractor-123', email: 'c@test.com', role: 'contractor' };
  const mockHomeowner = { id: 'homeowner-456', email: 'h@test.com', role: 'homeowner' };
  const mockJob = {
    id: 'job-123',
    homeowner_id: 'homeowner-456',
    status: 'posted',
    required_licenses: [],
    latitude: 51.5,
    longitude: -0.1
  };
  const mockBidData = {
    jobId: 'job-123',
    bidAmount: 1000,
    proposalText: 'Professional work guaranteed.',
    estimatedDuration: 3,
    estimatedDurationUnit: 'days'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new BidService({ supabase: {} as any });

    // Get mock instances (vi.mocked is helpful here)
    mockRepo = vi.mocked(BidRepository).mock.results[0].value;
    mockValidator = vi.mocked(BidValidator).mock.results[0].value;

    // Inject mocks
    (service as any).repository = mockRepo;
    (service as any).validator = mockValidator;
  });

  describe('submitBid', () => {
    it('should successfully submit a bid', async () => {
      mockValidator.validateSubmitBid.mockReturnValue(mockBidData);
      mockRepo.getJob.mockResolvedValue(mockJob);
      mockRepo.getContractorBidForJob.mockResolvedValue(null);
      mockRepo.getContractor.mockResolvedValue({ is_verified: true });
      mockRepo.checkContractorServiceArea.mockResolvedValue(true);
      mockRepo.createBid.mockResolvedValue({ id: 'bid-123', ...mockBidData, status: 'pending' });

      const result = await service.submitBid(mockBidData as any, mockContractor);

      expect(result.id).toBe('bid-123');
      expect(mockRepo.createBid).toHaveBeenCalled();
      expect(mockRepo.incrementJobBidCount).toHaveBeenCalledWith('job-123');
    });

    it('should throw error if job is not found', async () => {
      mockValidator.validateSubmitBid.mockReturnValue(mockBidData);
      mockRepo.getJob.mockResolvedValue(null);

      await expect(service.submitBid(mockBidData as any, mockContractor))
        .rejects.toThrow('Job not found');
    });

    it('should throw error if job is not accepting bids', async () => {
      mockValidator.validateSubmitBid.mockReturnValue(mockBidData);
      mockRepo.getJob.mockResolvedValue({ ...mockJob, status: 'in_progress' });

      await expect(service.submitBid(mockBidData as any, mockContractor))
        .rejects.toThrow('Job is not accepting bids');
    });

    it('should throw error if contractor already bid', async () => {
      mockValidator.validateSubmitBid.mockReturnValue(mockBidData);
      mockRepo.getJob.mockResolvedValue(mockJob);
      mockRepo.getContractorBidForJob.mockResolvedValue({ id: 'existing-bid' });

      await expect(service.submitBid(mockBidData as any, mockContractor))
        .rejects.toThrow('You have already submitted a bid for this job');
    });

    it('should throw error if contractor is not verified', async () => {
      mockValidator.validateSubmitBid.mockReturnValue(mockBidData);
      mockRepo.getJob.mockResolvedValue(mockJob);
      mockRepo.getContractorBidForJob.mockResolvedValue(null);
      mockRepo.getContractor.mockResolvedValue({ is_verified: false });

      await expect(service.submitBid(mockBidData as any, mockContractor))
        .rejects.toThrow('Only verified contractors can submit bids');
    });
  });

  describe('acceptBid', () => {
    it('should successfully accept a bid', async () => {
      const mockBidWithJob = {
        id: 'bid-123',
        job_id: 'job-123',
        contractor_id: 'contractor-123',
        status: 'pending',
        job: mockJob
      };
      mockRepo.getBidWithJob.mockResolvedValue(mockBidWithJob);
      mockRepo.updateBidStatus.mockResolvedValue({ ...mockBidWithJob, status: 'accepted' });
      mockRepo.getContractByBidId.mockResolvedValue({ id: 'contract-123' });

      const result = await service.acceptBid('bid-123', mockHomeowner);

      expect(result.bid.status).toBe('accepted');
      expect(mockRepo.updateJobStatus).toHaveBeenCalledWith('job-123', 'in_progress', 'contractor-123');
      expect(mockRepo.rejectOtherBids).toHaveBeenCalledWith('job-123', 'bid-123');
    });

    it('should throw if user is not the homeowner', async () => {
      mockRepo.getBidWithJob.mockResolvedValue({ id: 'bid-1', job: mockJob, status: 'pending' });
      const otherUser = { id: 'other-user', role: 'homeowner' };

      await expect(service.acceptBid('bid-1', otherUser as any))
        .rejects.toThrow('Unauthorized to accept this bid');
    });
  });

  describe('withdrawBid', () => {
    it('should successfully withdraw a bid', async () => {
      mockRepo.getBidById.mockResolvedValue({
        id: 'bid-1',
        contractor_id: 'contractor-123',
        status: 'pending',
        job_id: 'job-123'
      });

      await service.withdrawBid('bid-1', mockContractor);

      expect(mockRepo.updateBidStatus).toHaveBeenCalledWith('bid-1', 'withdrawn');
      expect(mockRepo.decrementJobBidCount).toHaveBeenCalledWith('job-123');
    });
  });
});
