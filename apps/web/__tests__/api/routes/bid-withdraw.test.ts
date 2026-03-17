/**
 * Tests for POST /api/jobs/[id]/bids/[bidId]/withdraw
 * Route: apps/web/app/api/jobs/[id]/bids/[bidId]/withdraw/route.ts
 *
 * Covers: authentication, role restriction (contractor only),
 * bid not found, contractor ownership check, bid must be pending,
 * success path, notification to homeowner, DB error handling.
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

const contractorUser = {
  id: 'contractor-1',
  email: 'contractor@test.com',
  role: 'contractor' as const,
  first_name: 'Test',
  last_name: 'Contractor',
};

const pendingBid = {
  id: 'bid-1',
  job_id: 'job-1',
  contractor_id: 'contractor-1',
  status: 'pending',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(contractorUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.createNotification.mockResolvedValue('notif-1');
}

function setupWithdrawMocks(overrides: {
  bidData?: unknown;
  bidError?: unknown;
  withdrawError?: unknown;
  jobData?: unknown;
} = {}) {
  const bidResult = { data: overrides.bidData ?? pendingBid, error: overrides.bidError ?? null };
  const withdrawError = overrides.withdrawError ?? null;
  const jobData = overrides.jobData ?? { homeowner_id: 'homeowner-1', title: 'Fix sink' };

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'bids') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(bidResult),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: withdrawError }),
        }),
      };
    }
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: jobData, error: null }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: 'Test Contractor', company_name: 'Test Co' },
              error: null,
            }),
          }),
        }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/jobs/[id]/bids/[bidId]/withdraw', () => {
  let POST: typeof import('@/app/api/jobs/[id]/bids/[bidId]/withdraw/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/bids/[bidId]/withdraw/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(401);
  });

  // ---- Role restriction: contractor only ----
  it('should return 403 when user is a homeowner', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'homeowner-1',
      email: 'homeowner@test.com',
      role: 'homeowner',
      first_name: 'Test',
      last_name: 'Homeowner',
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(403);
  });

  // ---- Bid not found ----
  it('should return 404 when bid does not exist', async () => {
    setupWithdrawMocks({ bidData: null, bidError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bad-bid/withdraw');
    const res = await POST(req, segmentData('job-1', 'bad-bid'));
    expect(res.status).toBe(404);
  });

  // ---- Wrong contractor (ownership check) ----
  it('should return 404 when bid belongs to a different contractor', async () => {
    setupWithdrawMocks({
      bidData: { ...pendingBid, contractor_id: 'other-contractor' },
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    // Route returns NotFoundError to avoid leaking existence info
    expect(res.status).toBe(404);
  });

  // ---- Bid not pending ----
  it('should return 400 when bid is already accepted', async () => {
    setupWithdrawMocks({
      bidData: { ...pendingBid, status: 'accepted' },
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('accepted');
  });

  it('should return 400 when bid is already rejected', async () => {
    setupWithdrawMocks({
      bidData: { ...pendingBid, status: 'rejected' },
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('rejected');
  });

  it('should return 400 when bid is already withdrawn', async () => {
    setupWithdrawMocks({
      bidData: { ...pendingBid, status: 'withdrawn' },
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('withdrawn');
  });

  // ---- Success ----
  it('should withdraw bid successfully when pending', async () => {
    setupWithdrawMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('withdrawn');
  });

  // ---- Notifies homeowner ----
  it('should notify the homeowner about the withdrawal', async () => {
    setupWithdrawMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    await POST(req, segmentData('job-1', 'bid-1'));

    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'homeowner-1',
        title: 'Bid Withdrawn',
        type: 'bid_withdrawn',
      }),
    );
  });

  // ---- DB error ----
  it('should return 500 when bid withdrawal update fails', async () => {
    setupWithdrawMocks({ withdrawError: { message: 'DB error' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/withdraw');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(500);
  });
});
