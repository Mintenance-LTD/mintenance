/**
 * Tests for POST /api/payments/refund
 * Route: apps/web/app/api/payments/refund/route.ts
 *
 * Covers: authentication, rate limiting, validation (Zod schema),
 * idempotency (duplicate + lock contention), job not found, authorization
 * (homeowner only can refund), escrow not found, escrow not held,
 * job status check (only refundable statuses), missing payment intent ID,
 * MFA requirements for high-risk refunds, anomaly detection blocking,
 * Stripe refund success, escrow DB update with retry, job cancellation,
 * idempotency result storage.
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
  checkApiRateLimit: vi.fn(),
  getIdempotencyKeyFromRequest: vi.fn(),
  checkIdempotency: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  validateRequest: vi.fn(),
  stripeRefundsCreate: vi.fn(),
  requiresMFA: vi.fn(),
  validateMFAForPayment: vi.fn(),
  detectAnomalies: vi.fn(),
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
  checkApiRateLimit: mocks.checkApiRateLimit,
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  checkIdempotency: mocks.checkIdempotency,
  storeIdempotencyResult: mocks.storeIdempotencyResult,
  releaseIdempotencyClaim: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('@/lib/validation/schemas', () => ({
  refundRequestSchema: { _mock: true },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: mocks.stripeRefundsCreate,
    },
  },
}));

// Mock dynamic imports used in the route
vi.mock('@/lib/payments/high-risk-checks', () => ({
  requiresMFA: mocks.requiresMFA,
  validateMFAForPayment: mocks.validateMFAForPayment,
  HighRiskOperation: { REFUND: 'REFUND' },
}));

vi.mock('@/lib/monitoring/payment-monitor', () => ({
  PaymentMonitoringService: {
    detectAnomalies: mocks.detectAnomalies,
  },
}));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500,
      public details?: unknown
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse() {
      return {
        error: { code: this.code, message: this.userMessage },
        timestamp: new Date().toISOString(),
      };
    }
  }
  class UnauthorizedError extends APIError {
    constructor(m = 'Unauthorized') {
      super('UNAUTHORIZED', m, 401);
    }
  }
  class ForbiddenError extends APIError {
    constructor(m = 'Forbidden') {
      super('FORBIDDEN', m, 403);
    }
  }
  class NotFoundError extends APIError {
    constructor(m = 'Resource not found') {
      super('NOT_FOUND', m, 404);
    }
  }
  class BadRequestError extends APIError {
    constructor(m = 'Bad Request', d?: unknown) {
      super('BAD_REQUEST', m, 400, d);
    }
  }
  class RateLimitError extends APIError {
    constructor(m = 'Rate limit exceeded') {
      super('RATE_LIMIT', m, 429);
    }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    RateLimitError,
    handleAPIError: vi.fn((error: unknown) => {
      if (error instanceof APIError) {
        const { NextResponse } = require('next/server');
        return NextResponse.json(error.toResponse(), {
          status: error.statusCode,
        });
      }
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        },
        { status: 500 }
      );
    }),
  };
});

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createPostRequest(
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
      'x-real-ip': '127.0.0.1',
    },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });
}

// This route has no [id] param, just body data
function segmentData() {
  return { params: Promise.resolve({}) };
}

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const validRefundData = {
  jobId: 'job-1',
  escrowTransactionId: 'escrow-1',
  amount: 250,
  reason: 'Job cancelled',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  // withApiHandler rate limit is disabled (rateLimit: false), route uses custom
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkApiRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.getIdempotencyKeyFromRequest.mockReturnValue('idem-key-123');
  mocks.checkIdempotency.mockResolvedValue({ isDuplicate: false });
  mocks.storeIdempotencyResult.mockResolvedValue(undefined);
  mocks.validateRequest.mockResolvedValue({ data: validRefundData });
  mocks.stripeRefundsCreate.mockResolvedValue({
    id: 'refund-1',
    status: 'succeeded',
    amount: 25000,
  });
  mocks.requiresMFA.mockResolvedValue({ required: false });
  mocks.detectAnomalies.mockResolvedValue({
    riskScore: 10,
    blockedReasons: [],
  });
}

function setupRefundMocks(
  overrides: {
    jobData?: unknown;
    jobError?: unknown;
    escrowData?: unknown;
    escrowError?: unknown;
    escrowUpdateError?: unknown;
  } = {}
) {
  const jobResult = {
    data: overrides.jobData ?? {
      id: 'job-1',
      homeowner_id: 'homeowner-1',
      contractor_id: 'contractor-1',
      status: 'cancelled',
    },
    error: overrides.jobError ?? null,
  };
  const escrowResult = {
    data: overrides.escrowData ?? {
      id: 'escrow-1',
      job_id: 'job-1',
      amount: 250,
      status: 'held',
      payment_intent_id: 'pi_test_123',
      stripe_payment_intent_id: null,
      created_at: '2026-01-01T00:00:00Z',
      released_at: null,
      refunded_at: null,
    },
    error: overrides.escrowError ?? null,
  };
  const escrowUpdateError = overrides.escrowUpdateError ?? null;

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(jobResult),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'escrow_transactions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(escrowResult),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: escrowUpdateError
                  ? null
                  : { ...escrowResult.data, status: 'refunded' },
                error: escrowUpdateError,
              }),
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
describe('POST /api/payments/refund', () => {
  let POST: typeof import('@/app/api/payments/refund/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/refund/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(401);
  });

  // ---- Custom rate limiting ----
  it('should return 429 when custom rate limit is exceeded', async () => {
    mocks.checkApiRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 30,
    });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(429);
  });

  // ---- Validation error ----
  it('should return 400 when request body fails validation', async () => {
    const { NextResponse } = await import('next/server');
    mocks.validateRequest.mockResolvedValue(
      NextResponse.json(
        {
          error: 'Validation failed',
          errors: [{ field: 'jobId', message: 'Invalid job ID' }],
        },
        { status: 400 }
      )
    );

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      {}
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(400);
  });

  // ---- Idempotency: duplicate request ----
  it('should return cached result for duplicate refund request', async () => {
    const cachedResult = {
      success: true,
      refundId: 'refund-1',
      amount: 250,
      status: 'succeeded',
    };
    mocks.checkIdempotency.mockResolvedValue({
      isDuplicate: true,
      cachedResult,
    });
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.refundId).toBe('refund-1');
  });

  // 2026-05-21: removed "should return 409 when idempotency lock contention
  // occurs". With the claim-then-complete redesign, checkIdempotency THROWS
  // IdempotencyStoreUnavailableError (extends ServiceUnavailableError → 503)
  // on real contention; it never returns null for that case. The previous
  // null-return code path is dead. The 503 mapping is now structurally
  // enforced via the class hierarchy + handleAPIError and is covered by
  // unit tests on lib/idempotency.ts directly.

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupRefundMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(404);
  });

  // ---- Authorization: contractor cannot refund ----
  it('should return 403 when a contractor tries to refund (not job owner)', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-user',
      email: 'other@test.com',
      role: 'homeowner',
      first_name: 'Other',
      last_name: 'User',
    });
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(403);
  });

  // ---- Non-homeowner (contractor on the job) cannot refund ----
  it('should return 403 when the contractor on the job tries to request refund', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'contractor-1',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Test',
      last_name: 'Contractor',
    });
    setupRefundMocks({
      jobData: {
        id: 'job-1',
        homeowner_id: 'homeowner-1',
        contractor_id: 'contractor-1',
        status: 'cancelled',
      },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    // Contractor is on the job (passes first ownership check) but not homeowner -> 403
    expect(res.status).toBe(403);
  });

  // ---- Non-refundable job status ----
  it('should return 400 when job status is not refundable (in_progress)', async () => {
    setupRefundMocks({
      jobData: {
        id: 'job-1',
        homeowner_id: 'homeowner-1',
        contractor_id: 'contractor-1',
        status: 'in_progress',
      },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Cannot refund');
  });

  // ---- Escrow not found ----
  it('should return 404 when escrow transaction does not exist', async () => {
    setupRefundMocks({
      escrowData: null,
      escrowError: { message: 'not found' },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(404);
  });

  // ---- Escrow not held ----
  it('should return 400 when escrow status is not held (already released)', async () => {
    setupRefundMocks({
      escrowData: {
        id: 'escrow-1',
        job_id: 'job-1',
        amount: 250,
        status: 'released',
        payment_intent_id: 'pi_test_123',
      },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('released');
  });

  // ---- Missing payment intent ID ----
  it('should return 400 when no payment intent ID is found on escrow', async () => {
    setupRefundMocks({
      escrowData: {
        id: 'escrow-1',
        job_id: 'job-1',
        amount: 250,
        status: 'held',
        payment_intent_id: null,
        stripe_payment_intent_id: null,
      },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('payment intent');
  });

  // ---- MFA required but no token ----
  it('should return 403 when MFA is required but no token provided', async () => {
    mocks.requiresMFA.mockResolvedValue({
      required: true,
      reason: 'High value refund',
      riskScore: 85,
    });
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.mfaRequired).toBe(true);
  });

  // ---- Anomaly detection blocks refund ----
  it('should return 403 when anomaly detection blocks the refund', async () => {
    mocks.detectAnomalies.mockResolvedValue({
      riskScore: 95,
      blockedReasons: ['Unusual refund pattern detected'],
    });
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toContain('security');
    expect(body.reasons).toContain('Unusual refund pattern detected');
  });

  // ---- Success ----
  it('should process refund successfully and return refund details', async () => {
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    const res = await POST(req, segmentData());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.refundId).toBe('refund-1');
    expect(body.status).toBe('succeeded');
    expect(body.amount).toBeGreaterThan(0);
  });

  // ---- Stripe refund is called with correct params ----
  it('should call Stripe with correct refund parameters', async () => {
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    await POST(req, segmentData());

    expect(mocks.stripeRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: 'pi_test_123',
        metadata: expect.objectContaining({
          jobId: 'job-1',
          escrowTransactionId: 'escrow-1',
          requestedBy: 'homeowner-1',
        }),
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^refund_escrow-1_pi_test_123_/),
      })
    );
  });

  // ---- Stores idempotency result ----
  it('should store idempotency result after successful refund', async () => {
    setupRefundMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/payments/refund',
      validRefundData
    );
    await POST(req, segmentData());

    expect(mocks.storeIdempotencyResult).toHaveBeenCalledWith(
      'idem-key-123',
      'refund_payment',
      expect.objectContaining({ success: true, refundId: 'refund-1' }),
      'homeowner-1',
      expect.objectContaining({
        jobId: 'job-1',
        escrowTransactionId: 'escrow-1',
      })
    );
  });
});
