import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobRepository } from '../JobRepository';

describe('JobRepository', () => {
  let repository: JobRepository;
  let mockSupabase: any;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fluent mock for Supabase
    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      // Mock the thenable behavior for await
      then: vi.fn(function (resolve) {
        return Promise.resolve(resolve({ data: null, error: null }));
      }),
    };

    mockSupabase = {
      from: vi.fn(() => mockChain),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    repository = new JobRepository(mockSupabase as any);
  });

  describe('getJob', () => {
    it('should query the jobs table by id', async () => {
      const mockJob = { id: 'job-123', title: 'Test Job' };

      // Configure single() to return the data
      mockChain.single.mockResolvedValue({ data: mockJob, error: null });

      const result = await repository.getJob('job-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'job-123');
      expect(result?.title).toBe('Test Job');
    });

    it('should return null if job is not found (PGRST116)', async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const result = await repository.getJob('job-123');

      expect(result).toBeNull();
    });
  });

  describe('createJob', () => {
    it('should insert a new job and return it', async () => {
      const jobData = { title: 'New Job', homeowner_id: 'user-123' };
      mockChain.single.mockResolvedValue({ data: { ...jobData, id: 'new-id' }, error: null });

      const result = await repository.createJob(jobData as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockChain.insert).toHaveBeenCalledWith(jobData);
      expect(result.id).toBe('new-id');
    });
  });

  describe('deleteJob', () => {
    it('should call delete on the jobs table', async () => {
      // Use mockResolvedValue for the final call in the chain
      mockChain.delete.mockReturnThis();
      mockChain.eq.mockResolvedValue({ error: null });

      await repository.deleteJob('job-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'job-123');
    });
  });

  describe('executeQuery', () => {
    it('should apply order and limit and return data', async () => {
      const mockJobs = [{ id: '1' }, { id: '2' }];
      const query = mockChain; // The "query" passed to executeQuery

      // Mock the chain methods on the passed query
      query.order.mockReturnThis();
      query.limit.mockResolvedValue({ data: mockJobs, error: null });

      const result = await repository.executeQuery(query, 1);

      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(query.limit).toHaveBeenCalledWith(2); // limit + 1
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });
  });
});
