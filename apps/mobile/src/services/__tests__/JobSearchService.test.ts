/**
 * Tests for JobSearchService - Job Search and Filtering Operations
 *
 * The service now uses mobileApiClient for all search/list operations
 * and delegates getJob to JobCRUDService.getJobById.
 */

import { JobSearchService } from '../JobSearchService';
import type { Job } from '@mintenance/types';
import { JobCRUDService } from '../JobCRUDService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { isValidSearchTerm } from '../../utils/sqlSanitization';
import { logger } from '../../utils/logger';

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

// Note: supabase is provided by the global mock via moduleNameMapper.
// Do NOT add an inline jest.mock for config/supabase here.

jest.mock('../../utils/sqlSanitization');
jest.mock('../../utils/logger');
jest.mock('../JobCRUDService', () => ({
  JobCRUDService: {
    formatJob: jest.fn((data: unknown) => data),
    getJobById: jest.fn(),
  },
}));

const mockedApiClient = mobileApiClient as jest.Mocked<typeof mobileApiClient>;

describe('JobSearchService', () => {
  const mockJobData: Job = {
    id: 'job-123',
    title: 'Plumbing Repair',
    description: 'Fix leaky faucet',
    location: 'New York',
    budget: 1000,
    status: 'posted',
    homeowner_id: 'homeowner-123',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  const mockFormattedJob: Job = {
    id: 'job-123',
    title: 'Plumbing Repair',
    description: 'Fix leaky faucet',
    location: 'New York',
    budget: 1000,
    status: 'posted',
    homeowner_id: 'homeowner-123',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isValidSearchTerm as jest.Mock).mockReturnValue(true);
  });

  describe('getJobsByHomeowner', () => {
    it('should get jobs by homeowner ID via API', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobsByHomeowner('homeowner-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('homeowner_id=homeowner-123')
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [] });

      const result = await JobSearchService.getJobsByHomeowner('homeowner-999');

      expect(result).toEqual([]);
    });

    it('should throw error when API fails', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Database error'));

      await expect(
        JobSearchService.getJobsByHomeowner('homeowner-123')
      ).rejects.toThrow('Database error');
    });

    it('should handle response without jobs wrapper', async () => {
      mockedApiClient.get.mockResolvedValue([mockJobData]);

      const result = await JobSearchService.getJobsByHomeowner('homeowner-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('getUserJobs', () => {
    it('should get jobs by user ID', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getUserJobs('user-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('homeowner_id=user-123')
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [] });

      const result = await JobSearchService.getUserJobs('user-999');

      expect(result).toEqual([]);
    });

    it('should throw error when API fails', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Connection failed'));

      await expect(JobSearchService.getUserJobs('user-123')).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('getAvailableJobs', () => {
    it('should get available (posted) jobs with limit', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getAvailableJobs();

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=posted')
      );
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=20')
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs available', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [] });

      const result = await JobSearchService.getAvailableJobs();

      expect(result).toEqual([]);
    });

    it('should throw error when API fails', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Query failed'));

      await expect(JobSearchService.getAvailableJobs()).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('getJobsByStatus', () => {
    it('should get jobs by status', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobsByStatus('posted');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=posted')
      );
      expect(result).toHaveLength(1);
    });

    it('should include userId filter when provided', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.getJobsByStatus('in_progress', 'user-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-123')
      );
    });

    it('should not include userId when not provided', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.getJobsByStatus('posted');

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).not.toContain('userId=');
    });

    it('should return empty array when no jobs found', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [] });

      const result = await JobSearchService.getJobsByStatus('completed');

      expect(result).toEqual([]);
    });
  });

  describe('getJobsByUser', () => {
    // getJobsByUser hits GET /api/jobs and relies on the web route scoping
    // results to the authenticated session (apps/web/app/api/jobs/route.ts
    // calls JobQueryService.listJobs({ id: user.id, role: user.role })). The
    // client therefore does NOT — and must not — append homeowner_id/
    // contractor_id query params; server-side auth scoping is authoritative.
    it('should get jobs by homeowner', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobsByUser(
        'user-123',
        'homeowner'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs')
      );
      expect(result).toHaveLength(1);
    });

    it('should get jobs by contractor', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobsByUser(
        'contractor-123',
        'contractor'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs')
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [] });

      const result = await JobSearchService.getJobsByUser(
        'user-999',
        'homeowner'
      );

      expect(result).toEqual([]);
    });
  });

  describe('getJobs', () => {
    it('should get jobs with status and limit', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobs('posted', 10);

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('status=posted');
      expect(callUrl).toContain('limit=10');
      expect(result).toHaveLength(1);
    });

    it('should get jobs with limit and offset', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobs(10, 20);

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('offset=20');
      expect(result).toHaveLength(1);
    });

    it('should get jobs with default limit when no args', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.getJobs();

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('limit=20');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [] });

      const result = await JobSearchService.getJobs();

      expect(result).toEqual([]);
    });
  });

  describe('searchJobs', () => {
    it('should search jobs via API', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      const result = await JobSearchService.searchJobs('plumbing');

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('search=plumbing');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid search term', async () => {
      (isValidSearchTerm as jest.Mock).mockReturnValue(false);

      const result = await JobSearchService.searchJobs('invalid');

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid search term rejected in JobSearchService'
      );
    });

    it('should apply category filter', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.searchJobs('repair', { category: 'plumbing' });

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('category=plumbing');
    });

    it('should apply budget filters', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.searchJobs('repair', {
        minBudget: 500,
        maxBudget: 2000,
      });

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('minBudget=500');
      expect(callUrl).toContain('maxBudget=2000');
    });

    it('should apply custom limit', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.searchJobs('repair', undefined, 50);

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('limit=50');
    });

    it('should use default limit of 20', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.searchJobs('repair');

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('limit=20');
    });

    it('should apply all filters together', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.searchJobs(
        'plumbing',
        { category: 'plumbing', minBudget: 500, maxBudget: 2000 },
        30
      );

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('search=plumbing');
      expect(callUrl).toContain('category=plumbing');
      expect(callUrl).toContain('minBudget=500');
      expect(callUrl).toContain('maxBudget=2000');
      expect(callUrl).toContain('limit=30');
    });

    it('should handle zero budget values', async () => {
      mockedApiClient.get.mockResolvedValue({ jobs: [mockJobData] });

      await JobSearchService.searchJobs('repair', {
        minBudget: 0,
        maxBudget: 0,
      });

      const callUrl = mockedApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('minBudget=0');
      expect(callUrl).toContain('maxBudget=0');
    });
  });

  describe('getJob', () => {
    it('should delegate to JobCRUDService.getJobById', async () => {
      (JobCRUDService.getJobById as jest.Mock).mockResolvedValue(
        mockFormattedJob
      );

      const result = await JobSearchService.getJob('job-123');

      expect(JobCRUDService.getJobById).toHaveBeenCalledWith('job-123');
      expect(result).toEqual(mockFormattedJob);
    });

    it('should return null when job not found', async () => {
      (JobCRUDService.getJobById as jest.Mock).mockResolvedValue(null);

      const result = await JobSearchService.getJob('non-existent');

      expect(result).toBeNull();
    });
  });
});
