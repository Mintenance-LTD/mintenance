import React from 'react';
import { JobService } from '../../services/JobService';
import { supabase } from '../../config/supabase';
import { Job, JobData } from '../../types';

// Mock Supabase with proper chaining
jest.mock('../../config/supabase', () => {
  const createMockChain = () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    
    // Make all methods return the chain for method chaining
    Object.keys(chain).forEach(key => {
      if (key !== 'single' && key !== 'maybeSingle') {
        chain[key].mockReturnValue(chain);
      }
    });
    
    return chain;
  };

  return {
    supabase: {
      from: jest.fn(() => createMockChain()),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ data: null, error: null }),
          download: jest.fn().mockResolvedValue({ data: null, error: null }),
          remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      },
    },
  };
});

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const mockJobData: JobData = {
  title: 'Kitchen Faucet Repair',
  description: 'Leaky kitchen faucet needs professional repair',
  budget: 150,
  category: 'Plumbing',
  subcategory: 'Faucet Repair',
  priority: 'high',
  location: '123 Main Street, Anytown, USA',
  homeowner_id: 'homeowner-1',
  photos: ['photo1.jpg'],
};

const mockJob: Job = {
  id: 'test-job-1',
  ...mockJobData,
  status: 'posted',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    } as any);
  });

  describe('createJob', () => {
    it('creates a new job successfully', async () => {
      const result = await JobService.createJob(mockJobData);

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(result).toEqual(mockJob);
    });

    it('handles creation errors', async () => {
      const error = { message: 'Database error' };
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error }),
      } as any);

      await expect(JobService.createJob(mockJobData)).rejects.toThrow(
        'Database error'
      );
    });

    it('validates required fields', async () => {
      const invalidJobData = { ...mockJobData, title: '' };

      await expect(JobService.createJob(invalidJobData)).rejects.toThrow(
        'Title is required'
      );
    });

    it('validates budget is positive', async () => {
      const invalidJobData = { ...mockJobData, budget: -50 };

      await expect(JobService.createJob(invalidJobData)).rejects.toThrow(
        'Budget must be positive'
      );
    });
  });

  describe('getJobs', () => {
    it('fetches jobs successfully', async () => {
      const mockJobs = [mockJob, { ...mockJob, id: 'job-2' }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      } as any);

      const result = await JobService.getJobs();

      expect(result).toEqual(mockJobs);
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
    });

    it('filters jobs by status', async () => {
      await JobService.getJobs('posted');

      const mockQuery = mockSupabase.from().select().eq();
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'posted');
    });

    it('applies limit when provided', async () => {
      await JobService.getJobs(undefined, 10);

      const mockQuery = mockSupabase.from().select().order().limit();
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getJobById', () => {
    it('fetches job by ID successfully', async () => {
      const result = await JobService.getJobById('test-job-1');

      expect(result).toEqual(mockJob);
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
    });

    it('returns null for non-existent job', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await JobService.getJobById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('updates job successfully', async () => {
      const updates = { title: 'Updated Title', budget: 200 };
      const updatedJob = { ...mockJob, ...updates };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedJob, error: null }),
      } as any);

      const result = await JobService.updateJob('test-job-1', updates);

      expect(result).toEqual(updatedJob);
    });

    it('prevents status updates to invalid values', async () => {
      const updates = { status: 'invalid-status' as any };

      await expect(JobService.updateJob('test-job-1', updates)).rejects.toThrow(
        'Invalid status'
      );
    });
  });

  describe('deleteJob', () => {
    it('deletes job successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      await JobService.deleteJob('test-job-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
    });

    it('handles deletion errors', async () => {
      const error = { message: 'Cannot delete job with active bids' };
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error }),
      } as any);

      await expect(JobService.deleteJob('test-job-1')).rejects.toThrow(
        'Cannot delete job with active bids'
      );
    });
  });

  describe('searchJobs', () => {
    it('searches jobs by query', async () => {
      const mockJobs = [mockJob];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      } as any);

      const result = await JobService.searchJobs('kitchen repair');

      expect(result).toEqual(mockJobs);
    });

    it('filters by category', async () => {
      await JobService.searchJobs('repair', { category: 'Plumbing' });

      const mockQuery = mockSupabase.from().select().textSearch();
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'Plumbing');
    });

    it('filters by budget range', async () => {
      await JobService.searchJobs('repair', {
        minBudget: 100,
        maxBudget: 500,
      });

      const mockQuery = mockSupabase.from().select().textSearch();
      expect(mockQuery.gte).toHaveBeenCalledWith('budget', 100);
      expect(mockQuery.lte).toHaveBeenCalledWith('budget', 500);
    });
  });

  describe('getJobsByUser', () => {
    it('fetches jobs by homeowner', async () => {
      const mockJobs = [mockJob];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      } as any);

      const result = await JobService.getJobsByUser('homeowner-1', 'homeowner');

      expect(result).toEqual(mockJobs);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
        'homeowner_id',
        'homeowner-1'
      );
    });

    it('fetches jobs by contractor through bids', async () => {
      const mockJobs = [mockJob];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      } as any);

      const result = await JobService.getJobsByUser(
        'contractor-1',
        'contractor'
      );

      expect(result).toEqual(mockJobs);
    });
  });
});
