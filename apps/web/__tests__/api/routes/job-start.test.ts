// @vitest-environment node
/**
 * Tests for POST /api/jobs/[id]/start
 * Route: apps/web/app/api/jobs/[id]/start/route.ts
 *
 * Covers: authentication, role restriction (contractor only), job not found,
 * contractor ownership check, state transition (assigned -> in_progress),
 * contract must be signed, escrow must be funded, before photos required,
 * success path.
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
  validateStatusTransition: vi.fn(),
  notifyJobStatusChange: vi.fn(),
  sendJobStartedEmail: vi.fn(),
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

vi.mock('@/lib/job-state-machine', () => ({
  validateStatusTransition: mocks.validateStatusTransition,
}));

vi.mock('@/lib/services/notifications/NotificationHelper', () => ({
  notifyJobStatusChange: mocks.notifyJobStatusChange,
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendJobStartedEmail: mocks.sendJobStartedEmail,
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

function segmentData(id: string) {
  return { params: Promise.resolve({ id }) };
}

const contractorUser = {
  id: 'contractor-1',
  email: 'contractor@test.com',
  role: 'contractor' as const,
  first_name: 'Test',
  last_name: 'Contractor',
};

const assignedJob = {
  id: 'job-1',
  contractor_id: 'contractor-1',
  homeowner_id: 'homeowner-1',
  status: 'assigned',
  title: 'Fix kitchen sink',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(contractorUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.validateStatusTransition.mockReturnValue(undefined); // no error
  mocks.notifyJobStatusChange.mockResolvedValue(undefined);
  mocks.sendJobStartedEmail.mockResolvedValue(true);
}

/**
 * Sets up supabase mocks for the start job flow.
 * The route queries: jobs, contracts, escrow_transactions, job_photos_metadata,
 * then updates jobs, and reads profiles for email.
 */
function setupStartJobMocks(overrides: {
  jobData?: unknown;
  jobError?: unknown;
  contractData?: unknown;
  escrowData?: unknown;
  photoCount?: number;
  updateError?: unknown;
} = {}) {
  const jobResult = { data: overrides.jobData ?? assignedJob, error: overrides.jobError ?? null };
  const contractResult = {
    data: 'contractData' in overrides ? overrides.contractData : { id: 'contract-1', status: 'accepted' },
    error: null,
  };
  const escrowResult = {
    data: 'escrowData' in overrides ? overrides.escrowData : { id: 'escrow-1', status: 'held' },
    error: null,
  };
  const photoCountResult = { count: overrides.photoCount ?? 2, error: null };
  const updateResult = { error: overrides.updateError ?? null };

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(jobResult),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(updateResult),
        }),
      };
    }
    if (table === 'contracts') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(contractResult),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'escrow_transactions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(escrowResult),
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'job_photos_metadata') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(photoCountResult),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: 'test@test.com', first_name: 'Test', last_name: 'User', company_name: 'Test Co' },
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
describe('POST /api/jobs/[id]/start', () => {
  let POST: typeof import('@/app/api/jobs/[id]/start/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/start/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
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

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupStartJobMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/bad-id/start');
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);
  });

  // ---- Wrong contractor ----
  it('should return 403 when contractor is not assigned to the job', async () => {
    setupStartJobMocks({
      jobData: { ...assignedJob, contractor_id: 'other-contractor' },
    });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('assigned contractor');
  });

  // ---- Invalid state transition ----
  it('should return error when job status transition is invalid', async () => {
    mocks.validateStatusTransition.mockImplementation(() => {
      throw new Error('Invalid status transition from posted to in_progress');
    });
    setupStartJobMocks({ jobData: { ...assignedJob, status: 'posted' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    // handleAPIError catches this as a generic error -> 500
    expect(res.status).toBe(500);
  });

  // ---- No signed contract ----
  it('should return 400 when contract is not signed', async () => {
    setupStartJobMocks({ contractData: null });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('Contract must be signed');
  });

  // ---- No escrow ----
  it('should return 400 when escrow is not funded', async () => {
    setupStartJobMocks({ escrowData: null });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('escrow');
  });

  // ---- No before photos ----
  it('should return 400 when no before photos have been uploaded', async () => {
    setupStartJobMocks({ photoCount: 0 });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('before photo');
  });

  // ---- Success ----
  it('should start the job successfully when all preconditions are met', async () => {
    setupStartJobMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('started successfully');
  });

  // ---- Verifies notifications are sent ----
  it('should notify both parties when job starts', async () => {
    setupStartJobMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    await POST(req, segmentData('job-1'));

    expect(mocks.notifyJobStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        oldStatus: 'assigned',
        newStatus: 'in_progress',
        homeownerId: 'homeowner-1',
        contractorId: 'contractor-1',
      }),
    );
  });

  // ---- Update failure ----
  it('should return 500 when job status update fails', async () => {
    setupStartJobMocks({ updateError: { message: 'DB error' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/start');
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(500);
  });
});
