// @vitest-environment node
/**
 * Tests for GET /api/jobs/[id]/escrow
 * Route: apps/web/app/api/jobs/[id]/escrow/route.ts
 *
 * Covers: authentication, authorization (homeowner/contractor/admin access),
 * job not found, escrow not found (returns null), successful escrow retrieval.
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
  createRequestScopedClient: () => null, // falls back to serverSupabase in route
}));

vi.mock('@/lib/csrf', () => ({
  requireCSRF: mocks.requireCSRF,
}));

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
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500,
      public details?: unknown,
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse() {
      return { error: { code: this.code, message: this.userMessage }, timestamp: new Date().toISOString() };
    }
  }
  class UnauthorizedError extends APIError {
    constructor(msg = 'Unauthorized') { super('UNAUTHORIZED', msg, 401); }
  }
  class ForbiddenError extends APIError {
    constructor(msg = 'Forbidden') { super('FORBIDDEN', msg, 403); }
  }
  class NotFoundError extends APIError {
    constructor(msg = 'Resource not found') { super('NOT_FOUND', msg, 404); }
  }
  class BadRequestError extends APIError {
    constructor(msg = 'Bad Request', details?: unknown) { super('BAD_REQUEST', msg, 400, details); }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    handleAPIError: vi.fn((error: unknown) => {
      if (error instanceof APIError) {
        const { NextResponse } = require('next/server');
        return NextResponse.json(error.toResponse(), { status: error.statusCode });
      }
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
        { status: 500 },
      );
    }),
  };
});

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createGetRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'GET',
    headers: { 'x-forwarded-for': '127.0.0.1', ...headers },
  });
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
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
}

function createSupabaseChain(
  tableMap: Record<string, {
    selectReturn?: { data: unknown; error: unknown };
  }>,
) {
  mocks.supabaseFrom.mockImplementation((table: string) => {
    const cfg = tableMap[table] || {};
    const selectReturn = cfg.selectReturn || { data: null, error: null };
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(selectReturn),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue(selectReturn),
            }),
          }),
        }),
      }),
    };
  });
}

function segmentData(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/jobs/[id]/escrow', () => {
  let GET: typeof import('@/app/api/jobs/[id]/escrow/route').GET;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/escrow/route');
    GET = mod.GET;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/escrow');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    createSupabaseChain({
      jobs: { selectReturn: { data: null, error: { message: 'not found' } } },
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/nonexistent/escrow');
    const res = await GET(req, segmentData('nonexistent'));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ---- Authorization: random user ----
  it('should return 403 when user is not homeowner, contractor, or admin', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'random-user',
      email: 'rando@test.com',
      role: 'homeowner',
      first_name: 'Random',
      last_name: 'User',
    });

    createSupabaseChain({
      jobs: {
        selectReturn: {
          data: { id: 'job-1', homeowner_id: 'homeowner-1', contractor_id: 'contractor-1' },
          error: null,
        },
      },
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/escrow');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Escrow not found returns null ----
  it('should return { escrow: null } when no escrow exists for the job', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1', contractor_id: 'contractor-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      // escrow_transactions
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/escrow');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.escrow).toBeNull();
  });

  // ---- Success: homeowner can view escrow ----
  it('should return escrow details for the job homeowner', async () => {
    const escrowData = {
      id: 'escrow-1',
      job_id: 'job-1',
      status: 'held',
      amount: 25000,
      payment_intent_id: 'pi_test123',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1', contractor_id: 'contractor-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: escrowData, error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/escrow');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.escrow).toEqual({
      id: 'escrow-1',
      jobId: 'job-1',
      status: 'held',
      amount: 25000,
      paymentIntentId: 'pi_test123',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
  });

  // ---- Success: contractor can view escrow ----
  it('should allow the assigned contractor to view escrow details', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'contractor-1',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Test',
      last_name: 'Contractor',
    });

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1', contractor_id: 'contractor-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'escrow-1',
                    job_id: 'job-1',
                    status: 'held',
                    amount: 15000,
                    payment_intent_id: 'pi_abc',
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/escrow');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.escrow.status).toBe('held');
  });

  // ---- Success: admin can view any escrow ----
  it('should allow admin to view escrow for any job', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
    });

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-1', homeowner_id: 'homeowner-1', contractor_id: 'contractor-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'escrow-2',
                    job_id: 'job-1',
                    status: 'pending',
                    amount: 5000,
                    payment_intent_id: 'pi_admin',
                    created_at: '2026-02-01T00:00:00Z',
                    updated_at: '2026-02-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    });

    const req = createGetRequest('http://localhost:3000/api/jobs/job-1/escrow');
    const res = await GET(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.escrow.id).toBe('escrow-2');
  });
});
