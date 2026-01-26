import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BidRepository } from '../BidRepository';

describe('BidRepository', () => {
  let repository: BidRepository;
  let mockSupabase: any;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockSupabase = {
      from: vi.fn(() => mockChain),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    repository = new BidRepository(mockSupabase as any);
  });

  describe('getJob', () => {
    it('should query jobs table by id', async () => {
      const mockJob = { id: 'job-123', status: 'posted' };
      mockChain.single.mockResolvedValue({ data: mockJob, error: null });

      const result = await repository.getJob('job-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'job-123');
      expect(result.id).toBe('job-123');
    });

    it('should return null if job not found', async () => {
      mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await repository.getJob('job-123');
      expect(result).toBeNull();
    });
  });

  describe('createBid', () => {
    it('should insert and return new bid', async () => {
      const bidData = { job_id: 'j1', contractor_id: 'c1', amount: 1000 };
      mockChain.single.mockResolvedValue({ data: { ...bidData, id: 'b1' }, error: null });

      const result = await repository.createBid(bidData);

      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
      expect(mockChain.insert).toHaveBeenCalledWith(bidData);
      expect(result.id).toBe('b1');
    });
  });

  describe('updateBidStatus', () => {
    it('should update status and return bid', async () => {
      mockChain.single.mockResolvedValue({ data: { id: 'b1', status: 'accepted' }, error: null });

      const result = await repository.updateBidStatus('b1', 'accepted');

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
      expect(result.status).toBe('accepted');
    });
  });

  describe('buildBidsQuery', () => {
    it('should apply filters and range', () => {
      const params = {
        jobId: 'j1',
        limit: 10,
        offset: 0
      };

      repository.buildBidsQuery(params);

      expect(mockSupabase.from).toHaveBeenCalledWith('bids');
      expect(mockChain.eq).toHaveBeenCalledWith('job_id', 'j1');
      expect(mockChain.range).toHaveBeenCalledWith(0, 9);
    });
  });

  describe('isPhoneVerified', () => {
    it('should return phone_verified status', async () => {
      mockChain.single.mockResolvedValue({ data: { phone_verified: true }, error: null });
      const result = await repository.isPhoneVerified('u1');
      expect(result).toBe(true);
    });
  });
});
