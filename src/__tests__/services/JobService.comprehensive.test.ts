import { JobService } from '../../services/JobService';
import { Job, Bid } from '../../types';
import { supabase } from '../../config/supabase';

// Use global Supabase mock from jest-setup.js
// Use a chainable manual mock to ensure method chaining works when mutating leaf fns
const configPath = require.resolve('../../config/supabase');
jest.mock(configPath, () => require('../../config/__mocks__/supabase'));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('JobService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test helper: setup mock responses
  const setupMockChain = (returnValue: any) => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(returnValue),
      maybeSingle: jest.fn().mockResolvedValue(returnValue),
    };
    (mockSupabase.from as jest.Mock).mockReturnValue(mockChain);
    return mockChain;
  };

  describe('createJob', () => {
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
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedJob, error: null }),
      } as any);

      const result = await JobService.createJob(mockJobData);

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
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
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        }),
      };
      mockSupabase.from.mockReturnValue(mockChain);

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

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      } as any);

      const result = await JobService.getJobsByHomeowner('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
      expect(result[1].id).toBe('job-2');
    });

    it('should throw error when fetch fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch failed' },
        }),
      } as any);

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

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
      } as any);

      const result = await JobService.getAvailableJobs();

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
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

      setupMockChain({ data: mockJob, error: null });

      const result = await JobService.getJobById('job-1');

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
        'id',
        'job-1'
      );
      expect(result?.id).toBe('job-1');
    });

    it('should return null when job not found', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        });

      const result = await JobService.getJobById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for other errors', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(JobService.getJobById('job-1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      setupMockChain({ data: { id: 'job-1', status: 'in_progress', title: 'Kitchen Repair', homeowner_id: 'user-1', budget: 150 }, error: null });

      await JobService.updateJobStatus('job-1', 'in_progress', 'contractor-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          contractor_id: 'contractor-1',
        })
      );
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith(
        'id',
        'job-1'
      );
    });

    it('should update status without contractor', async () => {
      setupMockChain({ data: { id: 'job-1', status: 'in_progress', title: 'Kitchen Repair', homeowner_id: 'user-1', budget: 150 }, error: null });

      setupMockChain({ data: { id: 'job-1', status: 'completed', title: 'Kitchen Repair', homeowner_id: 'user-1', budget: 150 }, error: null });

      await JobService.updateJobStatus('job-1', 'completed');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
      expect(mockSupabase.from().update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_id: expect.anything(),
        })
      );
    });

    it('should throw error when update fails', async () => {
      const ch = setupMockChain({ data: null, error: null }) as any;
      ch.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

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
        const mockBid = {
          id: 'bid-1',
          job_id: 'job-1',
          contractor_id: 'contractor-1',
          amount: 150,
          description: 'I can fix this quickly',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        };

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockBid,
          error: null,
        });

        const result = await JobService.submitBid(mockBidData);

        expect(mockSupabase.from).toHaveBeenCalledWith('bids');
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

        const chB = setupMockChain({ data: null, error: null }) as any;
        chB.order.mockResolvedValue({ data: mockBids, error: null });

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
        const ch2 = setupMockChain({ data: { job_id: 'job-1', contractor_id: 'contractor-1' }, error: null }) as any;

        // Mock bid status update
        // eq resolves implicitly via await on chain
        // (no explicit mock needed)
        //

        // Mock job update
        // eq resolves implicitly via await on chain
        // (no explicit mock needed)
        //

        // Mock reject other bids
        (ch2.neq as any).mockResolvedValue({
          error: null,
        });

        await JobService.acceptBid('bid-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('bids');
        expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      });

      it('should throw error if bid not found', async () => {
        setupMockChain({ data: null, error: { message: 'Bid not found' } });

        await expect(JobService.acceptBid('nonexistent')).rejects.toThrow(
          'Bid not found'
        );
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

      const ch3 = setupMockChain({ data: null, error: null }) as any;
      ch3.limit.mockResolvedValue({ data: mockJobs, error: null });

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
        { id: 'job-2', title: 'Job 2' },
      ];

      const ch4 = setupMockChain({ data: null, error: null }) as any;
      ch4.range.mockResolvedValue({ data: mockJobs, error: null });

      const result = await JobService.getJobs(20, 10);

      expect(mockSupabase.from().select().order().range).toHaveBeenCalledWith(
        10,
        29
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('Job lifecycle methods', () => {
    it('should start job', async () => {
      setupMockChain({ data: { id: 'job-1', status: 'in_progress', title: 'Kitchen Repair', homeowner_id: 'user-1', budget: 150 }, error: null });

      await JobService.startJob('job-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        })
      );
    });

    it('should complete job', async () => {
      setupMockChain({ data: { id: 'job-1', status: 'in_progress', title: 'Kitchen Repair', homeowner_id: 'user-1', budget: 150 }, error: null });

      await JobService.completeJob('job-1');

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  describe('getJobsByStatus', () => {
    it('should fetch jobs by status', async () => {
      const mockJobs = [{ id: 'job-1', status: 'in_progress' }];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: mockJobs,
        error: null,
      });

      const result = await JobService.getJobsByStatus('in_progress');

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
        'status',
        'in_progress'
      );
      expect(result).toHaveLength(1);
    });

    it('should fetch jobs by status for specific user', async () => {
      const mockJobs = [
        { id: 'job-1', status: 'in_progress', homeowner_id: 'user-1' },
      ];

      const ch6 = setupMockChain({ data: null, error: null }) as any;
      ch6.order.mockResolvedValue({ data: mockJobs, error: null });

      const result = await JobService.getJobsByStatus('in_progress', 'user-1');

      expect(mockSupabase.from().select().eq().or).toHaveBeenCalledWith(
        'homeowner_id.eq.user-1,contractor_id.eq.user-1'
      );
      expect(result).toHaveLength(1);
    });
  });
});





