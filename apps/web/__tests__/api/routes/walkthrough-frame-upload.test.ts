// @vitest-environment node
/**
 * Tests for POST /api/assessments/walkthrough  (multipart/form-data)
 * Route: apps/web/app/api/assessments/walkthrough/route.ts
 *
 * The mobile client extracts keyframes on-device and POSTs the frame IMAGES
 * here as multipart FormData under the field name `frames`. The server:
 *   - gates on the per-user AI cost budget (429),
 *   - parses the multipart body (400 if it isn't multipart),
 *   - requires an anchor (propertyId | jobId) and 2..20 frames,
 *   - authorizes the anchor via authorizeAssessmentAnchors (throws Forbidden),
 *   - uploads each frame to the `assessment-photos` bucket with the service
 *     role, SKIPPING oversize (>8MB) or non-image (magic-byte) frames
 *     (SEC-002 hardening) — surviving < MIN_FRAMES -> 502,
 *   - fans the surviving frame URLs through the VLM (assessWalkthrough),
 *   - persists ONE building_assessments row (persistWalkthroughRow) -> 500 if
 *     null, 422 if no assessment was produced,
 *   - returns 200 with { ...assessment, assessmentId, frameCount, framesAssessed }.
 *
 * This suite was rewritten from an older URL-based version of the route (which
 * POSTed JSON `{ frameUrls }` and authorized via PropertyTeamService +
 * validateImageUrls). The production route is multipart; the tests below drive
 * it with real FormData + File objects carrying real image magic bytes.
 */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  supabaseFrom: vi.fn(),
  storageUpload: vi.fn(),
  storageGetPublicUrl: vi.fn(),
  authorizeAssessmentAnchors: vi.fn(),
  checkAICostBudget: vi.fn(),
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
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mocks.storageUpload(...args),
        getPublicUrl: (...args: unknown[]) =>
          mocks.storageGetPublicUrl(...args),
      }),
    },
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

// The real route authorizes anchors through this helper, which THROWS a
// ForbiddenError on unauthorized. Mock it: resolve by default; individual
// tests make it reject to exercise the 403 propagation.
vi.mock('@/app/api/building-surveyor/assess/_anchor-authorization', () => ({
  authorizeAssessmentAnchors: mocks.authorizeAssessmentAnchors,
}));

vi.mock(
  '@/lib/services/building-surveyor/config/BuildingSurveyorConfig',
  () => ({
    getConfig: vi.fn(() => ({ openaiApiKey: 'test-openai-key' })),
  })
);

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
const JOB_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROPERTY_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const PUBLIC_URL = 'https://storage.example/test/frame.jpg';

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

/** A valid JPEG frame: FF D8 FF E0 header + padding (>= 12 bytes). */
function jpegFile(name = 'f.jpg'): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(20).fill(0)]);
  return new File([bytes], name, { type: 'image/jpeg' });
}

/** A non-image frame: plain text bytes that match no image signature. */
function junkFile(name = 'note.txt'): File {
  const bytes = Buffer.from('this is not an image at all as text....');
  return new File([bytes], name, { type: 'image/jpeg' });
}

/** A frame whose byte size exceeds the 8MB cap (valid JPEG header). */
function oversizeFile(name = 'huge.jpg'): File {
  const size = 8 * 1024 * 1024 + 10;
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xe0;
  return new File([bytes], name, { type: 'image/jpeg' });
}

/** Build a multipart POST with the given frame files + anchor/extra fields. */
function multipartRequest(
  frames: File[],
  fields: Record<string, string> = {}
): NextRequest {
  const fd = new FormData();
  for (const f of frames) fd.append('frames', f);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new NextRequest('http://localhost:3000/api/assessments/walkthrough', {
    method: 'POST',
    body: fd,
    // undici derives the multipart content-type + boundary from the FormData body.
  });
}

/** A JSON (non-multipart) POST — request.formData() will reject. */
function jsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/assessments/walkthrough', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(
    userOf(HOMEOWNER_ID, 'homeowner')
  );
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 2,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkAICostBudget.mockResolvedValue({ allowed: true });
  mocks.authorizeAssessmentAnchors.mockResolvedValue(undefined);
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.storageGetPublicUrl.mockReturnValue({
    data: { publicUrl: PUBLIC_URL },
  });
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'assessment_images') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  });
  mocks.assessWalkthrough.mockResolvedValue({
    assessment: fakeAssessment,
    perFrameAssessments: [
      { url: PUBLIC_URL, assessment: fakeAssessment },
      { url: PUBLIC_URL, assessment: fakeAssessment },
    ],
    frameCount: 2,
    framesAssessed: 2,
  });
  mocks.persistWalkthroughRow.mockResolvedValue('assessment-1');
  mocks.scheduleWalkthroughTraining.mockReturnValue(undefined);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/assessments/walkthrough (multipart)', () => {
  let POST: typeof import('@/app/api/assessments/walkthrough/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/assessments/walkthrough/route');
    POST = mod.POST;
  });

  // ---- Auth ----
  it('returns 401 when unauthenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);
    mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);

    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(401);
    expect(mocks.authorizeAssessmentAnchors).not.toHaveBeenCalled();
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
  });

  // ---- AI cost budget gate ----
  it('returns 429 with the budget reason code when over the AI cap', async () => {
    mocks.checkAICostBudget.mockResolvedValue({
      allowed: false,
      reason: 'monthly_cap_exceeded',
    });

    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('monthly_cap_exceeded');
    // Gate fires before parsing / authorizing / spending.
    expect(mocks.authorizeAssessmentAnchors).not.toHaveBeenCalled();
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  // ---- Multipart parsing ----
  it('returns 400 when the body is not multipart/form-data', async () => {
    const res = await POST(jsonRequest({ frameUrls: ['x'], jobId: JOB_ID }));
    expect(res.status).toBe(400);
    expect(mocks.authorizeAssessmentAnchors).not.toHaveBeenCalled();
  });

  // ---- Field validation ----
  it('returns 400 when neither jobId nor propertyId anchors the walk', async () => {
    const res = await POST(multipartRequest([jpegFile(), jpegFile('g.jpg')]));
    expect(res.status).toBe(400);
    expect(mocks.authorizeAssessmentAnchors).not.toHaveBeenCalled();
  });

  it('returns 400 when fewer than 2 valid frames are supplied', async () => {
    const res = await POST(multipartRequest([jpegFile()], { jobId: JOB_ID }));
    expect(res.status).toBe(400);
    expect(mocks.authorizeAssessmentAnchors).not.toHaveBeenCalled();
  });

  it('returns 400 when more than 20 frames are supplied', async () => {
    const frames = Array.from({ length: 21 }, (_, i) => jpegFile(`f${i}.jpg`));
    const res = await POST(multipartRequest(frames, { jobId: JOB_ID }));
    expect(res.status).toBe(400);
    expect(mocks.authorizeAssessmentAnchors).not.toHaveBeenCalled();
  });

  // ---- Happy path ----
  it('uploads, assesses, persists and returns 200 for 2 valid frames + jobId', async () => {
    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assessmentId).toBe('assessment-1');
    expect(body.frameCount).toBe(2);
    expect(body.framesAssessed).toBe(2);

    expect(mocks.authorizeAssessmentAnchors).toHaveBeenCalledWith(
      expect.objectContaining({ userId: HOMEOWNER_ID, jobId: JOB_ID })
    );
    // Both valid frames uploaded.
    expect(mocks.storageUpload).toHaveBeenCalledTimes(2);
    expect(mocks.assessWalkthrough).toHaveBeenCalledTimes(1);
    expect(mocks.persistWalkthroughRow).toHaveBeenCalledWith(
      expect.objectContaining({ userId: HOMEOWNER_ID, jobId: JOB_ID })
    );
    expect(mocks.scheduleWalkthroughTraining).toHaveBeenCalledTimes(1);
  });

  it('accepts a propertyId anchor', async () => {
    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], {
        propertyId: PROPERTY_ID,
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.authorizeAssessmentAnchors).toHaveBeenCalledWith(
      expect.objectContaining({ userId: HOMEOWNER_ID, propertyId: PROPERTY_ID })
    );
  });

  // ---- Authorization failure propagates ----
  it('propagates 403 when the anchor is not authorized and does not upload or persist', async () => {
    const { ForbiddenError } = await import('@/lib/errors/api-error');
    mocks.authorizeAssessmentAnchors.mockRejectedValue(
      new ForbiddenError('You do not have access to this job')
    );

    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toContain('access to this job');

    expect(mocks.storageUpload).not.toHaveBeenCalled();
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  // ---- SEC-002: non-image / oversize frames are skipped ----
  it('SEC-002: skips a non-image frame — 2 real + 1 junk still succeeds with 2 uploads', async () => {
    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg'), junkFile()], {
        jobId: JOB_ID,
      })
    );
    expect(res.status).toBe(200);
    // Only the two real images made it past the magic-byte check.
    expect(mocks.storageUpload).toHaveBeenCalledTimes(2);
  });

  it('SEC-002: 1 real + 1 junk -> survivors < MIN_FRAMES -> 502', async () => {
    const res = await POST(
      multipartRequest([jpegFile(), junkFile()], { jobId: JOB_ID })
    );
    expect(res.status).toBe(502);
    // Only the one real frame was uploaded; the junk frame was skipped.
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  it('SEC-002: skips an oversize (>8MB) frame — 1 real + 1 oversize -> 502', async () => {
    const res = await POST(
      multipartRequest([jpegFile(), oversizeFile()], { jobId: JOB_ID })
    );
    expect(res.status).toBe(502);
    // Oversize frame is skipped before reading bytes; only the real one uploads.
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
  });

  // ---- Upload / assess / persist failure branches ----
  it('returns 502 when all storage uploads fail', async () => {
    mocks.storageUpload.mockResolvedValue({ error: { message: 'boom' } });

    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(502);
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  it('returns 422 when assessWalkthrough yields no assessment', async () => {
    mocks.assessWalkthrough.mockResolvedValue({
      assessment: null,
      perFrameAssessments: [],
      frameCount: 2,
      framesAssessed: 0,
    });

    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(422);
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  it('returns 500 when persistWalkthroughRow returns null', async () => {
    mocks.persistWalkthroughRow.mockResolvedValue(null);

    const res = await POST(
      multipartRequest([jpegFile(), jpegFile('g.jpg')], { jobId: JOB_ID })
    );
    expect(res.status).toBe(500);
    expect(mocks.scheduleWalkthroughTraining).not.toHaveBeenCalled();
  });
});
