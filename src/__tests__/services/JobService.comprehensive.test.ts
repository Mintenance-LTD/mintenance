import { JobService } from '../../services/JobService';
import { Job, Bid } from '../../types';
import { supabase } from '../../config/supabase';

// Mock supabase
jest.mock('../../config/supabase');

const mockSupabase = supabase as any;

describe('JobService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      mockResolvedValue: jest.fn().mockResolvedValue({ data: null, error: null }),
      mockResolvedValueOnce: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe('createJob', () => {
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

    it('should create a job successfully', async () => {
      const mockCreatedJob = {
        id: 'job-1',
        title: mockJobData.title,
        description: mockJobData.description,
        location: mockJobData.location,
        budget: mockJobData.budget,
        homeowner_id: mockJobData.homeownerId,
        category: mockJobData.category,
        priority: mockJobData.priority,
        photos: mockJobData.photos,
        status: 'posted',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedJob,
        error: null
      });

      const result = await JobService.createJob(mockJobData);

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(result).toEqual(expect.objectContaining({
        id: 'job-1',
        title: 'Kitchen Repair',
        homeownerId: 'user-1',
        status: 'posted'
      }));
    });

    it('should throw error when creation fails', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' }
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
          homeowner_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'job-2', 
          title: 'Bathroom Fix',
          homeowner_id: 'user-1',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.getJobsByHomeowner('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
      expect(result[1].id).toBe('job-2');
    });

    it('should throw error when fetch fails', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      });

      await expect(JobService.getJobsByHomeowner('user-1')).rejects.toThrow('Fetch failed');
    });
  });

  describe('getAvailableJobs', () => {
    it('should fetch available jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'posted',
          created_at: '2024-01-01T00:00:00Z'
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
        status: 'posted'
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockJob,
        error: null
      });

      const result = await JobService.getJobById('job-1');

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('id', 'job-1');
      expect(result?.id).toBe('job-1');
    });

    it('should return null when job not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await JobService.getJobById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(JobService.getJobById('job-1')).rejects.toThrow('Database error');
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
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

    it('should update status without contractor', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      await JobService.updateJobStatus('job-1', 'completed');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed'
        })
      );
      expect(mockSupabase.from().update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_id: expect.anything()
        })
      );
    });

    it('should throw error when update fails', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: { message: 'Update failed' }
      });

      await expect(JobService.updateJobStatus('job-1', 'completed')).rejects.toThrow('Update failed');
    });
  });

  describe('Bid Management', () => {
    describe('submitBid', () => {
      const mockBidData = {
        jobId: 'job-1',
        contractorId: 'contractor-1',
        amount: 150,
        description: 'I can fix this quickly'
      };

      it('should submit bid successfully', async () => {
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
        expect(result).toEqual(expect.objectContaining({
          id: 'bid-1',
          jobId: 'job-1',
          contractorId: 'contractor-1',
          amount: 150
        }));
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
            contractor: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
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

    describe('acceptBid', () => {
      it('should accept bid and update job status', async () => {
        // Mock the bid fetch
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { job_id: 'job-1', contractor_id: 'contractor-1' },
          error: null
        });

        // Mock bid status update
        mockSupabase.from().update().eq.mockResolvedValueOnce({
          error: null
        });

        // Mock job update
        mockSupabase.from().update().eq.mockResolvedValueOnce({
          error: null
        });

        // Mock reject other bids
        mockSupabase.from().update().eq().neq.mockResolvedValueOnce({
          error: null
        });

        await JobService.acceptBid('bid-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('bids');
        expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      });

      it('should throw error if bid not found', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: null,
          error: { message: 'Bid not found' }
        });

        await expect(JobService.acceptBid('nonexistent')).rejects.toThrow('Bid not found');
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
          category: 'Plumbing'
        }
      ];

      mockSupabase.from().select().or().eq().order().limit.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.searchJobs('kitchen', 10);

      expect(mockSupabase.from().select().or).toHaveBeenCalledWith(
        expect.stringContaining('kitchen')
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Kitchen Plumbing');
    });
  });

  describe('getJobs with pagination', () => {
    it('should fetch jobs with pagination', async () => {
      const mockJobs = [
        { id: 'job-1', title: 'Job 1' },
        { id: 'job-2', title: 'Job 2' }
      ];

      mockSupabase.from().select().order().range.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.getJobs(20, 10);

      expect(mockSupabase.from().select().order().range).toHaveBeenCalledWith(10, 29);
      expect(result).toHaveLength(2);
    });
  });

  describe('Job lifecycle methods', () => {
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

  describe('getJobsByStatus', () => {
    it('should fetch jobs by status', async () => {
      const mockJobs = [
        { id: 'job-1', status: 'in_progress' }
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.getJobsByStatus('in_progress');

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('status', 'in_progress');
      expect(result).toHaveLength(1);
    });

    it('should fetch jobs by status for specific user', async () => {
      const mockJobs = [
        { id: 'job-1', status: 'in_progress', homeowner_id: 'user-1' }
      ];

      mockSupabase.from().select().eq().or().order.mockResolvedValue({
        data: mockJobs,
        error: null
      });

      const result = await JobService.getJobsByStatus('in_progress', 'user-1');

      expect(mockSupabase.from().select().eq().or).toHaveBeenCalledWith(
        'homeowner_id.eq.user-1,contractor_id.eq.user-1'
      );
      expect(result).toHaveLength(1);
    });
  });
});