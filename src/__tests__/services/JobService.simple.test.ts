import { JobService } from '../../services/JobService';

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      neq: jest.fn().mockReturnThis(),
    }))
  }
}));

import { supabase } from '../../config/supabase';

const mockSupabase = supabase as any;

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
        photos: ['photo1.jpg']
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
        photos: ['photo1.jpg'],
        status: 'posted',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await JobService.createJob(mockJobData);

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(result.id).toBe('job-1');
      expect(result.title).toBe('Kitchen Repair');
      expect(result.homeownerId).toBe('user-1');
      expect(result.status).toBe('posted');
    });

    it('should throw error when creation fails', async () => {
      const mockJobData = {
        title: 'Kitchen Repair',
        description: 'Fix leaky faucet',
        location: '123 Main St',
        budget: 150,
        homeownerId: 'user-1'
      };

      const error = new Error('Creation failed');
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: error
      });

      await expect(JobService.createJob(mockJobData)).rejects.toThrow('Creation failed');
    });
  });

  describe('getJobsByHomeowner', () => {
    it('should fetch jobs for homeowner', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Repair',
          description: 'Fix faucet',
          location: '123 Main St',
          budget: 150,
          homeowner_id: 'user-1',
          status: 'posted',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.getJobsByHomeowner('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('job-1');
      expect(result[0].homeownerId).toBe('user-1');
    });

    it('should throw error when fetch fails', async () => {
      const error = new Error('Fetch failed');
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: error
      });

      await expect(JobService.getJobsByHomeowner('user-1')).rejects.toThrow('Fetch failed');
    });
  });

  describe('getAvailableJobs', () => {
    it('should fetch available jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Plumbing Job',
          description: 'Fix pipes',
          location: '456 Oak St',
          budget: 200,
          homeowner_id: 'user-2',
          status: 'posted',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.getAvailableJobs();

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('status', 'posted');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('posted');
    });
  });

  describe('getJobById', () => {
    it('should fetch job by id', async () => {
      const mockJob = {
        id: 'job-1',
        title: 'Kitchen Repair',
        description: 'Fix faucet',
        location: '123 Main St',
        budget: 150,
        homeowner_id: 'user-1',
        status: 'posted',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockJob,
        error: null
      });

      const result = await JobService.getJobById('job-1');

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('id', 'job-1');
      expect(result?.id).toBe('job-1');
      expect(result?.title).toBe('Kitchen Repair');
    });

    it('should return null when job not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await JobService.getJobById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      const error = new Error('Database error');
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: error
      });

      await expect(JobService.getJobById('job-1')).rejects.toThrow('Database error');
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      await JobService.updateJobStatus('job-1', 'in_progress', 'contractor-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          contractor_id: 'contractor-1'
        })
      );
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', 'job-1');
    });

    it('should throw error when update fails', async () => {
      const error = new Error('Update failed');
      mockSupabase.from().update().eq.mockResolvedValue({
        error: error
      });

      await expect(JobService.updateJobStatus('job-1', 'completed')).rejects.toThrow('Update failed');
    });
  });

  describe('submitBid', () => {
    it('should submit bid successfully', async () => {
      const mockBidData = {
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150,
        description: 'I can fix this quickly'
      };

      const mockBid = {
        id: 'bid-1',
        job_id: 'job-1',
        contractor_id: 'contractor-1',
        amount: 150,
        description: 'I can fix this quickly',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockBid,
        error: null
      });

      const result = await JobService.submitBid(mockBidData);

      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
      expect(result.id).toBe('bid-1');
      expect(result.jobId).toBe('job-1');
      expect(result.contractorId).toBe('contractor-1');
      expect(result.amount).toBe(150);
    });
  });

  describe('getBidsByJob', () => {
    it('should fetch bids for a job', async () => {
      const mockBids = [
        {
          id: 'bid-1',
          job_id: 'job-1',
          contractor_id: 'contractor-1',
          amount: 150,
          description: 'Quick fix',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          contractor: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          }
        }
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockBids,
        error: null
      });

      const result = await JobService.getBidsByJob('job-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
      expect(result).toHaveLength(1);
      expect(result[0].contractorName).toBe('John Doe');
      expect(result[0].contractorEmail).toBe('john@example.com');
    });
  });

  describe('searchJobs', () => {
    it('should search jobs by query', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Kitchen Plumbing',
          description: 'Fix kitchen sink',
          location: 'Kitchen area',
          budget: 150,
          homeowner_id: 'user-1',
          category: 'Plumbing',
          status: 'posted',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from().select().or().eq().order().limit.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.searchJobs('kitchen', 10);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Kitchen Plumbing');
    });
  });

  describe('job lifecycle methods', () => {
    it('should start job', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      await JobService.startJob('job-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress'
        })
      );
    });

    it('should complete job', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      await JobService.completeJob('job-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed'
        })
      );
    });
  });
});