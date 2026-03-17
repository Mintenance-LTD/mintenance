// @vitest-environment node
/**
 * Tests for POST /api/jobs/[id]/review and GET /api/jobs/[id]/review
 * Route: apps/web/app/api/jobs/[id]/review/route.ts
 *
 * Covers: authentication, role restriction (homeowner/contractor only),
 * validation (rating range, comment length), job status must be completed,
 * only participants can review, duplicate review prevention, success path.
 */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  createNotification: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  },
  createRequestScopedClient: () => null, // falls back to serverSupabase in route
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(public code: string, public userMessage: string, public statusCode: number = 500, public details?: unknown) {
      super(userMessage); this.name = 'APIError';
    }
    toResponse() { return { error: { code: this.code, message: this.userMessage }, timestamp: new Date().toISOString() }; }
  }
  class UnauthorizedError extends APIError { constructor(m = 'Unauthorized') { super('UNAUTHORIZED', m, 401); } }
  class ForbiddenError extends APIError { constructor(m = 'Forbidden') { super('FORBIDDEN', m, 403); } }
  class NotFoundError extends APIError { constructor(m = 'Resource not found') { super('NOT_FOUND', m, 404); } }
  class BadRequestError extends APIError { constructor(m = 'Bad Request', d?: unknown) { super('BAD_REQUEST', m, 400, d); } }
  return {
    APIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError,
    handleAPIError: vi.fn((error: unknown) => {
      if (error instanceof APIError) {
        const { NextResponse } = require('next/server');
        return NextResponse.json(error.toResponse(), { status: error.statusCode });
      }
      const { NextResponse } = require('next/server');
      return NextResponse.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }, { status: 500 });
    }),
  };
});

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createPostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
    },
    body: JSON.stringify(body),
  });
}

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'GET',
    headers: { 'x-forwarded-for': '127.0.0.1' },
  });
}

function segmentData(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue({
    id: 'homeowner-1',
    email: 'homeowner@test.com',
    role: 'homeowner',
    first_name: 'Test',
    last_name: 'Homeowner',
  });
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.createNotification.mockResolvedValue(undefined);
}

const completedJob = {
  id: 'job-1',
  homeowner_id: 'homeowner-1',
  contractor_id: 'contractor-1',
  status: 'completed',
  title: 'Fix leaking tap',
};

// Helper to set up supabase mocks per table for POST review flow
function setupReviewMocks(overrides: {
  jobData?: unknown;
  jobError?: unknown;
  existingReview?: unknown;
  insertReturn?: { data: unknown; error: unknown };
  fiveStarCount?: number;
} = {}) {
  const jobResult = { data: overrides.jobData ?? completedJob, error: overrides.jobError ?? null };
  const existingReviewResult = { data: overrides.existingReview ?? null, error: null };
  const insertReturn = overrides.insertReturn ?? { data: { id: 'review-1' }, error: null };

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(jobResult),
          }),
        }),
      };
    }
    if (table === 'reviews') {
      // The route calls reviews table multiple times:
      // 1. Check duplicate: .select('id').eq('job_id').eq('reviewer_id').limit(1).single()
      // 2. Insert: .insert(...).select('id').single()
      // 3. (Optional) Count 5-star: .select('id', { count: 'exact', head: true }).eq().eq()
      return {
        select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string }) => {
          if (opts?.count === 'exact') {
            // 5-star count query
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  count: overrides.fiveStarCount ?? 3,
                  error: null,
                }),
              }),
            };
          }
          // Duplicate check
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(existingReviewResult),
                }),
              }),
            }),
          };
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(insertReturn),
          }),
        }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ---------------------------------------------------------------------------
// Tests: POST /api/jobs/[id]/review
// ---------------------------------------------------------------------------
describe('POST /api/jobs/[id]/review', () => {
  let POST: typeof import('@/app/api/jobs/[id]/review/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/review/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 5,
      comment: 'Great work done by the contractor!',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(401);
  });

  // ---- Role restriction ----
  it('should return 403 when user is admin (not homeowner/contractor)', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 5,
      comment: 'Great work done by the contractor!',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Validation: rating ----
  it('should return 400 when rating is missing', async () => {
    setupReviewMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      comment: 'Great work done by the contractor!',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('Rating must be between 1 and 5');
  });

  it('should return 400 when rating is out of range', async () => {
    setupReviewMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 6,
      comment: 'Great work done by the contractor!',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);
  });

  // ---- Validation: comment ----
  it('should return 400 when comment is too short', async () => {
    setupReviewMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 4,
      comment: 'Too short',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('at least 20 characters');
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupReviewMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/bad-id/review', {
      rating: 5,
      comment: 'This is a long enough review comment for testing.',
    });
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);
  });

  // ---- Job not completed ----
  it('should return 400 when job is not completed', async () => {
    setupReviewMocks({ jobData: { ...completedJob, status: 'in_progress' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 5,
      comment: 'This is a long enough review comment for testing.',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('completed');
  });

  // ---- Only participants can review ----
  it('should return 403 when user is not a participant in the job', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'random-homeowner',
      email: 'rando@test.com',
      role: 'homeowner',
      first_name: 'Random',
      last_name: 'Person',
    });
    setupReviewMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 5,
      comment: 'This is a long enough review comment for testing.',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('participants');
  });

  // ---- Duplicate review ----
  it('should return 400 when user has already reviewed this job', async () => {
    setupReviewMocks({ existingReview: { id: 'existing-review-1' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 5,
      comment: 'This is a long enough review comment for testing.',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('already reviewed');
  });

  // ---- Success: homeowner reviews contractor ----
  it('should successfully create a review from homeowner', async () => {
    setupReviewMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 5,
      comment: 'Excellent work done by the contractor, very thorough!',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reviewId).toBe('review-1');
    expect(body.message).toContain('submitted successfully');
  });

  // ---- Success: contractor reviews homeowner ----
  it('should successfully create a review from contractor', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'contractor-1',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Test',
      last_name: 'Contractor',
    });
    setupReviewMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/review', {
      rating: 4,
      comment: 'Great homeowner, very communicative throughout!',
    });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: GET /api/jobs/[id]/review
// ---------------------------------------------------------------------------
describe('GET /api/jobs/[id]/review', () => {
  let GET: typeof import('@/app/api/jobs/[id]/review/route').GET;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/review/route');
    GET = mod.GET;
  });

  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/review');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(401);
  });

  it('should return reviews for the authenticated user', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'r-1', rating: 5, comment: 'Great!', created_at: '2026-01-01T00:00:00Z' }],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/review');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].rating).toBe(5);
  });

  it('should return empty reviews when none exist', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/review');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.reviews).toEqual([]);
  });
});
