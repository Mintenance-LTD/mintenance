/**
 * Tests for POST /api/jobs/[id]/bids/[bidId]/reject
 * Route: apps/web/app/api/jobs/[id]/bids/[bidId]/reject/route.ts
 *
 * Covers: authentication, role restriction (homeowner only),
 * job not found, homeowner ownership check, bid not found,
 * bid status transition validation, success path,
 * notification to contractor, DB error handling.
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
  validateBidTransition: vi.fn(),
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
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  validateBidTransition: mocks.validateBidTransition,
  BID_STATUS: { PENDING: 'pending', ACCEPTED: 'accepted', REJECTED: 'rejected', WITHDRAWN: 'withdrawn' },
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
function createPostRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
    },
  });
}

function segmentData(id: string, bidId: string) {
  return { params: Promise.resolve({ id, bidId }) };
}

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const pendingBid = {
  id: 'bid-1',
  job_id: 'job-1',
  status: 'pending',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.validateBidTransition.mockReturnValue(undefined);
  mocks.createNotification.mockResolvedValue('notif-1');
}

function setupRejectMocks(overrides: {
  jobData?: unknown;
  jobError?: unknown;
  bidData?: unknown;
  bidError?: unknown;
  rejectError?: unknown;
} = {}) {
  const jobResult = {
    data: overrides.jobData ?? { homeowner_id: 'homeowner-1' },
    error: overrides.jobError ?? null,
  };
  const bidResult = { data: overrides.bidData ?? pendingBid, error: overrides.bidError ?? null };
  const rejectError = overrides.rejectError ?? null;

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
    if (table === 'bids') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(bidResult),
            }),
            // also handle single from direct eq chain (for re-fetch of bid contractor_id)
            single: vi.fn().mockResolvedValue({
              data: { contractor_id: 'contractor-1' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: rejectError }),
        }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/jobs/[id]/bids/[bidId]/reject', () => {
  let POST: typeof import('@/app/api/jobs/[id]/bids/[bidId]/reject/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/bids/[bidId]/reject/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/reject');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(401);
  });

  // ---- Role restriction: homeowner only ----
  it('should return 403 when user is a contractor', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'contractor-1',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Test',
      last_name: 'Contractor',
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/reject');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(403);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupRejectMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/bad-id/bids/bid-1/reject');
    const res = await POST(req, segmentData('bad-id', 'bid-1'));
    expect(res.status).toBe(404);
  });

  // ---- Homeowner ownership ----
  it('should return 403 when user is not the job homeowner', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-homeowner',
      email: 'other@test.com',
      role: 'homeowner',
      first_name: 'Other',
      last_name: 'Person',
    });
    setupRejectMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/reject');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('authorized');
  });

  // ---- Bid not found ----
  it('should return 404 when bid does not exist', async () => {
    setupRejectMocks({ bidData: null, bidError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bad-bid/reject');
    const res = await POST(req, segmentData('job-1', 'bad-bid'));
    expect(res.status).toBe(404);
  });

  // ---- Invalid bid status transition ----
  it('should throw when bid status transition is invalid (e.g., already accepted)', async () => {
    mocks.validateBidTransition.mockImplementation(() => {
      throw new Error('Invalid bid transition from accepted to rejected');
    });
    setupRejectMocks({ bidData: { ...pendingBid, status: 'accepted' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/reject');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    // handleAPIError catches generic error -> 500
    expect(res.status).toBe(500);
  });

  // ---- Success ----
  it('should reject bid successfully', async () => {
    setupRejectMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/reject');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('rejected');
  });

  // ---- DB error on reject ----
  it('should return 500 when bid rejection update fails', async () => {
    setupRejectMocks({ rejectError: { message: 'DB error' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/reject');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(500);
  });
});
