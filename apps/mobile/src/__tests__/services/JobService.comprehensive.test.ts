// Realigned 2026-06-04: JobService now delegates to JobCRUDService /
// JobSearchService / BidService, all of which route through
// `mobileApiClient` (the web API) rather than calling
// `supabase.from(...)` directly. The previous version of this suite
// mocked `config/supabase` and asserted direct-DB chains (`from('jobs')`,
// `.update().eq()`, `.select().or()`, `.range()`), plus a single-arg
// `acceptBid('bid-1')` — every one of those is stale against the
// post-refactor implementation. This rewrite mocks `mobileApiClient`
// and asserts the API endpoints, request payloads, and response shapes
// the current services actually produce.

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

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

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

// Mock ServiceErrorHandler
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

describe('JobService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
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

    it('should create a job successfully', async () => {
      const mockCreatedJob = {
        id: 'job-1',
        title: mockJobData.title,
        description: mockJobData.description,
        location: mockJobData.location,
        budget: mockJobData.budget,
        homeowner_id: mockJobData.homeownerId,
        category: mockJobData.category,
        status: 'posted',
        photos: mockJobData.photos,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mobileApiClient.post.mockResolvedValue({ job: mockCreatedJob });

      const result = await JobService.createJob(mockJobData);

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs',
        expect.objectContaining({ title: 'Kitchen Repair' })
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'job-1',
          title: 'Kitchen Repair',
          homeowner_id: 'user-1',
          status: 'posted',
        })
      );
    });

    it('should throw error when creation fails', async () => {
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
          homeowner_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'job-2',
          title: 'Bathroom Fix',
          homeowner_id: 'user-1',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.getJobsByHomeowner('user-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs')
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
      expect(result[1].id).toBe('job-2');
    });

    it('should throw error when fetch fails', async () => {
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
          status: 'posted',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.getAvailableJobs();

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=posted')
      );
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
      };

      mobileApiClient.get.mockResolvedValue({ job: mockJob });

      const result = await JobService.getJobById('job-1');

      expect(mobileApiClient.get).toHaveBeenCalledWith('/api/jobs/job-1');
      expect(result?.id).toBe('job-1');
    });

    it('should return null when job not found', async () => {
      // The web API returns an envelope without a `job` key when the
      // job doesn't exist (or returns job: null); the service maps that
      // to null rather than throwing.
      mobileApiClient.get.mockResolvedValue({ job: null });

      const result = await JobService.getJobById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      mobileApiClient.get.mockRejectedValue(new Error('Database error'));

      await expect(JobService.getJobById('job-1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status (in_progress -> start endpoint)', async () => {
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

      const result = await JobService.updateJobStatus(
        'job-1',
        'in_progress',
        'contractor-1'
      );

      // in_progress transitions route through the dedicated start endpoint
      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/start'
      );
      expect(result.status).toBe('in_progress');
    });

    it('should update status to completed via complete endpoint', async () => {
      mobileApiClient.post.mockResolvedValue({ success: true });
      mobileApiClient.get.mockResolvedValue({
        job: {
          id: 'job-1',
          status: 'completed',
          title: 'Kitchen Repair',
          homeowner_id: 'user-1',
          budget: 150,
        },
      });

      const result = await JobService.updateJobStatus('job-1', 'completed');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/jobs/job-1/complete'
      );
      expect(result.status).toBe('completed');
    });

    it('should throw error when update fails', async () => {
      mobileApiClient.post.mockRejectedValue(new Error('Update failed'));

      await expect(
        JobService.updateJobStatus('job-1', 'completed')
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Bid Management', () => {
    describe('submitBid', () => {
      const mockBidData = {
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150,
        description: 'I can fix this quickly',
      };

      it('should submit bid successfully', async () => {
        // submitBid -> BidManagementService.submitBid -> POST
        // /api/contractor/submit-bid; returns { bid } (snake_case row),
        // formatted to a camelCase ApiBid.
        const mockBid = {
          id: 'bid-1',
          job_id: 'job-1',
          contractor_id: 'contractor-1',
          amount: 150,
          message: 'I can fix this quickly',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        };

        mobileApiClient.post.mockResolvedValue({ bid: mockBid });

        const result = await JobService.submitBid(mockBidData);

        expect(mobileApiClient.post).toHaveBeenCalledWith(
          '/api/contractor/submit-bid',
          expect.objectContaining({ jobId: 'job-1', bidAmount: 150 })
        );
        expect(result).toEqual(
          expect.objectContaining({
            id: 'bid-1',
            jobId: 'job-1',
            contractorId: 'contractor-1',
            amount: 150,
          })
        );
      });
    });

    describe('getBidsByJob', () => {
      it('should fetch bids for a job', async () => {
        // getBidsByJob -> GET /api/jobs/:id/bids, reads `response.bids`.
        // The route returns each bid with a nested `contractor` object
        // (snake_case), already enriched with rating/reviews_count — the
        // service returns the rows as-is (no contractorName flattening).
        const mockBids = [
          {
            id: 'bid-1',
            job_id: 'job-1',
            contractor_id: 'contractor-1',
            amount: 150,
            contractor: {
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
            },
          },
        ];

        mobileApiClient.get.mockResolvedValue({ bids: mockBids });

        const result = await JobService.getBidsByJob('job-1');

        expect(mobileApiClient.get).toHaveBeenCalledWith(
          '/api/jobs/job-1/bids'
        );
        expect(result).toHaveLength(1);
        expect(result[0].contractor?.first_name).toBe('John');
        expect(result[0].contractor?.email).toBe('john@example.com');
      });
    });

    describe('acceptBid', () => {
      it('should accept bid via the nested accept endpoint', async () => {
        // acceptBid now requires (bidId, jobId) and routes to
        // POST /api/jobs/:jobId/bids/:bidId/accept, returning
        // { success, message }.
        mobileApiClient.post.mockResolvedValue({
          success: true,
          message: 'Bid accepted',
        });

        await JobService.acceptBid('bid-1', 'job-1');

        expect(mobileApiClient.post).toHaveBeenCalledWith(
          '/api/jobs/job-1/bids/bid-1/accept'
        );
      });

      it('should throw error if accept fails', async () => {
        mobileApiClient.post.mockRejectedValue(new Error('Bid not found'));

        await expect(
          JobService.acceptBid('nonexistent', 'job-1')
        ).rejects.toThrow('Bid not found');
      });
    });
  });

  describe('searchJobs', () => {
    it('should search jobs by query', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Plumbing',
          description: 'Fix kitchen sink',
          location: 'Kitchen',
          category: 'Plumbing',
        },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.searchJobs('kitchen', undefined, 10);

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=kitchen')
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Kitchen Plumbing');
    });
  });

  describe('getJobs with pagination', () => {
    it('should fetch jobs with pagination', async () => {
      const mockJobs = [
        { id: 'job-1', title: 'Job 1' },
        { id: 'job-2', title: 'Job 2' },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      // getJobs(limit, offset) — builds /api/jobs?limit=20&offset=10
      const result = await JobService.getJobs(20, 10);

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=20')
      );
      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('offset=10')
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('Job lifecycle methods', () => {
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

  describe('getJobsByStatus', () => {
    it('should fetch jobs by status', async () => {
      const mockJobs = [{ id: 'job-1', status: 'in_progress' }];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.getJobsByStatus('in_progress');

      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=in_progress')
      );
      expect(result).toHaveLength(1);
    });

    it('should fetch jobs by status for specific user', async () => {
      const mockJobs = [
        { id: 'job-1', status: 'in_progress', homeowner_id: 'user-1' },
      ];

      mobileApiClient.get.mockResolvedValue({ jobs: mockJobs });

      const result = await JobService.getJobsByStatus('in_progress', 'user-1');

      // The route session-scopes by auth.uid(); the userId is passed
      // through on the URL as an informational filter.
      expect(mobileApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=in_progress')
      );
      expect(result).toHaveLength(1);
    });
  });
});
