import { JobService } from '../../services/JobService';

// Mock only external dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../utils/sanitize', () => ({
  sanitizeText: (text: string) => text,
}));

const { supabase } = require('../../config/supabase');

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
        priority: 'high' as const,
        photos: ['photo1.jpg'],
      };

      const mockResponse = {
        id: 'job-1',
        title: 'Kitchen Repair',
        description: 'Fix leaky faucet',
        location: '123 Main St',
        budget: 150,
        homeowner_id: 'user-1',
        category: 'Plumbing',
        priority: 'high',
        status: 'posted',
        created_at: '2024-01-01T00:00:00Z',
        photos: ['photo1.jpg'],
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResponse, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.createJob(mockJobData);

      expect(supabase.from).toHaveBeenCalledWith('jobs');
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
        priority: 'high' as const,
        photos: [],
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Creation failed')),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(JobService.createJob(mockJobData)).rejects.toThrow('Creation failed');
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

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.getJobsByHomeowner('user-1');

      expect(supabase.from).toHaveBeenCalledWith('jobs');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
    });

    it('should handle fetch errors', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(JobService.getJobsByHomeowner('user-1')).rejects.toThrow('Fetch failed');
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

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

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

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.getJobById('job-1');

      expect(result?.id).toBe('job-1');
    });

    it('should return null when job not found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.getJobById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(JobService.getJobById('job-1')).rejects.toThrow('Database error');
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      const mockJobData = {
        id: 'job-1', 
        status: 'in_progress',
        title: 'Kitchen Repair',
        homeowner_id: 'user-1',
        budget: 150,
      };
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockJobData, 
          error: null 
        }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.updateJobStatus('job-1', 'in_progress');

      expect(result.status).toBe('in_progress');
    });

    it('should handle update errors', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Update failed')),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(JobService.updateJobStatus('job-1', 'completed')).rejects.toThrow('Update failed');
    });
  });

  describe('submitBid', () => {
    it('should submit bid successfully', async () => {
      const mockBid = {
        id: 'bid-1',
        job_id: 'job-1',
        contractor_id: 'user-2',
        amount: 120,
        description: 'I can fix this',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBid, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.submitBid({
        jobId: 'job-1',
        contractorId: 'user-2',
        amount: 120,
        description: 'I can fix this',
      });

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

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBids, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.getBidsByJob('job-1');

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

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await JobService.searchJobs('kitchen');

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Kitchen');
    });
  });

  describe('job lifecycle methods', () => {
    it('should start job', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      await JobService.startJob('job-1');

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      );
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'job-1');
    });

    it('should complete job', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      await JobService.completeJob('job-1');

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'job-1');
    });
  });
});