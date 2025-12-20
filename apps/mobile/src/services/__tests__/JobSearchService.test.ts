/**
 * Tests for JobSearchService - Job Search and Filtering Operations
 */

import { JobSearchService } from '../JobSearchService';
import { JobCRUDService } from '../JobCRUDService';
import { supabase } from '../../config/supabase';
import { Job } from '../../types';
import { sanitizeForSQL, isValidSearchTerm } from '../../utils/sqlSanitization';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/sqlSanitization');
jest.mock('../../utils/logger');
jest.mock('../JobCRUDService');

describe('JobSearchService', () => {
  const mockJobData = {
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
    (JobCRUDService['formatJob'] as jest.Mock) = jest.fn((data) => ({
      ...data,
      // Mock formatting
    }));
  });

  describe('getJobsByHomeowner', () => {
    it('should get jobs by homeowner ID', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByHomeowner('homeowner-123');

      expect(supabase.from).toHaveBeenCalledWith('jobs');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.eq).toHaveBeenCalledWith('homeowner_id', 'homeowner-123');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByHomeowner('homeowner-999');

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const error = new Error('Database error');
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobSearchService.getJobsByHomeowner('homeowner-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('should format jobs using JobCRUDService.formatJob', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.getJobsByHomeowner('homeowner-123');

      // formatJob is called via map with (data, index, array) - check first call
      expect(JobCRUDService['formatJob']).toHaveBeenCalledWith(
        mockJobData,
        expect.any(Number),
        expect.any(Array)
      );
    });
  });

  describe('getUserJobs', () => {
    it('should get jobs by user ID', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getUserJobs('user-123');

      expect(mockFrom.eq).toHaveBeenCalledWith('homeowner_id', 'user-123');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getUserJobs('user-999');

      expect(result).toEqual([]);
    });

    it('should throw error with message when query fails', async () => {
      const error = { message: 'Connection failed' };
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobSearchService.getUserJobs('user-123')).rejects.toThrow('Connection failed');
    });
  });

  describe('getAvailableJobs', () => {
    it('should get available (posted) jobs with limit', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getAvailableJobs();

      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'posted');
      expect(mockFrom.limit).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(1);
    });

    it('should work without limit function (fallback)', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          then: (cb: any) => cb({ data: [mockJobData], error: null }),
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getAvailableJobs();

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs available', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getAvailableJobs();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      const error = new Error('Query failed');
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await expect(JobSearchService.getAvailableJobs()).rejects.toThrow('Query failed');
    });
  });

  describe('getJobsByStatus', () => {
    it('should get jobs by status', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByStatus('posted');

      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'posted');
      expect(result).toHaveLength(1);
    });

    it('should filter by user ID when provided', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.getJobsByStatus('in_progress', 'user-123');

      expect(mockFrom.or).toHaveBeenCalledWith(
        'homeowner_id.eq.user-123,contractor_id.eq.user-123'
      );
    });

    it('should not filter by user when userId is undefined', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.getJobsByStatus('posted');

      expect(mockFrom.or).not.toHaveBeenCalled();
    });

    it('should return empty array when no jobs found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByStatus('completed');

      expect(result).toEqual([]);
    });
  });

  describe('getJobsByUser', () => {
    it('should get jobs by homeowner', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByUser('user-123', 'homeowner');

      expect(mockFrom.eq).toHaveBeenCalledWith('homeowner_id', 'user-123');
      expect(result).toHaveLength(1);
    });

    it('should get jobs by contractor', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByUser('contractor-123', 'contractor');

      expect(mockFrom.eq).toHaveBeenCalledWith('contractor_id', 'contractor-123');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobsByUser('user-999', 'homeowner');

      expect(result).toEqual([]);
    });
  });

  describe('getJobs', () => {
    it('should get jobs with status and limit', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobs('posted', 10);

      expect(mockFrom.eq).toHaveBeenCalledWith('status', 'posted');
      expect(mockFrom.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    it('should get jobs with limit and offset', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      // arg1=10 (limit), arg2=20 (offset) -> range(20, 20 + 10 - 1 = 29)
      const result = await JobSearchService.getJobs(10, 20);

      expect(mockFrom.range).toHaveBeenCalledWith(20, 29); // offset to offset + limit - 1
      expect(result).toHaveLength(1);
    });

    it('should get jobs with limit only', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobs(undefined, 15);

      expect(mockFrom.limit).toHaveBeenCalledWith(15);
      expect(result).toHaveLength(1);
    });

    it('should get jobs with default limit when no args', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobs();

      expect(mockFrom.limit).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(1);
    });

    it('should work without limit function (fallback)', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          then: (cb: any) => cb({ data: [mockJobData], error: null }),
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobs();

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no jobs found', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.getJobs();

      expect(result).toEqual([]);
    });
  });

  describe('searchJobs', () => {
    beforeEach(() => {
      (isValidSearchTerm as jest.Mock).mockReturnValue(true);
      (sanitizeForSQL as jest.Mock).mockImplementation((s) => s);
    });

    it('should search jobs with textSearch when available', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.searchJobs('plumbing');

      expect(mockFrom.textSearch).toHaveBeenCalledWith('fts', 'plumbing');
      expect(result).toHaveLength(1);
    });

    it('should use or clause when textSearch not available', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs('plumbing');

      expect(mockFrom.or).toHaveBeenCalledWith(
        expect.stringContaining('title.ilike.%plumbing%')
      );
    });

    it('should return empty array for invalid search term', async () => {
      (isValidSearchTerm as jest.Mock).mockReturnValue(false);

      const result = await JobSearchService.searchJobs('invalid');

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('Invalid search term rejected in JobSearchService');
    });

    it('should return empty array when sanitization returns empty', async () => {
      (sanitizeForSQL as jest.Mock).mockReturnValue('');

      const result = await JobSearchService.searchJobs('test');

      expect(result).toEqual([]);
    });

    it('should apply category filter', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs('repair', { category: 'plumbing' });

      expect(mockFrom.eq).toHaveBeenCalledWith('category', 'plumbing');
    });

    it('should apply budget filters', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs('repair', {
        minBudget: 500,
        maxBudget: 2000,
      });

      expect(mockFrom.gte).toHaveBeenCalledWith('budget', 500);
      expect(mockFrom.lte).toHaveBeenCalledWith('budget', 2000);
    });

    it('should apply custom limit', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs('repair', undefined, 50);

      expect(mockFrom.limit).toHaveBeenCalledWith(50);
    });

    it('should use default limit of 20', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs('repair');

      expect(mockFrom.limit).toHaveBeenCalledWith(20);
    });

    it('should work without limit function (fallback)', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          then: (cb: any) => cb({ data: [mockJobData], error: null }),
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await JobSearchService.searchJobs('repair');

      expect(result).toHaveLength(1);
    });

    it('should apply all filters together', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs(
        'plumbing',
        {
          category: 'plumbing',
          minBudget: 500,
          maxBudget: 2000,
        },
        30
      );

      expect(mockFrom.textSearch).toHaveBeenCalled();
      expect(mockFrom.eq).toHaveBeenCalledWith('category', 'plumbing');
      expect(mockFrom.gte).toHaveBeenCalledWith('budget', 500);
      expect(mockFrom.lte).toHaveBeenCalledWith('budget', 2000);
      expect(mockFrom.limit).toHaveBeenCalledWith(30);
    });

    it('should handle zero budget values', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockJobData], error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      await JobSearchService.searchJobs('repair', {
        minBudget: 0,
        maxBudget: 0,
      });

      expect(mockFrom.gte).toHaveBeenCalledWith('budget', 0);
      expect(mockFrom.lte).toHaveBeenCalledWith('budget', 0);
    });
  });

  describe('getJob', () => {
    it('should delegate to JobCRUDService.getJobById', async () => {
      (JobCRUDService.getJobById as jest.Mock).mockResolvedValue(mockFormattedJob);

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
