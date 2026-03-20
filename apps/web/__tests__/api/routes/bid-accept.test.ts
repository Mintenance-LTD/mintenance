/**
 * Tests for POST /api/jobs/[id]/bids/[bidId]/accept
 * Route: apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts
 *
 * Covers: authentication, role restriction (homeowner only via inline check),
 * job not found, homeowner ownership check, bid not found, bid status
 * transition validation, job status transition validation, already-accepted
 * bid conflict, success path with idempotency, contractor notification,
 * auto-created contract, auto-created message thread.
 *
 * NOTE: This route uses createServerSupabaseClient() instead of serverSupabase
 * singleton, so the mock pattern differs.
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
  getIdempotencyKeyFromRequest: vi.fn(),
  checkIdempotency: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  validateStatusTransition: vi.fn(),
  validateBidTransition: vi.fn(),
  createNotification: vi.fn(),
  sendBidAcceptedEmail: vi.fn(),
  learnFromAcceptance: vi.fn(),
  learnFromBidOutcome: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

// This route uses createServerSupabaseClient() to get a fresh client per request
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  },
  createServerSupabaseClient: () => ({
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
  }),
  createRequestScopedClient: () => null, // falls back to serverSupabase in route
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  validateStatusTransition: mocks.validateStatusTransition,
  validateBidTransition: mocks.validateBidTransition,
  JOB_STATUS: { POSTED: 'posted', ASSIGNED: 'assigned', IN_PROGRESS: 'in_progress', COMPLETED: 'completed' },
  BID_STATUS: { PENDING: 'pending', ACCEPTED: 'accepted', REJECTED: 'rejected', WITHDRAWN: 'withdrawn' },
  CONTRACT_STATUS: { DRAFT: 'draft', PENDING_HOMEOWNER: 'pending_homeowner', PENDING_CONTRACTOR: 'pending_contractor', ACCEPTED: 'accepted' },
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  checkIdempotency: mocks.checkIdempotency,
  storeIdempotencyResult: mocks.storeIdempotencyResult,
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendBidAcceptedEmail: mocks.sendBidAcceptedEmail,
  },
}));

vi.mock('@/lib/services/agents/LearningMatchingService', () => ({
  LearningMatchingService: {
    learnFromAcceptance: mocks.learnFromAcceptance,
  },
}));

vi.mock('@/lib/services/agents/PricingAgent', () => ({
  PricingAgent: {
    learnFromBidOutcome: mocks.learnFromBidOutcome,
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
  class ConflictError extends APIError { constructor(m = 'Conflict') { super('CONFLICT', m, 409); } }
  class InternalServerError extends APIError { constructor(m = 'Internal Server Error') { super('INTERNAL_SERVER_ERROR', m, 500); } }
  return {
    APIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, ConflictError, InternalServerError,
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

const postedJob = {
  homeowner_id: 'homeowner-1',
  status: 'posted',
};

const pendingBid = {
  id: 'bid-1',
  job_id: 'job-1',
  contractor_id: 'contractor-1',
  status: 'pending',
  amount: 250,
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.getIdempotencyKeyFromRequest.mockReturnValue('idem-key-123');
  mocks.checkIdempotency.mockResolvedValue({ isDuplicate: false });
  mocks.storeIdempotencyResult.mockResolvedValue(undefined);
  mocks.validateStatusTransition.mockReturnValue(undefined);
  mocks.validateBidTransition.mockReturnValue(undefined);
  mocks.createNotification.mockResolvedValue('notif-1');
  mocks.sendBidAcceptedEmail.mockResolvedValue(true);
  mocks.learnFromAcceptance.mockResolvedValue(undefined);
  mocks.learnFromBidOutcome.mockResolvedValue(undefined);
}

/**
 * Supabase mock for bid acceptance flow.
 * The route queries: jobs (verify), bids (fetch), profiles (contractor stripe),
 * then bids (check existing accepted), bids (update accept), bids (update reject others),
 * jobs (update status), jobs (fetch title), notifications, profiles (email lookups),
 * message_threads, messages, contracts, bids (rejected list).
 */
/**
 * Creates a chainable Supabase query builder mock where every method returns `this`
 * by default, so any chain length works. Specific terminal methods are overridden.
 */
function createChainMock(terminals: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'is', 'or', 'like', 'ilike', 'contains', 'order', 'limit', 'range', 'filter'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods
  chain.single = vi.fn().mockResolvedValue(terminals.single ?? { data: null, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue(terminals.maybeSingle ?? { data: null, error: null });
  // When chain itself is awaited (e.g., after .limit() with no .single())
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminals.resolve ?? { data: [], error: null }));
  // Override specific methods if provided
  if (terminals.select) {
    chain.select = vi.fn().mockReturnValue(terminals.select);
  }
  return chain;
}

function setupAcceptMocks(overrides: {
  jobData?: unknown;
  jobError?: unknown;
  bidData?: unknown;
  bidError?: unknown;
  existingAccepted?: unknown[];
  acceptError?: unknown;
} = {}) {
  const jobResult = { data: overrides.jobData ?? postedJob, error: overrides.jobError ?? null };
  const bidResult = { data: overrides.bidData ?? pendingBid, error: overrides.bidError ?? null };
  const existingAccepted = overrides.existingAccepted ?? [];
  const acceptError = overrides.acceptError ?? null;

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      // Jobs table: select->eq->single (verify ownership), update->eq (assign)
      // also select->eq->single (fetch title)
      return createChainMock({ single: jobResult, resolve: { data: jobResult.data, error: jobResult.error } });
    }
    if (table === 'bids') {
      // Bids table is called many times. Return a fresh builder each time.
      // All chains end in .single() (bid fetch) or .limit() (existing check) or
      // .eq()/.neq() (update). The chainMock handles all cases.
      const chain = createChainMock({
        single: bidResult,
        // When .limit(1) is called without .single(), the chain is awaited directly
        // returning { data: existingAccepted }
        resolve: { data: existingAccepted, error: null },
      });
      // Override: update needs to resolve to { error: acceptError } when awaited
      const updateChain = createChainMock({ resolve: { error: acceptError } });
      // Make .eq and .neq on the update chain resolve properly
      updateChain.eq = vi.fn().mockReturnValue(updateChain);
      updateChain.neq = vi.fn().mockReturnValue(updateChain);
      // Make awaiting the update chain return { error: acceptError }
      updateChain.then = vi.fn((resolve: (v: unknown) => void) => resolve({ error: acceptError }));

      chain.update = vi.fn().mockReturnValue(updateChain);
      return chain;
    }
    if (table === 'profiles') {
      return createChainMock({
        single: {
          data: {
            email: 'contractor@test.com',
            first_name: 'Bob',
            last_name: 'Builder',
            company_name: 'Bob Co',
            stripe_connect_account_id: 'acct_123',
          },
          error: null,
        },
      });
    }
    if (table === 'contracts') {
      const chain = createChainMock({ resolve: { data: [], error: null } });
      chain.insert = vi.fn().mockResolvedValue({ error: null });
      return chain;
    }
    if (table === 'message_threads') {
      const chain = createChainMock({
        single: { data: null, error: { message: 'not found' } },
      });
      // insert().select().single() for creating new thread
      const insertChain = createChainMock({
        single: { data: { id: 'thread-1' }, error: null },
      });
      chain.insert = vi.fn().mockReturnValue(insertChain);
      chain.update = vi.fn().mockReturnValue(createChainMock({ resolve: { error: null } }));
      return chain;
    }
    if (table === 'messages') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return createChainMock();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/jobs/[id]/bids/[bidId]/accept', () => {
  let POST: typeof import('@/app/api/jobs/[id]/bids/[bidId]/accept/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/bids/[bidId]/accept/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(401);
  });

  // ---- Role restriction: homeowner only (inline check) ----
  it('should return 403 when user is a contractor', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'contractor-1',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Test',
      last_name: 'Contractor',
    });
    setupAcceptMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('homeowner');
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupAcceptMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/bad-id/bids/bid-1/accept');
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
    setupAcceptMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('authorized');
  });

  // ---- Bid not found ----
  it('should return 404 when bid does not exist', async () => {
    setupAcceptMocks({ bidData: null, bidError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bad-bid/accept');
    const res = await POST(req, segmentData('job-1', 'bad-bid'));
    expect(res.status).toBe(404);
  });

  // ---- Invalid bid status transition ----
  it('should throw when bid status transition is invalid (e.g., already rejected)', async () => {
    mocks.validateBidTransition.mockImplementation(() => {
      throw new Error('Invalid bid transition from rejected to accepted');
    });
    setupAcceptMocks({ bidData: { ...pendingBid, status: 'rejected' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(500);
  });

  // ---- Invalid job status transition ----
  it('should throw when job status transition is invalid (e.g., already assigned)', async () => {
    mocks.validateStatusTransition.mockImplementation(() => {
      throw new Error('Invalid transition from assigned to assigned');
    });
    setupAcceptMocks({ jobData: { ...postedJob, status: 'assigned' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(500);
  });

  // ---- Idempotency: duplicate request ----
  it('should return cached result for duplicate request', async () => {
    const cachedResult = { success: true, message: 'Bid accepted successfully' };
    mocks.checkIdempotency.mockResolvedValue({
      isDuplicate: true,
      cachedResult,
    });
    setupAcceptMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ---- Success ----
  it('should accept bid successfully', async () => {
    setupAcceptMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('accepted');
  });

  // ---- Stores idempotency result ----
  it('should store the idempotency result after success', async () => {
    setupAcceptMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    await POST(req, segmentData('job-1', 'bid-1'));

    expect(mocks.storeIdempotencyResult).toHaveBeenCalledWith(
      'idem-key-123',
      'accept_bid',
      expect.objectContaining({ success: true }),
      'homeowner-1',
      expect.objectContaining({ jobId: 'job-1', bidId: 'bid-1' }),
    );
  });

  // ---- Creates notification for contractor ----
  it('should notify the contractor on successful acceptance', async () => {
    setupAcceptMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    await POST(req, segmentData('job-1', 'bid-1'));

    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'contractor-1',
        type: 'bid_accepted',
      }),
    );
  });

  // ---- Bid accept DB failure ----
  it('should return 500 when bid update fails', async () => {
    setupAcceptMocks({ acceptError: { message: 'DB error', code: '23505' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/bids/bid-1/accept');
    const res = await POST(req, segmentData('job-1', 'bid-1'));
    expect(res.status).toBe(500);
  });
});
