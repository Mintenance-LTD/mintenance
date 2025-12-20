/**
 * Example: API Route Testing with Vitest
 * Demonstrates testing Next.js 16 API route handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/jobs/route';
import { mockJob, mockUser, mockSupabaseQuery } from '../utils';

// Mock Supabase
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  getServerSession: vi.fn(),
  requireAuth: vi.fn(),
}));

describe('Jobs API Route', () => {
  const mockRequest = (options: any = {}) => ({
    headers: new Headers(options.headers || {}),
    json: async () => options.body || {},
    method: options.method || 'GET',
    url: options.url || 'http://localhost:3000/api/jobs',
    nextUrl: {
      searchParams: new URLSearchParams(options.searchParams || {}),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('should return all jobs', async () => {
      const mockJobs = [
        mockJob({ id: 'job-1' }),
        mockJob({ id: 'job-2' }),
      ];

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseQuery.success(mockJobs)),
        }),
      });

      const request = mockRequest();
      const response = await GET(request as any);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobs).toHaveLength(2);
      expect(data.jobs[0].id).toBe('job-1');
    });

    it('should filter jobs by status', async () => {
      const mockJobs = [mockJob({ status: 'posted' })];

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseQuery.success(mockJobs)),
        }),
      });

      const request = mockRequest({
        searchParams: { status: 'posted' },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].status).toBe('posted');

      // Verify the correct query was made
      expect(serverSupabase.from).toHaveBeenCalledWith('jobs');
    });

    it('should filter jobs by category', async () => {
      const mockJobs = [mockJob({ category: 'plumbing' })];

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseQuery.success(mockJobs)),
        }),
      });

      const request = mockRequest({
        searchParams: { category: 'plumbing' },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobs[0].category).toBe('plumbing');
    });

    it('should handle pagination', async () => {
      const mockJobs = Array.from({ length: 10 }, (_, i) =>
        mockJob({ id: `job-${i}` })
      );

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue(
            mockSupabaseQuery.success(mockJobs.slice(0, 5))
          ),
        }),
      });

      const request = mockRequest({
        searchParams: { page: '1', limit: '5' },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.jobs).toHaveLength(5);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 5,
        total: expect.any(Number),
      });
    });

    it('should handle database errors gracefully', async () => {
      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(
            mockSupabaseQuery.error('Database error')
          ),
        }),
      });

      const request = mockRequest();
      const response = await GET(request as any);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a new job', async () => {
      const newJob = {
        title: 'Fix leaking tap',
        description: 'Kitchen tap is leaking',
        category: 'plumbing',
        budget: 150,
      };

      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner());

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              mockSupabaseQuery.success({ id: 'new-job-123', ...newJob })
            ),
          }),
        }),
      });

      const request = mockRequest({
        method: 'POST',
        body: newJob,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.job.title).toBe(newJob.title);
      expect(data.job.id).toBe('new-job-123');
    });

    it('should validate required fields', async () => {
      const invalidJob = {
        description: 'Missing title',
      };

      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner());

      const request = mockRequest({
        method: 'POST',
        body: invalidJob,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('title');
    });

    it('should require authentication', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockRejectedValue(new Error('Unauthorized'));

      const request = mockRequest({
        method: 'POST',
        body: { title: 'Test' },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(401);
    });

    it('should validate budget is a positive number', async () => {
      const invalidJob = {
        title: 'Test Job',
        category: 'plumbing',
        budget: -50,
      };

      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner());

      const request = mockRequest({
        method: 'POST',
        body: invalidJob,
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('budget');
    });
  });

  describe('PUT /api/jobs', () => {
    it('should update an existing job', async () => {
      const updatedData = {
        title: 'Updated Title',
        budget: 200,
      };

      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner());

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                mockSupabaseQuery.success({ id: 'job-123', ...updatedData })
              ),
            }),
          }),
        }),
      });

      const request = mockRequest({
        method: 'PUT',
        body: { id: 'job-123', ...updatedData },
      });

      const response = await PUT(request as any);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.job.title).toBe(updatedData.title);
    });

    it('should prevent updating other users jobs', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner({ id: 'user-1' }));

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              mockSupabaseQuery.success(
                mockJob({ homeowner_id: 'user-2' }) // Different user
              )
            ),
          }),
        }),
      });

      const request = mockRequest({
        method: 'PUT',
        body: { id: 'job-123', title: 'Hacked' },
      });

      const response = await PUT(request as any);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/jobs', () => {
    it('should delete a job', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner({ id: 'user-1' }));

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              mockSupabaseQuery.success(
                mockJob({ id: 'job-123', homeowner_id: 'user-1' })
              )
            ),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseQuery.success({})),
        }),
      });

      const request = mockRequest({
        method: 'DELETE',
        body: { id: 'job-123' },
      });

      const response = await DELETE(request as any);

      expect(response.status).toBe(200);
    });

    it('should prevent deleting jobs with active bids', async () => {
      const { requireAuth } = await import('@/lib/auth');
      (requireAuth as any).mockResolvedValue(mockUser.homeowner({ id: 'user-1' }));

      const { serverSupabase } = await import('@/lib/api/supabaseServer');
      (serverSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              mockSupabaseQuery.success(
                mockJob({ id: 'job-123', homeowner_id: 'user-1', bid_count: 3 })
              )
            ),
          }),
        }),
      });

      const request = mockRequest({
        method: 'DELETE',
        body: { id: 'job-123' },
      });

      const response = await DELETE(request as any);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('active bids');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = {
        method: 'POST',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      };

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it('should handle missing content-type header', async () => {
      const request = mockRequest({
        method: 'POST',
        body: 'not json',
        headers: {},
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });
  });
});
