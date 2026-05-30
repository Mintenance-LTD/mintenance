/**
 * Tests for POST /api/jobs/[id]/complete
 * Route: apps/web/app/api/jobs/[id]/complete/route.ts
 *
 * Covers: authentication, role restriction (contractor only),
 * job not found, contractor ownership check, state transition validation,
 * payment enforcement, success path with notification creation,
 * escrow auto-release scheduling, update failure.
 */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  supabaseStorage: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  validateStatusTransition: vi.fn(),
  canCompleteJob: vi.fn(),
  calculateAutoReleaseDate: vi.fn(),
  createNotification: vi.fn(),
  applyRewardOnFirstJob: vi.fn(),
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
  validateStatusTransition: mocks.validateStatusTransition,
  JOB_STATUS: {
    POSTED: 'posted',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  ESCROW_STATUS: {
    HELD: 'held',
    RELEASE_PENDING: 'release_pending',
    RELEASED: 'released',
  },
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/services/payment/PaymentEnforcement', () => ({
  PaymentEnforcement: {
    canCompleteJob: mocks.canCompleteJob,
  },
}));

vi.mock('@/lib/services/agents/EscrowReleaseAgent', () => ({
  EscrowReleaseAgent: {
    calculateAutoReleaseDate: mocks.calculateAutoReleaseDate,
  },
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

vi.mock('@/lib/services/referrals/NeighbourhoodReferralService', () => ({
  NeighbourhoodReferralService: {
    applyRewardOnFirstJob: mocks.applyRewardOnFirstJob,
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
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
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

const inProgressJob = {
  id: 'job-1',
  contractor_id: 'contractor-1',
  homeowner_id: 'homeowner-1',
  status: 'in_progress',
  title: 'Fix kitchen sink',
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(contractorUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.validateStatusTransition.mockReturnValue(undefined);
  mocks.canCompleteJob.mockResolvedValue({ allowed: true });
  mocks.calculateAutoReleaseDate.mockResolvedValue(undefined);
  mocks.createNotification.mockResolvedValue('notification-1');
  mocks.applyRewardOnFirstJob.mockResolvedValue(undefined);
}

function setupCompleteMocks(
  overrides: {
    jobData?: unknown;
    jobError?: unknown;
    updateError?: unknown;
    notificationError?: unknown;
    escrowData?: unknown;
  } = {}
) {
  const jobResult = {
    data: overrides.jobData ?? inProgressJob,
    error: overrides.jobError ?? null,
  };
  // The route's optimistic-locked UPDATE ends with .select('id'); a non-empty
  // row array signals the update actually flipped status (the winning caller).
  const updateResult = {
    data: overrides.updateError ? null : [{ id: 'job-1' }],
    error: overrides.updateError ?? null,
  };
  const notificationResult = { error: overrides.notificationError ?? null };
  const escrowResult = {
    data: 'escrowData' in overrides ? overrides.escrowData : { id: 'escrow-1' },
    error: null,
  };

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(jobResult),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue(updateResult),
            }),
          }),
        }),
      };
    }
    if (table === 'notifications') {
      return {
        insert: vi.fn().mockResolvedValue(notificationResult),
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
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/jobs/[id]/complete', () => {
  let POST: typeof import('@/app/api/jobs/[id]/complete/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/complete/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
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

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupCompleteMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/bad-id/complete'
    );
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);
  });

  // ---- Wrong contractor ----
  it('should return 403 when contractor is not assigned to the job', async () => {
    setupCompleteMocks({
      jobData: { ...inProgressJob, contractor_id: 'other-contractor' },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('assigned contractor');
  });

  // ---- Invalid state transition (e.g., from posted) ----
  it('should return 400 when job status is not completable', async () => {
    mocks.validateStatusTransition.mockImplementation(() => {
      throw new Error('Invalid status transition');
    });
    setupCompleteMocks({ jobData: { ...inProgressJob, status: 'posted' } });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('cannot be completed');
  });

  // ---- Payment not processed (402) ----
  it('should return 402 when payment enforcement fails', async () => {
    mocks.canCompleteJob.mockResolvedValue({
      allowed: false,
      reason: 'No platform payment found for this job',
    });
    setupCompleteMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(402);

    const body = await res.json();
    expect(body.requiresPayment).toBe(true);
    expect(body.message).toContain('payment');
  });

  // ---- Success ----
  it('should complete the job successfully when all preconditions are met', async () => {
    setupCompleteMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('completed');
  });

  // ---- Creates notification for homeowner ----
  // 2026-05-01 audit: the route migrated off a direct
  // `.from('notifications').insert(...)` to NotificationService.createNotification
  // (push + user-preference + quiet-hours aware). Assert on the service call,
  // keyed on `userId` (camelCase) + `type: 'job_update'` per the current contract.
  it('should create a notification for the homeowner on success', async () => {
    setupCompleteMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    await POST(req, segmentData('job-1'));

    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'homeowner-1',
        type: 'job_update',
      })
    );
  });

  // ---- Update failure ----
  it('should return 500 when job status update fails', async () => {
    setupCompleteMocks({ updateError: { message: 'DB error' } });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/complete'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(500);
  });
});
