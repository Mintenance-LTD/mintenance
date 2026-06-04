/**
 * JobService unit tests.
 *
 * 2026-06-04 rewrite: the prior suite tested a long-removed
 * direct-Supabase implementation (supabase.from('jobs')..., textSearch,
 * a getJobsByUser that branched on role and queried bids). JobService is
 * now a thin facade delegating to JobCRUDService / JobSearchService /
 * BidService, all of which route through `mobileApiClient` (mobile→web
 * API). createJob additionally runs through ServiceErrorHandler. These
 * tests assert the CURRENT contract by mocking the API client.
 *
 * Note: JobCRUDService.formatJob() reshapes every API row into the
 * canonical `Job` (snake_case, coerced numerics, defaulted fields) and
 * intentionally SKIPS the camelCase mirror keys when running under jest
 * (JEST_WORKER_ID set), so the formatted output is deterministic here.
 */

import { JobService } from '../../services/JobService';
import { mobileApiClient } from '../../utils/mobileApiClient';

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

// Mock the API client — all job traffic flows through it.
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock ServiceErrorHandler so createJob's executeOperation wrapper runs
// the operation inline and surfaces thrown errors verbatim.
jest.mock('../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    validateRequired: jest.fn(),
    validatePositiveNumber: jest.fn(),
    executeOperation: jest.fn(async (operation: () => Promise<unknown>) => {
      const data = await operation();
      return { success: true, data };
    }),
    handleDatabaseError: jest.fn((error) => error),
  },
}));

const { ServiceErrorHandler } = require('../../utils/serviceErrorHandler');
const mockApi = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

// A raw API job row (snake_case, as the web /api/jobs route returns it).
const apiJobRow = {
  id: 'test-job-1',
  title: 'Kitchen Faucet Repair',
  description: 'Leaky kitchen faucet needs professional repair',
  location: '123 Main Street, Anytown, USA',
  homeowner_id: 'homeowner-1',
  status: 'posted',
  budget: 150,
  category: 'Plumbing',
  subcategory: 'Faucet Repair',
  priority: 'high',
  photos: ['photo1.jpg'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    const jobInput = {
      title: 'Kitchen Faucet Repair',
      description: 'Leaky kitchen faucet needs professional repair',
      location: '123 Main Street, Anytown, USA',
      budget: 150,
      category: 'Plumbing',
      subcategory: 'Faucet Repair',
      homeowner_id: 'homeowner-1',
      photos: ['photo1.jpg'],
    };

    it('POSTs to /api/jobs and returns the formatted job', async () => {
      mockApi.post.mockResolvedValue({ job: apiJobRow });

      const result = await JobService.createJob(jobInput);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/jobs',
        expect.objectContaining({
          title: 'Kitchen Faucet Repair',
          description: 'Leaky kitchen faucet needs professional repair',
          location: '123 Main Street, Anytown, USA',
          budget: 150,
          category: 'Plumbing',
        })
      );
      expect(result.id).toBe('test-job-1');
      expect(result.title).toBe('Kitchen Faucet Repair');
      expect(result.status).toBe('posted');
      expect(result.budget).toBe(150);
    });

    it('throws when the API returns no job', async () => {
      mockApi.post.mockResolvedValue({});

      await expect(JobService.createJob(jobInput)).rejects.toThrow(
        'No job returned from API'
      );
    });

    it('surfaces validation errors from ServiceErrorHandler', async () => {
      ServiceErrorHandler.validateRequired.mockImplementationOnce(() => {
        throw new Error('Title is required');
      });

      await expect(
        JobService.createJob({ ...jobInput, title: '' })
      ).rejects.toThrow('Title is required');
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('getJobs', () => {
    it('GETs /api/jobs and unwraps the jobs array', async () => {
      const jobs = [{ id: 'job-1' }, { id: 'job-2' }];
      mockApi.get.mockResolvedValue({ jobs });

      const result = await JobService.getJobs();

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs')
      );
      expect(result).toEqual(jobs);
    });

    it('encodes a status filter in the URL', async () => {
      mockApi.get.mockResolvedValue({ jobs: [] });

      await JobService.getJobs('posted');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('status=posted')
      );
    });

    it('encodes a limit in the URL', async () => {
      mockApi.get.mockResolvedValue({ jobs: [] });

      await JobService.getJobs(undefined, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=10')
      );
    });

    it('tolerates a bare-array response', async () => {
      const jobs = [{ id: 'job-1' }];
      mockApi.get.mockResolvedValue(jobs);

      const result = await JobService.getJobs();

      expect(result).toEqual(jobs);
    });
  });

  describe('getJobById', () => {
    it('GETs /api/jobs/:id and returns the formatted job', async () => {
      mockApi.get.mockResolvedValue({ job: apiJobRow });

      const result = await JobService.getJobById('test-job-1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/jobs/test-job-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-job-1');
      expect(result?.title).toBe('Kitchen Faucet Repair');
    });

    it('returns null when the API returns no job', async () => {
      mockApi.get.mockResolvedValue({ job: null });

      const result = await JobService.getJobById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('PUTs the updates and returns the formatted job', async () => {
      const updatedRow = { ...apiJobRow, title: 'Updated Title', budget: 200 };
      mockApi.put.mockResolvedValue({ job: updatedRow });

      const result = await JobService.updateJob('test-job-1', {
        title: 'Updated Title',
        budget: 200,
      });

      expect(mockApi.put).toHaveBeenCalledWith('/api/jobs/test-job-1', {
        title: 'Updated Title',
        budget: 200,
      });
      expect(result.title).toBe('Updated Title');
      expect(result.budget).toBe(200);
    });

    it('rejects invalid status values before hitting the API', async () => {
      await expect(
        JobService.updateJob('test-job-1', { status: 'invalid-status' as any })
      ).rejects.toThrow('Invalid status');
      expect(mockApi.put).not.toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    it('DELETEs /api/jobs/:id', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await JobService.deleteJob('test-job-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/jobs/test-job-1');
    });

    it('propagates deletion errors', async () => {
      mockApi.delete.mockRejectedValue(
        new Error('Cannot delete job with active bids')
      );

      await expect(JobService.deleteJob('test-job-1')).rejects.toThrow(
        'Cannot delete job with active bids'
      );
    });
  });

  describe('searchJobs', () => {
    it('GETs /api/jobs with the search term and unwraps jobs', async () => {
      const jobs = [{ id: 'job-1' }];
      mockApi.get.mockResolvedValue({ jobs });

      const result = await JobService.searchJobs('kitchen repair');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('search=kitchen')
      );
      expect(result).toEqual(jobs);
    });

    it('encodes category and budget-range filters', async () => {
      mockApi.get.mockResolvedValue({ jobs: [] });

      await JobService.searchJobs('repair', {
        category: 'Plumbing',
        minBudget: 100,
        maxBudget: 500,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('category=Plumbing');
      expect(url).toContain('minBudget=100');
      expect(url).toContain('maxBudget=500');
    });
  });

  describe('getJobsByUser', () => {
    it('fetches jobs for a homeowner and unwraps them', async () => {
      const jobs = [{ id: 'job-1' }];
      mockApi.get.mockResolvedValue({ jobs });

      const result = await JobService.getJobsByUser('homeowner-1', 'homeowner');

      expect(mockApi.get).toHaveBeenCalledWith('/api/jobs');
      expect(result).toEqual(jobs);
    });

    it('fetches jobs for a contractor and unwraps them', async () => {
      const jobs = [{ id: 'job-1' }];
      mockApi.get.mockResolvedValue({ jobs });

      const result = await JobService.getJobsByUser(
        'contractor-1',
        'contractor'
      );

      expect(result).toEqual(jobs);
    });
  });
});
