// @vitest-environment node
/**
 * Tests for POST /api/payments/confirm-intent
 * Route: apps/web/app/api/payments/confirm-intent/route.ts
 *
 * Covers: authentication, validation (paymentIntentId, jobId formats),
 * Stripe payment intent retrieval, payment status checks,
 * job ownership, escrow state machine, success path.
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
  validateRequest: vi.fn(),
  stripePaymentIntentsRetrieve: vi.fn(),
  createNotification: vi.fn(),
  sendPaymentConfirmationEmail: vi.fn(),
  sendPaymentReceivedEmail: vi.fn(),
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
  ESCROW_STATUS: { PENDING: 'pending', HELD: 'held', RELEASE_PENDING: 'release_pending', RELEASED: 'released' },
  validateEscrowTransition: vi.fn(),
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('stripe', () => {
  class StripeMock {
    paymentIntents = { retrieve: mocks.stripePaymentIntentsRetrieve };
    static errors = {
      StripeError: class StripeError extends Error {
        type: string;
        constructor(msg: string) { super(msg); this.type = 'invalid_request_error'; }
      },
    };
  }
  return { default: StripeMock };
});

vi.mock('@/lib/stripe', () => ({
  stripe: { paymentIntents: { retrieve: mocks.stripePaymentIntentsRetrieve } },
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendPaymentConfirmationEmail: mocks.sendPaymentConfirmationEmail,
    sendPaymentReceivedEmail: mocks.sendPaymentReceivedEmail,
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

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const validJobId = '11111111-2222-3333-4444-555555555555';

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.createNotification.mockResolvedValue(undefined);
  mocks.sendPaymentConfirmationEmail.mockResolvedValue(true);
  mocks.sendPaymentReceivedEmail.mockResolvedValue(true);
}

function setupConfirmIntentMocks(overrides: {
  paymentIntentStatus?: string;
  jobData?: unknown;
  jobError?: unknown;
  escrowData?: unknown;
  escrowError?: unknown;
  escrowUpdateData?: unknown;
  escrowUpdateError?: unknown;
} = {}) {
  mocks.stripePaymentIntentsRetrieve.mockResolvedValue({
    id: 'pi_test123',
    status: overrides.paymentIntentStatus ?? 'succeeded',
    amount: 25000,
  });

  const jobResult = {
    data: overrides.jobData ?? { id: validJobId, homeowner_id: 'homeowner-1', contractor_id: 'contractor-1', title: 'Fix tap' },
    error: overrides.jobError ?? null,
  };
  const escrowResult = {
    data: overrides.escrowData ?? {
      id: 'escrow-1', job_id: validJobId, amount: 25000, status: 'pending',
      stripe_payment_intent_id: 'pi_test123', payment_intent_id: 'pi_test123',
      version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    error: overrides.escrowError ?? null,
  };
  const escrowUpdateResult = {
    data: overrides.escrowUpdateData ?? { ...escrowResult.data, status: 'held' },
    error: overrides.escrowUpdateError ?? null,
  };

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
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue(escrowUpdateResult),
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
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
describe('POST /api/payments/confirm-intent', () => {
  let POST: typeof import('@/app/api/payments/confirm-intent/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/payments/confirm-intent/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    // No segmentData needed - this route has no [id] param
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  // ---- Validation failure: validateRequest returns a NextResponse ----
  it('should return validation error response when input is invalid', async () => {
    // When validateRequest returns a NextResponse (has 'headers'), route returns it directly
    const { NextResponse } = await import('next/server');
    const validationResponse = NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid payment intent ID' } },
      { status: 400 },
    );
    mocks.validateRequest.mockResolvedValue(validationResponse);

    setupConfirmIntentMocks();

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'invalid',
      jobId: 'not-a-uuid',
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  // ---- Payment not succeeded ----
  it('should return 400 when payment intent has not succeeded', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks({ paymentIntentStatus: 'requires_payment_method' });

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('not completed');
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  // ---- Ownership: not the homeowner ----
  it('should return 403 when user is not the job homeowner', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-user',
      email: 'other@test.com',
      role: 'homeowner',
      first_name: 'Other',
      last_name: 'User',
    });
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks();

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  // ---- Escrow not found ----
  it('should return 404 when escrow transaction not found', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks({ escrowData: null, escrowError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain('Escrow transaction not found');
  });

  // ---- Already held (webhook already processed) ----
  it('should return success when escrow is already held', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks({
      escrowData: {
        id: 'escrow-1', job_id: validJobId, amount: 25000, status: 'held',
        payment_intent_id: 'pi_test123', version: 1,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('held');
  });

  // ---- Success: pending -> held ----
  it('should update escrow from pending to held and return success', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks();

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.escrowTransactionId).toBe('escrow-1');
    expect(body.amount).toBe(25000);
  });

  // ---- Unexpected escrow state ----
  it('should return 400 when escrow is in an unexpected state', async () => {
    mocks.validateRequest.mockResolvedValue({
      data: { paymentIntentId: 'pi_test123', jobId: validJobId },
    });
    setupConfirmIntentMocks({
      escrowData: {
        id: 'escrow-1', job_id: validJobId, amount: 25000, status: 'failed',
        payment_intent_id: 'pi_test123', version: 1,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
      },
    });

    const req = createPostRequest('http://localhost:3000/api/payments/confirm-intent', {
      paymentIntentId: 'pi_test123',
      jobId: validJobId,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('cannot be confirmed');
  });
});
