// @vitest-environment node
/**
 * Tests for GET /api/jobs/[id]/bids
 * Route: apps/web/app/api/jobs/[id]/bids/route.ts
 *
 * Covers: authentication, authorization (homeowner only + admin),
 * job not found, successful bid listing with contractor ratings,
 * status filter, empty bids.
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
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/jobs/[id]/bids', () => {
  let GET: typeof import('@/app/api/jobs/[id]/bids/route').GET;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/bids/route');
    GET = mod.GET;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/bids');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(401);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/bad-id/bids');
    const res = await GET(req, segmentData('bad-id'));
    expect(res.status).toBe(404);
  });

  // ---- Authorization: only homeowner ----
  it('should return 403 when user is not the job homeowner', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-user',
      email: 'other@test.com',
      role: 'homeowner',
      first_name: 'Other',
      last_name: 'User',
    });

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/bids');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Admin can view bids ----
  it('should allow admin to view bids for any job', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
    });

    const mockBids = [
      {
        id: 'bid-1',
        job_id: 'job-1',
        contractor_id: 'contractor-1',
        amount: 200,
        description: 'I can fix this',
        status: 'pending',
        estimated_duration_days: 2,
        materials_included: true,
        warranty_months: 12,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        contractor: { id: 'contractor-1', first_name: 'John', last_name: 'Doe' },
        job: { id: 'job-1', title: 'Fix tap', category: 'plumbing', status: 'posted', budget: 300 },
      },
    ];

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'bids') {
        // The bids query uses .eq().order() then potentially another .eq() for status filter
        const chain = {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockBids, error: null }),
          }),
        };
        return {
          select: vi.fn().mockReturnValue(chain),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ reviewee_id: 'contractor-1', rating: 4 }, { reviewee_id: 'contractor-1', rating: 5 }],
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/bids');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.bids).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.bids[0].message).toBe('I can fix this');
    expect(body.bids[0].contractorRating).toBe(4.5);
    expect(body.bids[0].contractorReviewCount).toBe(2);
  });

  // ---- Success: empty bids ----
  it('should return empty bids array when job has no bids', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'bids') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/bids');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.bids).toEqual([]);
    expect(body.total).toBe(0);
  });

  // ---- Success: homeowner sees bids with ratings ----
  it('should return enriched bids with contractor ratings for the homeowner', async () => {
    const mockBids = [
      {
        id: 'bid-1',
        job_id: 'job-1',
        contractor_id: 'c-1',
        amount: 150,
        description: 'Quick fix',
        status: 'pending',
        estimated_duration_days: 1,
        materials_included: false,
        warranty_months: 6,
        created_at: '2026-01-10T00:00:00Z',
        updated_at: '2026-01-10T00:00:00Z',
        contractor: { id: 'c-1', first_name: 'Alice', last_name: 'Builder' },
        job: { id: 'job-1', title: 'Leaky pipe', category: 'plumbing', status: 'posted', budget: 200 },
      },
      {
        id: 'bid-2',
        job_id: 'job-1',
        contractor_id: 'c-2',
        amount: 180,
        description: 'Thorough fix with warranty',
        status: 'pending',
        estimated_duration_days: 2,
        materials_included: true,
        warranty_months: 24,
        created_at: '2026-01-11T00:00:00Z',
        updated_at: '2026-01-11T00:00:00Z',
        contractor: { id: 'c-2', first_name: 'Bob', last_name: 'Plumber' },
        job: { id: 'job-1', title: 'Leaky pipe', category: 'plumbing', status: 'posted', budget: 200 },
      },
    ];

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'bids') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockBids, error: null }),
            }),
          }),
        };
      }
      if (table === 'reviews') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { reviewee_id: 'c-1', rating: 5 },
                { reviewee_id: 'c-1', rating: 4 },
                { reviewee_id: 'c-2', rating: 3 },
              ],
              error: null,
            }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/bids');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.bids).toHaveLength(2);
    expect(body.total).toBe(2);

    // First bid contractor: avg (5+4)/2 = 4.5
    expect(body.bids[0].contractorRating).toBe(4.5);
    expect(body.bids[0].contractorReviewCount).toBe(2);
    expect(body.bids[0].contractor.rating).toBe(4.5);

    // Second bid contractor: avg 3/1 = 3
    expect(body.bids[1].contractorRating).toBe(3);
    expect(body.bids[1].contractorReviewCount).toBe(1);
  });
});
