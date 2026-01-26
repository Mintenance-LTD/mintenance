import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobDetailsService } from '../JobDetailsService';
import { JobRepository } from '../JobRepository';
import { JobDetailsValidator } from '../JobDetailsValidator';

// Mock imported dependencies
vi.mock('../JobRepository');
vi.mock('../JobDetailsValidator');

describe('JobDetailsService', () => {
  let service: JobDetailsService;
  let mockRepo: any;
  let mockValidator: any;

  const mockUser = { id: 'user-123', email: 'test@example.com', role: 'homeowner' };
  const mockJob = { id: 'job-123', homeowner_id: 'user-123', status: 'posted', title: 'Test Job' };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new JobDetailsService({ supabase: {} as any });

    // Get mock instances
    mockRepo = vi.mocked(JobRepository).mock.results[0].value;
    mockValidator = vi.mocked(JobDetailsValidator).mock.results[0].value;

    // Inject mocks manually if needed (already done in constructor but for clarity)
    (service as any).repository = mockRepo;
    (service as any).validator = mockValidator;
  });

  describe('getJobWithDetails', () => {
    it('should return full job details for owner', async () => {
      mockRepo.getJob.mockResolvedValue(mockJob);
      mockRepo.getUser.mockResolvedValue({ id: 'user-123', first_name: 'Test', last_name: 'User' });
      mockRepo.getBidsForJob.mockResolvedValue([{ id: 'bid-1' }]);
      mockRepo.getAttachmentsForJob.mockResolvedValue([]);
      mockRepo.getViewCount.mockResolvedValue(10);
      mockRepo.isPhoneVerified.mockResolvedValue(true);
      mockRepo.hasActiveSubscription.mockResolvedValue(false);
      mockRepo.getJobPostingHistory.mockResolvedValue({ completedJobs: 1 });

      const result = await service.getJobWithDetails('job-123', mockUser);

      expect(result.id).toBe('job-123');
      expect(result.viewCount).toBe(10);
      expect(result.bids).toHaveLength(1); // Owner sees full bids
      expect(mockRepo.getJob).toHaveBeenCalledWith('job-123');
    });

    it('should throw error if job not found', async () => {
      mockRepo.getJob.mockResolvedValue(null);

      await expect(service.getJobWithDetails('job-123', mockUser))
        .rejects.toThrow('Job not found');
    });

    it('should throw error if unauthorized', async () => {
      mockRepo.getJob.mockResolvedValue({ ...mockJob, homeowner_id: 'other-user', status: 'draft' });
      const contractorUser = { id: 'c-123', role: 'contractor' };

      await expect(service.getJobWithDetails('job-123', contractorUser as any))
        .rejects.toThrow('Unauthorized to view this job');
    });

    it('should hide bids for contractors (only count)', async () => {
      mockRepo.getJob.mockResolvedValue(mockJob);
      mockRepo.getUser.mockResolvedValue({ id: 'user-1' });
      mockRepo.getBidsForJob.mockResolvedValue([{ id: 'bid-1' }, { id: 'bid-2' }]);
      mockRepo.hasUserBidOnJob.mockResolvedValue(false);

      const contractorUser = { id: 'c-123', role: 'contractor' };
      const result = await service.getJobWithDetails('job-123', contractorUser as any);

      expect(result.bids).toEqual({ count: 2 });
    });
  });

  describe('updateJobFull', () => {
    it('should successfully update job', async () => {
      mockRepo.getJob.mockResolvedValue(mockJob);
      mockValidator.validateFullUpdate.mockReturnValue({ title: 'New Title' });
      mockRepo.updateJob.mockResolvedValue({ ...mockJob, title: 'New Title' });

      // Mock the subsequent getJobWithDetails call internal logic
      mockRepo.getUser.mockResolvedValue({});
      mockRepo.getBidsForJob.mockResolvedValue([]);
      mockRepo.getAttachmentsForJob.mockResolvedValue([]);

      const result = await service.updateJobFull('job-123', { title: 'New Title' }, mockUser);

      expect(mockRepo.updateJob).toHaveBeenCalled();
      expect(mockValidator.validateFullUpdate).toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    it('should perform soft delete', async () => {
      mockRepo.getJob.mockResolvedValue({ ...mockJob, status: 'posted' });
      mockRepo.getBidsForJob.mockResolvedValue([]);

      await service.deleteJob('job-123', mockUser);

      expect(mockRepo.softDeleteJob).toHaveBeenCalledWith('job-123');
      expect(mockRepo.cancelAllBids).toHaveBeenCalledWith('job-123');
    });

    it('should throw if job is in progress', async () => {
      mockRepo.getJob.mockResolvedValue({ ...mockJob, status: 'in_progress' });

      await expect(service.deleteJob('job-123', mockUser))
        .rejects.toThrow('Cannot delete job that is in progress or completed');
    });
  });
});
