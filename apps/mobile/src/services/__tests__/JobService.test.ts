/**
 * Tests for JobService - Main Job Service Facade
 */

import { JobService } from '../JobService';
import { JobCRUDService } from '../JobCRUDService';
import { BidManagementService } from '../BidManagementService';
import { JobSearchService } from '../JobSearchService';
import { Job, Bid } from '../../types';

// Mock the delegated services
jest.mock('../JobCRUDService');
jest.mock('../BidManagementService');
jest.mock('../JobSearchService');

describe('JobService', () => {
  const mockJob: Job = {
    id: 'job-123',
    title: 'Test Job',
    description: 'Test description',
    location: 'Test Location',
    budget: 1000,
    status: 'open',
    homeowner_id: 'homeowner-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockBid: Bid = {
    id: 'bid-123',
    job_id: 'job-123',
    contractor_id: 'contractor-123',
    amount: 900,
    description: 'Test bid',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job CRUD Operations (delegated to JobCRUDService)', () => {
    describe('createJob', () => {
      it('should delegate to JobCRUDService.createJob', async () => {
        (JobCRUDService.createJob as jest.Mock).mockResolvedValue(mockJob);

        const jobData = {
          title: 'New Job',
          description: 'Job description',
          location: 'New York',
          budget: 1500,
          homeownerId: 'homeowner-456',
        };

        const result = await JobService.createJob(jobData);

        expect(JobCRUDService.createJob).toHaveBeenCalledWith(jobData);
        expect(result).toEqual(mockJob);
      });

      it('should handle homeowner_id field variant', async () => {
        (JobCRUDService.createJob as jest.Mock).mockResolvedValue(mockJob);

        const jobData = {
          title: 'New Job',
          description: 'Job description',
          location: 'New York',
          budget: 1500,
          homeowner_id: 'homeowner-456',
        };

        await JobService.createJob(jobData);

        expect(JobCRUDService.createJob).toHaveBeenCalledWith(jobData);
      });

      it('should handle optional fields', async () => {
        (JobCRUDService.createJob as jest.Mock).mockResolvedValue(mockJob);

        const jobData = {
          title: 'New Job',
          description: 'Job description',
          location: 'New York',
          budget: 1500,
          category: 'plumbing',
          subcategory: 'leak-repair',
          priority: 'high' as const,
          photos: ['photo1.jpg', 'photo2.jpg'],
        };

        await JobService.createJob(jobData);

        expect(JobCRUDService.createJob).toHaveBeenCalledWith(jobData);
      });
    });

    describe('getJobById', () => {
      it('should delegate to JobCRUDService.getJobById', async () => {
        (JobCRUDService.getJobById as jest.Mock).mockResolvedValue(mockJob);

        const result = await JobService.getJobById('job-123');

        expect(JobCRUDService.getJobById).toHaveBeenCalledWith('job-123');
        expect(result).toEqual(mockJob);
      });

      it('should return null when job not found', async () => {
        (JobCRUDService.getJobById as jest.Mock).mockResolvedValue(null);

        const result = await JobService.getJobById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('updateJob', () => {
      it('should delegate to JobCRUDService.updateJob', async () => {
        const updates = {
          title: 'Updated Title',
          budget: 2000,
        };

        (JobCRUDService.updateJob as jest.Mock).mockResolvedValue({
          ...mockJob,
          ...updates,
        });

        const result = await JobService.updateJob('job-123', updates);

        expect(JobCRUDService.updateJob).toHaveBeenCalledWith('job-123', updates);
        expect(result.title).toBe('Updated Title');
        expect(result.budget).toBe(2000);
      });

      it('should handle partial updates', async () => {
        const updates = { status: 'in_progress' as const };

        (JobCRUDService.updateJob as jest.Mock).mockResolvedValue({
          ...mockJob,
          ...updates,
        });

        await JobService.updateJob('job-123', updates);

        expect(JobCRUDService.updateJob).toHaveBeenCalledWith('job-123', updates);
      });
    });

    describe('deleteJob', () => {
      it('should delegate to JobCRUDService.deleteJob', async () => {
        (JobCRUDService.deleteJob as jest.Mock).mockResolvedValue(undefined);

        await JobService.deleteJob('job-123');

        expect(JobCRUDService.deleteJob).toHaveBeenCalledWith('job-123');
      });
    });

    describe('updateJobStatus', () => {
      it('should delegate to JobCRUDService.updateJobStatus', async () => {
        (JobCRUDService.updateJobStatus as jest.Mock).mockResolvedValue({
          ...mockJob,
          status: 'in_progress',
        });

        const result = await JobService.updateJobStatus('job-123', 'in_progress', 'contractor-123');

        expect(JobCRUDService.updateJobStatus).toHaveBeenCalledWith('job-123', 'in_progress', 'contractor-123');
        expect(result.status).toBe('in_progress');
      });

      it('should work without contractorId', async () => {
        (JobCRUDService.updateJobStatus as jest.Mock).mockResolvedValue({
          ...mockJob,
          status: 'cancelled',
        });

        await JobService.updateJobStatus('job-123', 'cancelled');

        expect(JobCRUDService.updateJobStatus).toHaveBeenCalledWith('job-123', 'cancelled', undefined);
      });
    });

    describe('startJob', () => {
      it('should delegate to JobCRUDService.startJob', async () => {
        (JobCRUDService.startJob as jest.Mock).mockResolvedValue(undefined);

        await JobService.startJob('job-123');

        expect(JobCRUDService.startJob).toHaveBeenCalledWith('job-123');
      });
    });

    describe('completeJob', () => {
      it('should delegate to JobCRUDService.completeJob', async () => {
        (JobCRUDService.completeJob as jest.Mock).mockResolvedValue(undefined);

        await JobService.completeJob('job-123');

        expect(JobCRUDService.completeJob).toHaveBeenCalledWith('job-123');
      });
    });
  });

  describe('Job Search Operations (delegated to JobSearchService)', () => {
    describe('getJobsByHomeowner', () => {
      it('should delegate to JobSearchService.getJobsByHomeowner', async () => {
        (JobSearchService.getJobsByHomeowner as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getJobsByHomeowner('homeowner-123');

        expect(JobSearchService.getJobsByHomeowner).toHaveBeenCalledWith('homeowner-123');
        expect(result).toEqual([mockJob]);
      });

      it('should return empty array when no jobs found', async () => {
        (JobSearchService.getJobsByHomeowner as jest.Mock).mockResolvedValue([]);

        const result = await JobService.getJobsByHomeowner('homeowner-999');

        expect(result).toEqual([]);
      });
    });

    describe('getUserJobs', () => {
      it('should delegate to JobSearchService.getUserJobs', async () => {
        (JobSearchService.getUserJobs as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getUserJobs('user-123');

        expect(JobSearchService.getUserJobs).toHaveBeenCalledWith('user-123');
        expect(result).toEqual([mockJob]);
      });
    });

    describe('getAvailableJobs', () => {
      it('should delegate to JobSearchService.getAvailableJobs', async () => {
        (JobSearchService.getAvailableJobs as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getAvailableJobs();

        expect(JobSearchService.getAvailableJobs).toHaveBeenCalled();
        expect(result).toEqual([mockJob]);
      });
    });

    describe('getJobsByStatus', () => {
      it('should delegate to JobSearchService.getJobsByStatus', async () => {
        (JobSearchService.getJobsByStatus as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getJobsByStatus('open', 'user-123');

        expect(JobSearchService.getJobsByStatus).toHaveBeenCalledWith('open', 'user-123');
        expect(result).toEqual([mockJob]);
      });

      it('should work without userId', async () => {
        (JobSearchService.getJobsByStatus as jest.Mock).mockResolvedValue([mockJob]);

        await JobService.getJobsByStatus('open');

        expect(JobSearchService.getJobsByStatus).toHaveBeenCalledWith('open', undefined);
      });
    });

    describe('getJobs', () => {
      it('should delegate to JobSearchService.getJobs with no args', async () => {
        (JobSearchService.getJobs as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getJobs();

        expect(JobSearchService.getJobs).toHaveBeenCalledWith(undefined, undefined);
        expect(result).toEqual([mockJob]);
      });

      it('should delegate with one argument', async () => {
        (JobSearchService.getJobs as jest.Mock).mockResolvedValue([mockJob]);

        await JobService.getJobs('arg1');

        expect(JobSearchService.getJobs).toHaveBeenCalledWith('arg1', undefined);
      });

      it('should delegate with two arguments', async () => {
        (JobSearchService.getJobs as jest.Mock).mockResolvedValue([mockJob]);

        await JobService.getJobs('arg1', 'arg2');

        expect(JobSearchService.getJobs).toHaveBeenCalledWith('arg1', 'arg2');
      });
    });

    describe('searchJobs', () => {
      it('should delegate to JobSearchService.searchJobs', async () => {
        (JobSearchService.searchJobs as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.searchJobs('plumbing', { category: 'plumbing' }, 10);

        expect(JobSearchService.searchJobs).toHaveBeenCalledWith('plumbing', { category: 'plumbing' }, 10);
        expect(result).toEqual([mockJob]);
      });

      it('should use default limit of 20', async () => {
        (JobSearchService.searchJobs as jest.Mock).mockResolvedValue([mockJob]);

        await JobService.searchJobs('electrical');

        expect(JobSearchService.searchJobs).toHaveBeenCalledWith('electrical', undefined, 20);
      });

      it('should handle budget filters', async () => {
        (JobSearchService.searchJobs as jest.Mock).mockResolvedValue([mockJob]);

        await JobService.searchJobs('kitchen', {
          minBudget: 1000,
          maxBudget: 5000,
        });

        expect(JobSearchService.searchJobs).toHaveBeenCalledWith(
          'kitchen',
          { minBudget: 1000, maxBudget: 5000 },
          20
        );
      });
    });

    describe('getJob', () => {
      it('should delegate to JobSearchService.getJob', async () => {
        (JobSearchService.getJob as jest.Mock).mockResolvedValue(mockJob);

        const result = await JobService.getJob('job-123');

        expect(JobSearchService.getJob).toHaveBeenCalledWith('job-123');
        expect(result).toEqual(mockJob);
      });

      it('should return null when job not found', async () => {
        (JobSearchService.getJob as jest.Mock).mockResolvedValue(null);

        const result = await JobService.getJob('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getJobsByUser', () => {
      it('should delegate to JobSearchService.getJobsByUser for homeowner', async () => {
        (JobSearchService.getJobsByUser as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getJobsByUser('user-123', 'homeowner');

        expect(JobSearchService.getJobsByUser).toHaveBeenCalledWith('user-123', 'homeowner');
        expect(result).toEqual([mockJob]);
      });

      it('should delegate to JobSearchService.getJobsByUser for contractor', async () => {
        (JobSearchService.getJobsByUser as jest.Mock).mockResolvedValue([mockJob]);

        const result = await JobService.getJobsByUser('user-456', 'contractor');

        expect(JobSearchService.getJobsByUser).toHaveBeenCalledWith('user-456', 'contractor');
        expect(result).toEqual([mockJob]);
      });
    });
  });

  describe('Bid Operations (delegated to BidManagementService)', () => {
    describe('submitBid', () => {
      it('should delegate to BidManagementService.submitBid', async () => {
        (BidManagementService.submitBid as jest.Mock).mockResolvedValue(mockBid);

        const bidData = {
          jobId: 'job-123',
          contractorId: 'contractor-123',
          amount: 900,
          description: 'My bid',
        };

        const result = await JobService.submitBid(bidData);

        expect(BidManagementService.submitBid).toHaveBeenCalledWith(bidData);
        expect(result).toEqual(mockBid);
      });
    });

    describe('getBidsByJob', () => {
      it('should delegate to BidManagementService.getBidsByJob', async () => {
        (BidManagementService.getBidsByJob as jest.Mock).mockResolvedValue([mockBid]);

        const result = await JobService.getBidsByJob('job-123');

        expect(BidManagementService.getBidsByJob).toHaveBeenCalledWith('job-123');
        expect(result).toEqual([mockBid]);
      });

      it('should return empty array when no bids found', async () => {
        (BidManagementService.getBidsByJob as jest.Mock).mockResolvedValue([]);

        const result = await JobService.getBidsByJob('job-999');

        expect(result).toEqual([]);
      });
    });

    describe('getBidsByContractor', () => {
      it('should delegate to BidManagementService.getBidsByContractor', async () => {
        (BidManagementService.getBidsByContractor as jest.Mock).mockResolvedValue([mockBid]);

        const result = await JobService.getBidsByContractor('contractor-123');

        expect(BidManagementService.getBidsByContractor).toHaveBeenCalledWith('contractor-123');
        expect(result).toEqual([mockBid]);
      });
    });

    describe('acceptBid', () => {
      it('should delegate to BidManagementService.acceptBid', async () => {
        (BidManagementService.acceptBid as jest.Mock).mockResolvedValue(undefined);

        await JobService.acceptBid('bid-123');

        expect(BidManagementService.acceptBid).toHaveBeenCalledWith('bid-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from JobCRUDService', async () => {
      const error = new Error('Database error');
      (JobCRUDService.createJob as jest.Mock).mockRejectedValue(error);

      await expect(JobService.createJob({
        title: 'Test',
        description: 'Test',
        location: 'Test',
        budget: 1000,
      })).rejects.toThrow('Database error');
    });

    it('should propagate errors from JobSearchService', async () => {
      const error = new Error('Search error');
      (JobSearchService.searchJobs as jest.Mock).mockRejectedValue(error);

      await expect(JobService.searchJobs('test')).rejects.toThrow('Search error');
    });

    it('should propagate errors from BidManagementService', async () => {
      const error = new Error('Bid error');
      (BidManagementService.submitBid as jest.Mock).mockRejectedValue(error);

      await expect(JobService.submitBid({
        jobId: 'job-123',
        contractorId: 'contractor-123',
        amount: 900,
        description: 'Test bid',
      })).rejects.toThrow('Bid error');
    });
  });
});
