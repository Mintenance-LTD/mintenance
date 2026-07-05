// @vitest-environment node
/**
 * Tests for POST /api/assessments/walkthrough
 * Route: apps/web/app/api/assessments/walkthrough/route.ts
 *
 * SEC-001 (CWE-639) regression suite: the jobId anchor must be authorized —
 * only the job's homeowner, assigned contractor, or a property-team member on
 * the job's property may bind a walkthrough assessment to it. Also covers the
 * pre-existing propertyId guard and the happy paths.
 *
 * The anchor-authorization helper
 * (app/api/building-surveyor/assess/_anchor-authorization.ts) is NOT mocked —
 * these tests exercise it for real against mocked Supabase/PropertyTeam layers.
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
  checkAICostBudget: vi.fn(),
  propertyTeamAuthorize: vi.fn(),
  validateImageUrls: vi.fn(),
  assessWalkthrough: vi.fn(),
  persistWalkthroughRow: vi.fn(),
  scheduleWalkthroughTraining: vi.fn(),
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

vi.mock('@/lib/ai/cost-budget', () => ({
  checkAICostBudget: mocks.checkAICostBudget,
}));

vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: mocks.propertyTeamAuthorize },
}));

vi.mock(
  '@/lib/services/building-surveyor/config/BuildingSurveyorConfig',
  () => ({
    getConfig: vi.fn(() => ({ openaiApiKey: 'test-openai-key' })),
  })
);

vi.mock('@/app/api/building-surveyor/assess/_image-validation', () => ({
  validateImageUrls: mocks.validateImageUrls,
}));

vi.mock(
  '@/lib/services/building-surveyor/video/walkthrough-assessment',
  () => ({
    assessWalkthrough: mocks.assessWalkthrough,
  })
);

vi.mock('@/app/api/assessments/walkthrough/_persist-and-capture', () => ({
  persistWalkthroughRow: mocks.persistWalkthroughRow,
  scheduleWalkthroughTraining: mocks.scheduleWalkthroughTraining,
}));

vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: vi.fn(() => 'test-idempotency-key'),
  checkIdempotency: vi.fn().mockResolvedValue(null),
  storeIdempotencyResult: vi.fn().mockResolvedValue(undefined),
  releaseOnError: vi.fn(
    async (_key: string, _op: string, fn: () => Promise<unknown>) => fn()
  ),
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
  class ServiceUnavailableError extends APIError {
    constructor(service = 'Service') {
      super(
        'SERVICE_UNAVAILABLE',
        `${service} is temporarily unavailable`,
        503
      );
    }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    ServiceUnavailableError,
    handleAPIError: vi.fn((error: unknown) => {
      const { NextResponse } = require('next/server');
      if (error instanceof APIError) {
        return NextResponse.json(error.toResponse(), {
          status: error.statusCode,
        });
      }
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
// Fixtures + helpers
// ---------------------------------------------------------------------------
const HOMEOWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONTRACTOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ATTACKER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const JOB_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROPERTY_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const FRAME_URLS = [
  'https://storage.googleapis.com/test/frame-0.jpg',
  'https://storage.googleapis.com/test/frame-1.jpg',
];

const fakeAssessment = {
  damageAssessment: {
    damageType: 'pipe_leak',
    severity: 'medium',
    confidence: 0.9,
  },
  safetyHazards: { overallSafetyScore: 80 },
  compliance: { complianceScore: 85 },
  insuranceRisk: { riskScore: 30 },
  urgency: { urgency: 'soon' },
  contractorAdvice: { recommendedTrades: ['plumber'] },
  findings: [{ id: 'f1' }],
};

function userOf(id: string, role: 'homeowner' | 'contractor') {
  return {
    id,
    email: `${role}@test.com`,
    role,
    first_name: 'Test',
    last_name: role,
  };
}

function walkthroughRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    new URL('/api/assessments/walkthrough', 'http://localhost:3000'),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
        'x-csrf-token': 'test-csrf-token',
      },
      body: JSON.stringify(body),
    }
  );
}

/** Configure serverSupabase.from for the jobs lookup + frame-image insert. */
function setupSupabaseMock(job: unknown) {
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: job,
              error: job ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    }
    if (table === 'assessment_images') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(
    userOf(HOMEOWNER_ID, 'homeowner')
  );
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 2,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkAICostBudget.mockResolvedValue({ allowed: true });
  mocks.validateImageUrls.mockReturnValue(undefined);
  mocks.propertyTeamAuthorize.mockResolvedValue({
    authorized: false,
    role: null,
  });
  mocks.assessWalkthrough.mockResolvedValue({
    assessment: fakeAssessment,
    perFrameAssessments: FRAME_URLS.map((url) => ({
      url,
      assessment: fakeAssessment,
    })),
    frameCount: FRAME_URLS.length,
    framesAssessed: FRAME_URLS.length,
  });
  mocks.persistWalkthroughRow.mockResolvedValue('assessment-1');
  mocks.scheduleWalkthroughTraining.mockReturnValue(undefined);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/assessments/walkthrough', () => {
  let POST: typeof import('@/app/api/assessments/walkthrough/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/assessments/walkthrough/route');
    POST = mod.POST;
  });

  // ---- SEC-001: jobId anchor IDOR ----
  it("should return 403 when jobId belongs to another user's job", async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(
      userOf(ATTACKER_ID, 'homeowner')
    );
    setupSupabaseMock({
      homeowner_id: HOMEOWNER_ID,
      contractor_id: CONTRACTOR_ID,
      property_id: null,
    });

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, jobId: JOB_ID })
    );
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('access to this job');
    // The guard must fire BEFORE any AI spend or persistence.
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  it('should return 403 when the job does not exist', async () => {
    setupSupabaseMock(null);

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, jobId: JOB_ID })
    );
    expect(res.status).toBe(403);
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  // ---- Happy paths ----
  it("should accept the job's homeowner and persist the walkthrough", async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(
      userOf(HOMEOWNER_ID, 'homeowner')
    );
    setupSupabaseMock({
      homeowner_id: HOMEOWNER_ID,
      contractor_id: CONTRACTOR_ID,
      property_id: null,
    });

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, jobId: JOB_ID })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assessmentId).toBe('assessment-1');
    expect(body.frameCount).toBe(2);
    expect(mocks.persistWalkthroughRow).toHaveBeenCalledWith(
      expect.objectContaining({ userId: HOMEOWNER_ID, jobId: JOB_ID })
    );
  });

  it('should accept the assigned contractor', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(
      userOf(CONTRACTOR_ID, 'contractor')
    );
    setupSupabaseMock({
      homeowner_id: HOMEOWNER_ID,
      contractor_id: CONTRACTOR_ID,
      property_id: null,
    });

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, jobId: JOB_ID })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assessmentId).toBe('assessment-1');
    expect(mocks.persistWalkthroughRow).toHaveBeenCalledWith(
      expect.objectContaining({ userId: CONTRACTOR_ID, jobId: JOB_ID })
    );
  });

  it("should accept a property-team member on the job's property", async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(
      userOf(ATTACKER_ID, 'homeowner') // not a job party...
    );
    setupSupabaseMock({
      homeowner_id: HOMEOWNER_ID,
      contractor_id: CONTRACTOR_ID,
      property_id: PROPERTY_ID,
    });
    // ...but IS on the property team.
    mocks.propertyTeamAuthorize.mockResolvedValue({
      authorized: true,
      role: 'manager',
    });

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, jobId: JOB_ID })
    );
    expect(res.status).toBe(200);
    expect(mocks.propertyTeamAuthorize).toHaveBeenCalledWith(
      ATTACKER_ID,
      PROPERTY_ID,
      'view'
    );
  });

  // ---- propertyId anchor guard (pre-existing, must be preserved) ----
  it('should return 403 when propertyId is not authorized', async () => {
    setupSupabaseMock(null);
    mocks.propertyTeamAuthorize.mockResolvedValue({
      authorized: false,
      role: null,
    });

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, propertyId: PROPERTY_ID })
    );
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('access to this property');
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
  });

  it('should accept an authorized propertyId anchor', async () => {
    setupSupabaseMock(null);
    mocks.propertyTeamAuthorize.mockResolvedValue({
      authorized: true,
      role: 'owner',
    });

    const res = await POST(
      walkthroughRequest({ frameUrls: FRAME_URLS, propertyId: PROPERTY_ID })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assessmentId).toBe('assessment-1');
  });

  // ---- Schema anchor requirement ----
  it('should return 400 when neither jobId nor propertyId is provided', async () => {
    setupSupabaseMock(null);

    const res = await POST(walkthroughRequest({ frameUrls: FRAME_URLS }));
    expect(res.status).toBe(400);
  });
});
