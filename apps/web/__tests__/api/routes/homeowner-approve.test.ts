// @vitest-environment node
/**
 * Tests for POST /api/escrow/[id]/homeowner/approve
 * Route: apps/web/app/api/escrow/[id]/homeowner/approve/route.ts
 *
 * Covers: authentication, escrow not found, homeowner ownership check,
 * validation (optional comments), success path delegating to HomeownerApprovalService.
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
  approveCompletion: vi.fn(),
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

vi.mock('@/lib/validation/validator', () => ({
  validateRequest: mocks.validateRequest,
}));

vi.mock('@/lib/services/escrow/HomeownerApprovalService', () => ({
  HomeownerApprovalService: {
    approveCompletion: mocks.approveCompletion,
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
function createPostRequest(url: string, body: Record<string, unknown> = {}): NextRequest {
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

function segmentData(id: string) {
  return { params: Promise.resolve({ id }) };
}

const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.approveCompletion.mockResolvedValue(undefined);
  // validateRequest returns parsed data (no 'headers' property)
  mocks.validateRequest.mockResolvedValue({ data: { comments: undefined } });
}

function setupEscrowMock(overrides: {
  escrowData?: unknown;
  escrowError?: unknown;
} = {}) {
  const escrowResult = {
    data: overrides.escrowData ?? {
      jobs: { homeowner_id: 'homeowner-1' },
    },
    error: overrides.escrowError ?? null,
  };

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'escrow_transactions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(escrowResult),
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
describe('POST /api/escrow/[id]/homeowner/approve', () => {
  let POST: typeof import('@/app/api/escrow/[id]/homeowner/approve/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/escrow/[id]/homeowner/approve/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve');
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(401);
  });

  // ---- Escrow not found ----
  it('should return 404 when escrow does not exist', async () => {
    setupEscrowMock({ escrowData: null, escrowError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/escrow/bad-id/homeowner/approve');
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ---- Ownership: not the homeowner ----
  it('should return 403 when user is not the job homeowner for this escrow', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-homeowner',
      email: 'other@test.com',
      role: 'homeowner',
      first_name: 'Other',
      last_name: 'Person',
    });
    setupEscrowMock();

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve');
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('do not own');
  });

  // ---- Validation error from validateRequest ----
  it('should return validation error when input is invalid', async () => {
    setupEscrowMock();

    const { NextResponse } = await import('next/server');
    mocks.validateRequest.mockResolvedValue(
      NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Invalid comments field' } },
        { status: 400 },
      ),
    );

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve', {
      comments: 12345, // invalid type
    });
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(400);
  });

  // ---- Success: approve without comments ----
  it('should approve escrow and return success', async () => {
    setupEscrowMock();

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve', {});
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.escrowId).toBe('escrow-1');

    expect(mocks.approveCompletion).toHaveBeenCalledWith('escrow-1', 'homeowner-1', undefined);
  });

  // ---- Success: approve with comments ----
  it('should pass comments to the approval service', async () => {
    setupEscrowMock();
    mocks.validateRequest.mockResolvedValue({
      data: { comments: 'Looks great, well done!' },
    });

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve', {
      comments: 'Looks great, well done!',
    });
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(200);

    expect(mocks.approveCompletion).toHaveBeenCalledWith('escrow-1', 'homeowner-1', 'Looks great, well done!');
  });

  // ---- Approval service throws ----
  it('should return 500 when approval service fails', async () => {
    setupEscrowMock();
    mocks.approveCompletion.mockRejectedValue(new Error('Approval service unavailable'));

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve', {});
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(500);
  });

  // ---- Escrow with array jobs join ----
  it('should handle array-style jobs join from supabase', async () => {
    setupEscrowMock({
      escrowData: {
        jobs: [{ homeowner_id: 'homeowner-1' }],
      },
    });

    const req = createPostRequest('http://localhost:3000/api/escrow/escrow-1/homeowner/approve', {});
    const res = await POST(req, segmentData('escrow-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
