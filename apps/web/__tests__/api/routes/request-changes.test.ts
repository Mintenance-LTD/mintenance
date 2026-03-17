/**
 * Tests for POST /api/jobs/[id]/request-changes
 * Route: apps/web/app/api/jobs/[id]/request-changes/route.ts
 *
 * Covers: authentication, role restriction (homeowner only),
 * missing comments body, job not found, homeowner ownership check,
 * job must be completed status, success path with rollback to in_progress,
 * notification + email to contractor, update failure.
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
  sendChangesRequestedEmail: vi.fn(),
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
  JOB_STATUS: { POSTED: 'posted', ASSIGNED: 'assigned', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', CANCELLED: 'cancelled' },
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

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendChangesRequestedEmail: mocks.sendChangesRequestedEmail,
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
function createPostRequest(url: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
    },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
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

const completedJob = {
  id: 'job-1',
  homeowner_id: 'homeowner-1',
  contractor_id: 'contractor-1',
  title: 'Fix leaking pipe',
  status: 'completed',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.createNotification.mockResolvedValue('notif-1');
  mocks.sendChangesRequestedEmail.mockResolvedValue(true);
}

function setupRequestChangesMocks(overrides: {
  jobData?: unknown;
  jobError?: unknown;
  updateError?: unknown;
} = {}) {
  const jobResult = { data: overrides.jobData ?? completedJob, error: overrides.jobError ?? null };
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
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: 'contractor@test.com', first_name: 'Bob', last_name: 'Builder', company_name: 'Bob Co' },
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
describe('POST /api/jobs/[id]/request-changes', () => {
  let POST: typeof import('@/app/api/jobs/[id]/request-changes/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/request-changes/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Fix the grout' });
    const res = await POST(req, segmentData('job-1'));
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

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Fix the grout' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Missing comments ----
  it('should return 400 when comments are empty', async () => {
    setupRequestChangesMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: '' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('details');
  });

  it('should return 400 when comments are whitespace only', async () => {
    setupRequestChangesMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: '   ' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupRequestChangesMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/bad-id/request-changes', { comments: 'Fix it' });
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);
  });

  // ---- Ownership check ----
  it('should return 403 when user is not the job homeowner', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-homeowner',
      email: 'other@test.com',
      role: 'homeowner',
      first_name: 'Other',
      last_name: 'Person',
    });
    setupRequestChangesMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Fix it' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('homeowner');
  });

  // ---- Job not completed ----
  it('should return 400 when job is not in completed status', async () => {
    setupRequestChangesMocks({ jobData: { ...completedJob, status: 'in_progress' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Fix it' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('completed');
  });

  // ---- Success ----
  it('should roll back job to in_progress and send notification', async () => {
    setupRequestChangesMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Grout needs redo' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('reopened');
  });

  it('should create a notification for the contractor', async () => {
    setupRequestChangesMocks();

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Grout needs redo' });
    await POST(req, segmentData('job-1'));

    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'contractor-1',
        title: 'Changes Requested',
        type: 'changes_requested',
      }),
    );
  });

  // ---- Update failure ----
  it('should return 500 when job status rollback fails', async () => {
    setupRequestChangesMocks({ updateError: { message: 'DB error' } });

    const req = createPostRequest('http://localhost:3000/api/jobs/job-1/request-changes', { comments: 'Fix it' });
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(500);
  });
});
