// @vitest-environment node
/**
 * Tests for GET /api/assessments/:id/status
 * Route: apps/web/app/api/assessments/[id]/status/route.ts
 *
 * This route gated its whole payload on
 *   isComplete = validation_status === 'completed' || 'validated'
 * but `validation_status` tracks HUMAN sign-off, not AI progress, and every
 * walkthrough persists as 'pending'. Live check on 2026-07-28: all 10 rows in
 * building_assessments were 'pending', so the route returned
 * `assessment: null` for 100% of assessments ever created. Assessment history
 * had nothing to render and the correction page silently showed a blank record.
 *
 * What is pinned here:
 *   - a finished-but-unvalidated survey returns its data
 *   - a genuinely-still-processing one does not
 *   - isComplete / isFailed still mean what pollers think they mean
 *   - ownership is enforced, and stored image URLs are re-signed on read
 */
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  supabaseFrom: vi.fn(),
  resignAssessmentUrls: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserFromCookies: mocks.getCurrentUserFromCookies,
  getCurrentUserFromBearerToken: mocks.getCurrentUserFromBearerToken,
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...a: unknown[]) => mocks.supabaseFrom(...a) },
}));

vi.mock('@/lib/api/assessment-storage', () => ({
  resignAssessmentUrls: (...a: unknown[]) => mocks.resignAssessmentUrls(...a),
}));

vi.mock('@/lib/csrf', () => ({ requireCSRF: vi.fn() }));
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
vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

vi.mock('@/lib/errors/api-error', async () => {
  class APIError extends Error {
    constructor(
      public code: string,
      public userMessage: string,
      public statusCode: number = 500
    ) {
      super(userMessage);
      this.name = 'APIError';
    }
    toResponse() {
      return { error: { code: this.code, message: this.userMessage } };
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
    constructor(m = 'Bad Request') {
      super('BAD_REQUEST', m, 400);
    }
  }
  return {
    APIError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    handleAPIError: vi.fn((error: unknown) => {
      const { NextResponse } = require('next/server');
      if (error instanceof APIError) {
        return NextResponse.json(error.toResponse(), {
          status: error.statusCode,
        });
      }
      return NextResponse.json({ error: 'unexpected' }, { status: 500 });
    }),
  };
});

// ---------------------------------------------------------------------------
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ASSESSMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const homeowner = {
  id: USER_ID,
  email: 'h@test.com',
  role: 'homeowner' as const,
  first_name: 'T',
  last_name: 'H',
};

/** A walkthrough as it is actually persisted: results present, sign-off pending. */
function assessmentRow(over: Record<string, unknown> = {}) {
  return {
    id: ASSESSMENT_ID,
    user_id: USER_ID,
    property_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    domain: 'building',
    damage_type: 'damp',
    severity: 'significant',
    confidence: 70,
    safety_score: 60,
    compliance_score: 70,
    insurance_risk_score: 40,
    urgency: 'urgent',
    assessment_data: { damageAssessment: { confidence: 70 }, findings: [] },
    validation_status: 'pending',
    video_url: null,
    created_at: '2026-07-28T21:54:12.490Z',
    updated_at: '2026-07-28T21:54:12.490Z',
    ...over,
  };
}

/** building_assessments then assessment_images. */
function wireDb(row: Record<string, unknown> | null, images: unknown[] = []) {
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'building_assessments') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: row,
              error: row ? null : { message: 'not found' },
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({ order: async () => ({ data: images, error: null }) }),
      }),
    };
  });
}

async function get() {
  const { GET } = await import('@/app/api/assessments/[id]/status/route');
  return GET(
    new NextRequest(
      new URL(
        `/api/assessments/${ASSESSMENT_ID}/status`,
        'http://localhost:3000'
      )
    ),
    { params: Promise.resolve({ id: ASSESSMENT_ID }) }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeowner);
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 59,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.resignAssessmentUrls.mockImplementation(async (urls: string[]) => urls);
});

describe('GET /api/assessments/:id/status', () => {
  it('returns the survey for a pending row that already holds results', async () => {
    // The regression that made assessment history impossible: every walkthrough
    // is 'pending', and every one of them used to come back as null.
    wireDb(assessmentRow());

    const res = await get();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.assessment).not.toBeNull();
    expect(body.assessment.damageType).toBe('damp');
    expect(body.assessment.data).toEqual({
      damageAssessment: { confidence: 70 },
      findings: [],
    });
  });

  it('still reports isComplete false while awaiting human sign-off', async () => {
    // Pollers key off isComplete; returning the data must not change its meaning.
    wireDb(assessmentRow());

    const body = await (await get()).json();

    expect(body.status).toBe('pending');
    expect(body.isComplete).toBe(false);
    expect(body.isFailed).toBe(false);
  });

  it('withholds the survey while the AI is genuinely still working', async () => {
    wireDb(
      assessmentRow({ validation_status: 'processing', damage_type: null })
    );

    const body = await (await get()).json();

    expect(body.assessment).toBeNull();
  });

  it('withholds the survey for a processing row even if a damage type leaked in', async () => {
    // 'processing' is the one status that means "not ready", regardless of what
    // partial data happens to be on the row.
    wireDb(assessmentRow({ validation_status: 'processing' }));

    const body = await (await get()).json();

    expect(body.assessment).toBeNull();
  });

  it('returns nothing for a row that never produced a result', async () => {
    wireDb(assessmentRow({ validation_status: 'failed', damage_type: null }));

    const body = await (await get()).json();

    expect(body.assessment).toBeNull();
    expect(body.isFailed).toBe(true);
  });

  it('returns a validated survey', async () => {
    wireDb(assessmentRow({ validation_status: 'validated' }));

    const body = await (await get()).json();

    expect(body.isComplete).toBe(true);
    expect(body.assessment.damageType).toBe('damp');
  });

  it('re-signs stored image urls and preserves their index', async () => {
    // Findings carry a sourceFrameIndex into this list, so index order is the
    // contract — a shuffled or renumbered list pairs findings with the wrong
    // photograph.
    wireDb(assessmentRow(), [
      { id: 'i0', image_url: 'quick-ai/f/0.jpg', image_index: 0 },
      { id: 'i1', image_url: 'quick-ai/f/1.jpg', image_index: 1 },
    ]);
    mocks.resignAssessmentUrls.mockResolvedValue([
      'https://signed/0.jpg',
      'https://signed/1.jpg',
    ]);

    const body = await (await get()).json();

    expect(body.images).toEqual([
      { id: 'i0', image_url: 'https://signed/0.jpg', image_index: 0 },
      { id: 'i1', image_url: 'https://signed/1.jpg', image_index: 1 },
    ]);
  });

  it('hides another user’s assessment as a 404', async () => {
    wireDb(assessmentRow({ user_id: OTHER_ID }));

    const res = await get();

    expect(res.status).toBe(404);
  });

  it('404s when the assessment does not exist', async () => {
    wireDb(null);

    const res = await get();

    expect(res.status).toBe(404);
  });
});
