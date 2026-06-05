// Realigned 2026-06-04: JobService was refactored to delegate to
// JobCRUDService / JobSearchService / BidService, all of which route
// through `mobileApiClient` (the web API) instead of calling
// `supabase.from('jobs')` directly. The previous version of this suite
// mocked `config/supabase` and asserted direct-DB chains — every
// assertion was stale. This rewrite mocks `mobileApiClient` (the real
// transport the services use) and asserts the API endpoints + response
// shapes the current implementation produces.

import { JobService } from '../../services/JobService';

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

// The services delegate every DB operation to the web API via
// mobileApiClient. Mock that surface directly so the suite exercises
// the real service logic (validation, formatJob, unwrapJobs) without
// hitting the network.
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// logger.warn is called at module load time by mobileApiClient's
// resolveApiBaseUrl in the dev fallback path; include all four levels.
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/sanitize', () => ({
  sanitizeText: (text: string) => text,
}));

// Mock ServiceErrorHandler (used by JobCRUDService.createJob).
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: jest.fn(),
    validatePositiveNumber: jest.fn(),
    executeOperation: jest.fn().mockImplementation(async (operation) => {
      const data = await operation();
      return { success: true, data };
    }),
    handleDatabaseError: jest.fn((error) => {
      throw new Error(error.message);
    }),
  },
}));

const { mobileApiClient } = require('../../utils/mobileApiClient');

describe('JobService - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a job successfully', async () => {
      const mockJobData = {
        title: 'Kitchen Repair',
        description: 'Fix leaky faucet',
        location: '123 Main St',
        budget: 150,
        homeownerId: 'user-1',
        category: 'Plumbing',
        urgency: 'high' as const,
        photos: ['photo1.jpg'],
      };

      // createJob routes through POST /api/jobs and reads `response.job`.
      mobileApiClient.post.mockResolvedValue({
        job: {
          id: 'job-1',
          title: 'Kitchen Repair',
          description: 'Fix leaky faucet',
          location: '123 Main St',
          budget: 150,
          homeowner_id: 'user-1',
          category: 'Plumbing',
          status: 'posted',
          created_at: '2024-01-01T00:00:00Z',
          photos: ['photo1.jpg'],
        },
      });

      const result = await JobService.createJob(mockJobData);

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs',
        expect.objectContaining({ title: 'Kitchen Repair' })
      );
      expect(result.id).toBe('job-1');
      expect(result.title).toBe('Kitchen Repair');
    });

    it('should handle creation errors', async () => {
      const mockJobData = {
        title: 'Kitchen Repair',
        description: 'Fix leaky faucet',
        location: '123 Main St',
        budget: 150,
        homeownerId: 'user-1',
        category: 'Plumbing',
        urgency: 'high' as const,
        photos: [],
      };

      mobileApiClient.post.mockRejectedValue(new Error('Creation failed'));

      await expect(JobService.createJob(mockJobData)).rejects.toThrow(
        'Creation failed'
      );
    });
  });

  describe('getJobsByHomeowner', () => {
    it('should fetch jobs for homeowner', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Repair',
          status: 'posted',
          homeowner_id: 'user-1',
          budget: 150,
        },
        {
          id: 'job-2',
          title: 'Bathroom Fix',
          status: 'in_progress',
          homeowner_id: 'user-1',
          budget: 200,
        },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.getJobsByHomeowner('user-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs')
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
    });

    it('should handle fetch errors', async () => {
      mobileApiClient.get.mockRejectedValue(new Error('Fetch failed'));

      await expect(JobService.getJobsByHomeowner('user-1')).rejects.toThrow(
        'Fetch failed'
      );
    });
  });

  describe('getAvailableJobs', () => {
    it('should fetch available jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Repair',
          status: 'posted',
          budget: 150,
        },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.getAvailableJobs();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('posted');
    });
  });

  describe('getJobById', () => {
    it('should fetch job by id', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Kitchen Repair',
        status: 'posted',
        budget: 150,
        homeowner_id: 'user-1',
      };

      mobileApiClient.get.mockResolvedValue({ job: mockJob });

      const result = await JobService.getJobById('job-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith('/api/jobs/job-1');
      expect(result?.id).toBe('job-1');
    });

    it('should return null when job not found', async () => {
      // API returns an envelope with no `job` key when none exists.
      mobileApiClient.get.mockResolvedValue({ job: null });

      const result = await JobService.getJobById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mobileApiClient.get.mockRejectedValue(new Error('Database error'));

      await expect(JobService.getJobById('job-1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      // in_progress routes via POST /api/jobs/:id/start, then re-fetches
      // the job via GET /api/jobs/:id.
      mobileApiClient.post.mockResolvedValue({ success: true });
      mobileApiClient.get.mockResolvedValue({
        job: {
          id: 'job-1',
          status: 'in_progress',
          title: 'Kitchen Repair',
          homeowner_id: 'user-1',
          budget: 150,
        },
      });

      const result = await JobService.updateJobStatus('job-1', 'in_progress');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/start'
      );
      expect(result.status).toBe('in_progress');
    });

    it('should handle update errors', async () => {
      // completed routes via POST /api/jobs/:id/complete.
      mobileApiClient.post.mockRejectedValue(new Error('Update failed'));

      await expect(
        JobService.updateJobStatus('job-1', 'completed')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('submitBid', () => {
    it('should submit bid successfully', async () => {
      // submitBid -> BidManagementService.submitBid -> POST
      // /api/contractor/submit-bid, returns { bid } (snake_case row).
      // Result is the formatted camelCase ApiBid.
      mobileApiClient.post.mockResolvedValue({
        bid: {
          id: 'bid-1',
          job_id: 'job-1',
          contractor_id: 'user-2',
          amount: 120,
          message: 'I can fix this',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      const result = await JobService.submitBid({
        jobId: 'job-1',
        contractorId: 'user-2',
        amount: 120,
        description: 'I can fix this',
      });

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        expect.objectContaining({ jobId: 'job-1', bidAmount: 120 })
      );
      expect(result.id).toBe('bid-1');
      expect(result.amount).toBe(120);
    });
  });

  describe('getBidsByJob', () => {
    it('should fetch bids for a job', async () => {
      const mockBids = [
        {
          id: 'bid-1',
          job_id: 'job-1',
          amount: 120,
          contractor: { first_name: 'John', last_name: 'Contractor' },
        },
      ];

      // getBidsByJob -> GET /api/jobs/:id/bids, reads `response.bids`.
      mobileApiClient.get.mockResolvedValue({ bids: mockBids });

      const result = await JobService.getBidsByJob('job-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith('/api/jobs/job-1/bids');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(120);
    });
  });

  describe('searchJobs', () => {
    it('should search jobs by query', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Repair',
          description: 'Fix leaky faucet',
          status: 'posted',
        },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.searchJobs('kitchen');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=kitchen')
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Kitchen');
    });
  });

  describe('job lifecycle methods', () => {
    it('should start job', async () => {
      mobileApiClient.post.mockResolvedValue({ success: true });

      await JobService.startJob('job-1');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/start'
      );
    });

    it('should complete job', async () => {
      mobileApiClient.post.mockResolvedValue({ success: true });

      await JobService.completeJob('job-1');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/complete'
      );
    });
  });
});
