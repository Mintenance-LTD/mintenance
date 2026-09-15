// @vitest-environment node
/**
 * Tests for POST /api/jobs/[id]/confirm-completion
 * Route: apps/web/app/api/jobs/[id]/confirm-completion/route.ts
 *
 * (Replaces the originally requested confirm-payment route which does not exist.)
 *
 * Covers: authentication, role restriction (homeowner only), job not found,
 * homeowner ownership check, job must be completed, already confirmed,
 * no contractor assigned, success path with escrow release.
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
  getDeterministicIdempotencyKeyFromRequest: vi.fn(),
  checkIdempotency: vi.fn(),
  storeIdempotencyResult: vi.fn(),
  notifyJobConfirmed: vi.fn(),
  sendWorkApprovedEmail: vi.fn(),
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
  JOB_STATUS: {
    COMPLETED: 'completed',
    IN_PROGRESS: 'in_progress',
    ASSIGNED: 'assigned',
    POSTED: 'posted',
  },
  ESCROW_STATUS: {
    PENDING: 'pending',
    HELD: 'held',
    RELEASE_PENDING: 'release_pending',
    RELEASED: 'released',
  },
  validateEscrowTransition: vi.fn(),
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/idempotency', () => ({
  getDeterministicIdempotencyKeyFromRequest:
    mocks.getDeterministicIdempotencyKeyFromRequest,
  getIdempotencyKeyFromRequest: mocks.getIdempotencyKeyFromRequest,
  checkIdempotency: mocks.checkIdempotency,
  storeIdempotencyResult: mocks.storeIdempotencyResult,
  // The route wraps its protected block in releaseOnError(key, op, fn),
  // which simply runs fn() and releases the idempotency claim on throw.
  // Mock it as a thin pass-through so the wrapped logic still executes.
  releaseOnError: (_key: string, _op: string, fn: () => Promise<unknown>) =>
    fn(),
}));

vi.mock('@/lib/services/notifications/NotificationHelper', () => ({
  notifyJobConfirmed: mocks.notifyJobConfirmed,
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendWorkApprovedEmail: mocks.sendWorkApprovedEmail,
  },
}));

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
  status: 'completed',
  title: 'Fix leaking pipe',
  completion_confirmed_by_homeowner: false,
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.getIdempotencyKeyFromRequest.mockReturnValue('idem-key-123');
  mocks.getDeterministicIdempotencyKeyFromRequest.mockReturnValue(
    'idem-key-123'
  );
  mocks.checkIdempotency.mockResolvedValue({
    isDuplicate: false,
    ownership: { userId: 'homeowner-1', claimToken: 'request-token' },
  });
  mocks.storeIdempotencyResult.mockResolvedValue(undefined);
  mocks.notifyJobConfirmed.mockResolvedValue(undefined);
  mocks.sendWorkApprovedEmail.mockResolvedValue(true);
}

function setupConfirmMocks(
  overrides: {
    jobData?: unknown;
    jobError?: unknown;
    updateError?: unknown;
    escrowData?: unknown;
    escrowUpdateError?: unknown;
  } = {}
) {
  const jobResult = {
    data: overrides.jobData ?? completedJob,
    error: overrides.jobError ?? null,
  };
  const updateResult = { error: overrides.updateError ?? null };
  const escrowResult = {
    data: overrides.escrowData ?? {
      id: 'escrow-1',
      status: 'held',
      amount: 25000,
    },
    error: null,
  };
  const escrowUpdateResult = { error: overrides.escrowUpdateError ?? null };

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
              select: vi.fn().mockResolvedValue({
                data: updateResult.error ? null : [{ id: 'job-1' }],
                error: updateResult.error,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'escrow_transactions') {
      return {
        select: vi.fn().mockReturnValue({
          // Pre-flight escrow lookup:
          //   .eq('job_id', id).order('created_at', …).limit(1).maybeSingle()
          // Email-amount lookup:
          //   .eq('job_id', id).in('status', […]).limit(1).single()
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue(escrowResult),
              }),
            }),
            in: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(escrowResult),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(escrowUpdateResult),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                email: 'test@test.com',
                first_name: 'Test',
                last_name: 'User',
                company_name: 'Test Co',
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'job_photos_metadata') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
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
describe('POST /api/jobs/[id]/confirm-completion', () => {
  let POST: typeof import('@/app/api/jobs/[id]/confirm-completion/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/confirm-completion/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(401);
  });

  // ---- Role restriction ----
  it('should return 403 when user is a contractor', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'contractor-1',
      email: 'contractor@test.com',
      role: 'contractor',
      first_name: 'Test',
      last_name: 'Contractor',
    });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupConfirmMocks({ jobData: null, jobError: { message: 'not found' } });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/bad-id/confirm-completion'
    );
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
    setupConfirmMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('job owner');
  });

  // ---- Job not completed ----
  it('should return 400 when job is not in completed status', async () => {
    setupConfirmMocks({ jobData: { ...completedJob, status: 'in_progress' } });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('Cannot confirm completion');
  });

  // ---- Already confirmed ----
  it('should return 400 when completion is already confirmed', async () => {
    setupConfirmMocks({
      jobData: { ...completedJob, completion_confirmed_by_homeowner: true },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('already been confirmed');
  });

  // ---- No contractor ----
  it('should return 400 when no contractor is assigned', async () => {
    setupConfirmMocks({
      jobData: { ...completedJob, contractor_id: null },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('No contractor assigned');
  });

  // ---- Idempotency: duplicate request ----
  it('should return cached result for duplicate request', async () => {
    const cachedResult = {
      success: true,
      message:
        'Job completion confirmed successfully. Payment is being processed.',
    };
    mocks.checkIdempotency.mockResolvedValue({
      isDuplicate: true,
      cachedResult,
    });

    setupConfirmMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ---- Success ----
  it('should confirm completion and initiate escrow release', async () => {
    setupConfirmMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Payment is being processed');
  });

  it('should allow the designated payer to confirm completion', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      ...homeownerUser,
      id: 'payer-1',
      email: 'payer@test.com',
    });
    setupConfirmMocks({
      jobData: {
        ...completedJob,
        payer_user_id: 'payer-1',
      },
    });

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    const res = await POST(req, segmentData('job-1'));

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  // ---- Stores idempotency result ----
  it('should store the idempotency result after success', async () => {
    setupConfirmMocks();

    const req = createPostRequest(
      'http://localhost:3000/api/jobs/job-1/confirm-completion'
    );
    await POST(req, segmentData('job-1'));

    expect(mocks.storeIdempotencyResult).toHaveBeenCalledWith(
      'idem-key-123',
      'confirm_completion',
      expect.objectContaining({ success: true }),
      'homeowner-1',
      expect.objectContaining({ jobId: 'job-1' }),
      { userId: 'homeowner-1', claimToken: 'request-token' }
    );
  });

  // =========================================================================
  // Depth: the confirm-completion → escrow-auto-release cron HANDOFF
  // (audit 2026-07-27)
  //
  // The route does NOT release money itself. Its entire contract with the
  // cron (EscrowAutoReleaseService) is a field stamp on the held escrow row:
  //   status STAYS 'held'  +  auto_release_enabled=true  +
  //   auto_release_date=now  +  homeowner_approval=true
  // The cron's predicate filters on exactly those fields. If the stamp
  // drifts (or starts flipping status), funds park forever — the 2026-05-13
  // "funds stuck in limbo" incident. These tests pin the stamp.
  // =========================================================================
  describe('handoff to escrow-auto-release cron', () => {
    function setupHandoffMocks(opts: {
      escrowData?: Record<string, unknown> | null;
      photoCount?: number;
      secondPhotoCount?: number;
      escrowReadError?: unknown;
      jobWriteError?: unknown;
      releaseError?: unknown;
      rollbackError?: unknown;
      casRows?: unknown[];
      jobUpdates?: Array<Record<string, unknown>>;
      escrowUpdates?: Array<Record<string, unknown>>;
    }) {
      const escrowResult = {
        data:
          opts.escrowData === undefined
            ? { id: 'escrow-1', status: 'held', amount: 25000 }
            : opts.escrowData,
        error: opts.escrowReadError ?? null,
      };
      let photoCalls = 0;
      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: completedJob, error: null }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              opts.jobUpdates?.push(payload as Record<string, unknown>);
              const result = payload.completion_confirmed_by_homeowner
                ? {
                    data: opts.casRows ?? [{ id: 'job-1' }],
                    error: opts.jobWriteError ?? null,
                  }
                : { error: opts.rollbackError ?? null };
              const promise = Promise.resolve(result);
              const query = {
                eq: vi.fn(),
                select: vi.fn(() => promise),
                then: promise.then.bind(promise),
              };
              query.eq.mockReturnValue(query);
              return query;
            }),
          };
        }
        if (table === 'escrow_transactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue(escrowResult),
                  }),
                }),
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue(escrowResult),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              opts.escrowUpdates?.push(payload as Record<string, unknown>);
              return {
                eq: vi
                  .fn()
                  .mockResolvedValue({ error: opts.releaseError ?? null }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    email: 'test@test.com',
                    first_name: 'Test',
                    last_name: 'User',
                    company_name: 'Test Co',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'job_photos_metadata') {
          photoCalls++;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    count:
                      photoCalls > 1
                        ? (opts.secondPhotoCount ?? opts.photoCount ?? 3)
                        : (opts.photoCount ?? 3),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });
    }

    it.each([
      { escrowReadError: new Error('Escrow unavailable') },
      { jobWriteError: new Error('Job write unavailable') },
      { casRows: [] },
    ])(
      'fails closed before releasing escrow when preflight/CAS fails: %j',
      async (options) => {
        const escrowUpdates: Record<string, unknown>[] = [];
        setupHandoffMocks({ ...options, escrowUpdates });
        const res = await POST(
          createPostRequest(
            'http://localhost:3000/api/jobs/job-1/confirm-completion'
          ),
          segmentData('job-1')
        );
        expect([409, 500]).toContain(res.status);
        expect(escrowUpdates).toEqual([]);
        expect(mocks.notifyJobConfirmed).not.toHaveBeenCalled();
      }
    );
    it.each([false, true])(
      'rolls back its confirmation when escrow preparation fails (rollback error=%s)',
      async (failRollback) => {
        const jobUpdates: Record<string, unknown>[] = [];
        setupHandoffMocks({
          jobUpdates,
          releaseError: new Error('Escrow write unavailable'),
          rollbackError: failRollback
            ? new Error('Rollback unavailable')
            : undefined,
        });
        const res = await POST(
          createPostRequest(
            'http://localhost:3000/api/jobs/job-1/confirm-completion'
          ),
          segmentData('job-1')
        );
        expect(res.status).toBe(500);
        expect(
          jobUpdates.map((row) => row.completion_confirmed_by_homeowner)
        ).toEqual([true, false]);
        expect(mocks.notifyJobConfirmed).not.toHaveBeenCalled();
        expect(mocks.storeIdempotencyResult).not.toHaveBeenCalled();
        if (failRollback)
          expect(mocks.logger.error).toHaveBeenCalledWith(
            'Failed to roll back job confirmation after escrow failure',
            expect.any(Error),
            expect.any(Object)
          );
      }
    );
    it('rolls back if evidence disappears between preflight and release preparation', async () => {
      const jobUpdates: Record<string, unknown>[] = [];
      const escrowUpdates: Record<string, unknown>[] = [];
      setupHandoffMocks({
        jobUpdates,
        escrowUpdates,
        photoCount: 3,
        secondPhotoCount: 0,
      });
      const res = await POST(
        createPostRequest(
          'http://localhost:3000/api/jobs/job-1/confirm-completion'
        ),
        segmentData('job-1')
      );
      expect(res.status).toBe(400);
      expect(
        jobUpdates.map((row) => row.completion_confirmed_by_homeowner)
      ).toEqual([true, false]);
      expect(escrowUpdates).toEqual([]);
      expect(mocks.notifyJobConfirmed).not.toHaveBeenCalled();
    });

    it('stamps the held escrow with EXACTLY the cron-pickup fields and does NOT flip status', async () => {
      const escrowUpdates: Array<Record<string, unknown>> = [];
      const jobUpdates: Array<Record<string, unknown>> = [];
      setupHandoffMocks({ escrowUpdates, jobUpdates });

      const res = await POST(
        createPostRequest(
          'http://localhost:3000/api/jobs/job-1/confirm-completion'
        ),
        segmentData('job-1')
      );
      expect(res.status).toBe(200);

      expect(escrowUpdates).toHaveLength(1);
      const stamp = escrowUpdates[0];
      // The cron predicate: status='held' AND auto_release_enabled AND
      // auto_release_date <= now. The stamp must satisfy it…
      expect(stamp.auto_release_enabled).toBe(true);
      expect(typeof stamp.auto_release_date).toBe('string');
      expect(
        new Date(stamp.auto_release_date as string).getTime()
      ).toBeLessThanOrEqual(Date.now() + 1000);
      expect(stamp.homeowner_approval).toBe(true);
      expect(stamp.homeowner_inspection_completed).toBe(true);
      expect(stamp.release_reason).toBe('homeowner_approved');
      // …and must NOT touch status: 'held' is what the cron claims via CAS.
      expect(stamp).not.toHaveProperty('status');

      // Job flag: confirmation timestamp, and completed_at NOT overwritten
      // (contractor-declared vs homeowner-approved are distinct events).
      const jobStamp = jobUpdates.find(
        (u) => u.completion_confirmed_by_homeowner === true
      );
      expect(jobStamp).toBeDefined();
      expect(typeof jobStamp!.completion_confirmed_at).toBe('string');
      expect(jobStamp).not.toHaveProperty('completed_at');
    });

    it('escrow already release_pending → succeeds WITHOUT re-stamping (cron already processing)', async () => {
      const escrowUpdates: Array<Record<string, unknown>> = [];
      setupHandoffMocks({
        escrowData: {
          id: 'escrow-1',
          status: 'release_pending',
          amount: 25000,
        },
        escrowUpdates,
      });

      const res = await POST(
        createPostRequest(
          'http://localhost:3000/api/jobs/job-1/confirm-completion'
        ),
        segmentData('job-1')
      );
      expect(res.status).toBe(200);
      expect(escrowUpdates).toHaveLength(0);
    });

    it('escrow in a terminal state → 400 BEFORE mutating the job (recoverable for the homeowner)', async () => {
      const jobUpdates: Array<Record<string, unknown>> = [];
      setupHandoffMocks({
        escrowData: { id: 'escrow-1', status: 'completed', amount: 25000 },
        jobUpdates,
      });

      const res = await POST(
        createPostRequest(
          'http://localhost:3000/api/jobs/job-1/confirm-completion'
        ),
        segmentData('job-1')
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('completed');
      // The pre-flight gate must fire before the confirmation flag is set —
      // otherwise the homeowner can never retry (the "already confirmed"
      // guard would block them forever).
      expect(jobUpdates).toHaveLength(0);
    });

    it('no escrow row at all → 400 with no job mutation', async () => {
      const jobUpdates: Array<Record<string, unknown>> = [];
      setupHandoffMocks({ escrowData: null, jobUpdates });

      const res = await POST(
        createPostRequest(
          'http://localhost:3000/api/jobs/job-1/confirm-completion'
        ),
        segmentData('job-1')
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('No payment record');
      expect(jobUpdates).toHaveLength(0);
    });

    it('no after-photos → 400 BEFORE the confirmation write (photo gate precedes mutation)', async () => {
      const jobUpdates: Array<Record<string, unknown>> = [];
      const escrowUpdates: Array<Record<string, unknown>> = [];
      setupHandoffMocks({ photoCount: 0, jobUpdates, escrowUpdates });

      const res = await POST(
        createPostRequest(
          'http://localhost:3000/api/jobs/job-1/confirm-completion'
        ),
        segmentData('job-1')
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toContain('after-photos');
      expect(jobUpdates).toHaveLength(0);
      expect(escrowUpdates).toHaveLength(0);
    });
  });
});
