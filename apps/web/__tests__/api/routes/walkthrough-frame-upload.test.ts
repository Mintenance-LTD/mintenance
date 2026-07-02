// @vitest-environment node
/**
 * Tests for POST /api/assessments/walkthrough
 * Route: apps/web/app/api/assessments/walkthrough/route.ts
 *
 * Regression suite for commit 5d3c94407 "fix(walkthrough): server-mediated
 * frame upload (root-cause fix)". The mobile client POSTs keyframe images as
 * multipart FormData; the server uploads them to the assessment-photos bucket
 * with the service role (the previous RN direct-to-storage path never landed
 * a single byte).
 *
 * Covers: authentication, AI cost budget gate, multipart parsing, field
 * validation (anchor, frame count, context JSON), property authorization,
 * server-side storage upload (bucket/path/options), storage failure -> 502,
 * partial frame failure tolerance, VLM dispatch, cache-key determinism,
 * persistence dispatch + failure, best-effort assessment_images insert,
 * training scheduling, and the cache_key dedup behaviour of
 * persistWalkthroughRow (23505 conflict -> in-place update).
 */
import crypto from 'crypto';
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
  supabaseStorageFrom: vi.fn(),
  storageUpload: vi.fn(),
  storageGetPublicUrl: vi.fn(),
  propertyTeamAuthorize: vi.fn(),
  checkAICostBudget: vi.fn(),
  getConfig: vi.fn(),
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

vi.mock('@/lib/csrf', () => ({ requireCSRF: mocks.requireCSRF }));

vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: mocks.rateLimiterCheckRateLimit },
}));

vi.mock('@/lib/cors', () => ({ getCorsHeaders: vi.fn(() => ({})) }));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
    storage: {
      from: (...args: unknown[]) => mocks.supabaseStorageFrom(...args),
    },
  },
}));

vi.mock('@mintenance/shared', () => ({
  logger: mocks.logger,
  BUSINESS_RULES: {},
  RATE_LIMITS: {},
  TIME_MS: { MINUTE: 60000, HOUR: 3600000 },
}));
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }));

vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: mocks.propertyTeamAuthorize },
}));

vi.mock('@/lib/ai/cost-budget', () => ({
  checkAICostBudget: mocks.checkAICostBudget,
}));

vi.mock(
  '@/lib/services/building-surveyor/config/BuildingSurveyorConfig',
  () => ({ getConfig: mocks.getConfig })
);

vi.mock(
  '@/lib/services/building-surveyor/video/walkthrough-assessment',
  () => ({ assessWalkthrough: mocks.assessWalkthrough })
);

// The route imports these via `./_persist-and-capture`; the alias resolves to
// the same file so the mock applies. The REAL module is exercised in the
// dedicated persistWalkthroughRow describe below via vi.importActual.
vi.mock('@/app/api/assessments/walkthrough/_persist-and-capture', () => ({
  persistWalkthroughRow: mocks.persistWalkthroughRow,
  scheduleWalkthroughTraining: mocks.scheduleWalkthroughTraining,
}));

// Transitive deps of the REAL _persist-and-capture module (describe 2 only).
vi.mock('@/lib/services/building-surveyor/normalization-utils', () => ({
  canonicalizeDamageType: vi.fn((s: string) => s),
}));
vi.mock(
  '@/lib/services/building-surveyor/video/build-walkthrough-assessment',
  () => ({ pickLeadFrame: vi.fn((assessments: unknown[]) => assessments[0]) })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const homeownerUser = {
  id: 'homeowner-1',
  email: 'homeowner@test.com',
  role: 'homeowner' as const,
  first_name: 'Test',
  last_name: 'Homeowner',
};

const mockAssessment = {
  damageAssessment: {
    damageType: 'water_damage',
    severity: 'moderate',
    confidence: 0.9,
  },
  safetyHazards: { overallSafetyScore: 80 },
  compliance: { complianceScore: 75 },
  insuranceRisk: { riskScore: 40 },
  urgency: { urgency: 'medium' },
  contractorAdvice: { recommendedTrades: ['plumber'] },
  findings: [{ id: 'f1' }],
};

function createFrameFile(name = 'frame.jpg', bytes = 64): File {
  return new File([new Uint8Array(bytes).fill(1)], name, {
    type: 'image/jpeg',
  });
}

function createWalkthroughRequest(opts: {
  frames?: File[];
  propertyId?: string;
  jobId?: string;
  domain?: string;
  context?: string;
  rawJsonBody?: boolean;
}): NextRequest {
  const url = 'http://localhost:3000/api/assessments/walkthrough';
  if (opts.rawJsonBody) {
    return new NextRequest(new URL(url), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify({ hello: 'world' }),
    });
  }
  const formData = new FormData();
  for (const frame of opts.frames ?? []) formData.append('frames', frame);
  if (opts.propertyId) formData.append('propertyId', opts.propertyId);
  if (opts.jobId) formData.append('jobId', opts.jobId);
  if (opts.domain) formData.append('domain', opts.domain);
  if (opts.context) formData.append('context', opts.context);
  return new NextRequest(new URL(url), {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: formData,
  });
}

const segmentData = { params: Promise.resolve({}) };

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeownerUser);
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 2,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.checkAICostBudget.mockResolvedValue({ allowed: true });
  mocks.propertyTeamAuthorize.mockResolvedValue({ authorized: true });
  mocks.getConfig.mockReturnValue({ openaiApiKey: 'test-openai-key' });

  // Storage: upload succeeds; public URL derived from the path so each frame
  // gets a unique, deterministic URL.
  mocks.storageUpload.mockResolvedValue({
    data: { path: 'quick-ai/x/0.jpg' },
    error: null,
  });
  mocks.storageGetPublicUrl.mockImplementation((path: string) => ({
    data: { publicUrl: `https://cdn.example.com/${path}` },
  }));
  mocks.supabaseStorageFrom.mockReturnValue({
    upload: mocks.storageUpload,
    getPublicUrl: mocks.storageGetPublicUrl,
  });

  // assessment_images insert succeeds by default.
  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === 'assessment_images') {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  });

  mocks.assessWalkthrough.mockImplementation(async (frameUrls: string[]) => ({
    assessment: mockAssessment,
    perFrameAssessments: frameUrls.map((url) => ({
      url,
      assessment: mockAssessment,
    })),
    frameCount: frameUrls.length,
    framesAssessed: frameUrls.length,
  }));

  mocks.persistWalkthroughRow.mockResolvedValue('assessment-1');
  mocks.scheduleWalkthroughTraining.mockReturnValue(undefined);
}

// ---------------------------------------------------------------------------
// Route tests
// ---------------------------------------------------------------------------
describe('POST /api/assessments/walkthrough', () => {
  let POST: typeof import('@/app/api/assessments/walkthrough/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/assessments/walkthrough/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('returns 401 when the user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(401);

    // Nothing downstream may run for an unauthenticated caller.
    expect(mocks.checkAICostBudget).not.toHaveBeenCalled();
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  // ---- AI cost budget gate ----
  it('returns 429 with the budget code when the AI cost cap is exceeded', async () => {
    mocks.checkAICostBudget.mockResolvedValue({
      allowed: false,
      reason: 'daily_cap_exceeded',
    });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.code).toBe('daily_cap_exceeded');
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  // ---- Multipart parsing ----
  it('returns 400 when the body is not multipart/form-data', async () => {
    const req = createWalkthroughRequest({ rawJsonBody: true });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('multipart/form-data');
  });

  it('returns 400 when the context field is not valid JSON', async () => {
    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
      context: '{not-json',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('context must be valid JSON');
  });

  // ---- Field validation ----
  it('returns 400 when neither propertyId nor jobId is provided', async () => {
    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('propertyId or jobId');
  });

  it('returns 400 when fewer than 2 frames are provided', async () => {
    const req = createWalkthroughRequest({
      frames: [createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('At least 2 frames');
  });

  it('ignores zero-byte frame files when counting frames', async () => {
    // 1 real frame + 1 empty file = only 1 usable frame -> below MIN_FRAMES.
    const empty = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const req = createWalkthroughRequest({
      frames: [createFrameFile(), empty],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('At least 2 frames');
  });

  it('returns 400 when more than 20 frames are provided', async () => {
    const frames = Array.from({ length: 21 }, (_, i) =>
      createFrameFile(`frame-${i}.jpg`)
    );
    const req = createWalkthroughRequest({ frames, propertyId: 'prop-1' });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('At most 20 frames');
  });

  // ---- Property authorization ----
  it('returns 403 when the caller has no access to the property', async () => {
    mocks.propertyTeamAuthorize.mockResolvedValue({ authorized: false });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(403);

    expect(mocks.propertyTeamAuthorize).toHaveBeenCalledWith(
      homeownerUser.id,
      'prop-1',
      'view'
    );
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('skips property authorization for a jobId-only anchor', async () => {
    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      jobId: 'job-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(200);
    expect(mocks.propertyTeamAuthorize).not.toHaveBeenCalled();

    // The jobId anchors the storage folder when propertyId is absent.
    const uploadPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(uploadPath).toMatch(/^quick-ai\/job-1-\d+\/0\.jpg$/);
  });

  // ---- Happy path ----
  it('uploads frames server-side to assessment-photos, runs the VLM, persists and responds', async () => {
    const req = createWalkthroughRequest({
      frames: [createFrameFile('a.jpg'), createFrameFile('b.jpg')],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(200);

    // Storage: correct bucket, quick-ai/<anchor>-<ts>/<index>.jpg paths,
    // jpeg content type, upsert enabled, Buffer payload.
    expect(mocks.supabaseStorageFrom).toHaveBeenCalledWith('assessment-photos');
    expect(mocks.storageUpload).toHaveBeenCalledTimes(2);
    const [path0, buf0, opts0] = mocks.storageUpload.mock.calls[0];
    const [path1] = mocks.storageUpload.mock.calls[1];
    expect(path0).toMatch(/^quick-ai\/prop-1-\d+\/0\.jpg$/);
    expect(path1).toMatch(/^quick-ai\/prop-1-\d+\/1\.jpg$/);
    expect(Buffer.isBuffer(buf0)).toBe(true);
    expect((buf0 as Buffer).length).toBe(64);
    expect(opts0).toEqual({ contentType: 'image/jpeg', upsert: true });

    // VLM dispatch received the two public URLs in frame order.
    const expectedUrls = [
      `https://cdn.example.com/${path0}`,
      `https://cdn.example.com/${path1}`,
    ];
    expect(mocks.assessWalkthrough).toHaveBeenCalledWith(
      expectedUrls,
      undefined
    );

    // Persistence dispatch: anchored to the property, default domain, and a
    // cache key that is the sha256 of the SORTED frame URLs (identical frame
    // sets dedupe regardless of order).
    const expectedCacheKey = crypto
      .createHash('sha256')
      .update([...expectedUrls].sort().join('|'))
      .digest('hex');
    expect(mocks.persistWalkthroughRow).toHaveBeenCalledWith({
      userId: homeownerUser.id,
      jobId: undefined,
      propertyId: 'prop-1',
      domain: 'building',
      cacheKey: expectedCacheKey,
      assessment: mockAssessment,
    });

    // Frame images saved against the row.
    const imagesInsert = mocks.supabaseFrom.mock.results.find(
      (_r, i) => mocks.supabaseFrom.mock.calls[i][0] === 'assessment_images'
    )?.value.insert;
    expect(mocks.supabaseFrom).toHaveBeenCalledWith('assessment_images');
    expect(imagesInsert).toHaveBeenCalledWith([
      {
        assessment_id: 'assessment-1',
        image_url: expectedUrls[0],
        image_index: 0,
      },
      {
        assessment_id: 'assessment-1',
        image_url: expectedUrls[1],
        image_index: 1,
      },
    ]);

    // Training capture scheduled with the persisted id + configured key.
    expect(mocks.scheduleWalkthroughTraining).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'assessment-1',
        openaiApiKey: 'test-openai-key',
        perFrameAssessments: expect.arrayContaining([
          expect.objectContaining({ url: expectedUrls[0] }),
        ]),
      })
    );

    // Response shape: merged assessment + walkthrough metadata.
    const body = await res.json();
    expect(body.assessmentId).toBe('assessment-1');
    expect(body.frameCount).toBe(2);
    expect(body.framesAssessed).toBe(2);
    expect(body.damageAssessment.damageType).toBe('water_damage');
  });

  it('passes parsed context and custom domain through to the VLM and persistence', async () => {
    const context = { propertyType: 'flat', location: 'London' };
    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
      domain: 'electrical',
      context: JSON.stringify(context),
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(200);

    expect(mocks.assessWalkthrough).toHaveBeenCalledWith(
      expect.any(Array),
      context
    );
    expect(mocks.persistWalkthroughRow).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'electrical' })
    );
  });

  // ---- Storage failure paths ----
  it('returns 502 and does not call the VLM when every frame upload fails', async () => {
    mocks.storageUpload.mockResolvedValue({
      data: null,
      error: { message: 'bucket unavailable' },
    });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toContain('Failed to store walkthrough frames');
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  it('returns 502 when surviving frames drop below the 2-frame minimum', async () => {
    // 2 frames, second upload fails -> only 1 stored -> 502.
    mocks.storageUpload
      .mockResolvedValueOnce({ data: { path: 'p0' }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'disk full' },
      });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(502);
    expect(mocks.assessWalkthrough).not.toHaveBeenCalled();
  });

  it('tolerates a single bad frame when enough frames survive', async () => {
    // 3 frames, middle upload fails -> 2 survive -> walkthrough proceeds.
    mocks.storageUpload
      .mockResolvedValueOnce({ data: { path: 'p0' }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'transient error' },
      })
      .mockResolvedValueOnce({ data: { path: 'p2' }, error: null });

    const req = createWalkthroughRequest({
      frames: [
        createFrameFile('0.jpg'),
        createFrameFile('1.jpg'),
        createFrameFile('2.jpg'),
      ],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(200);

    const urls = mocks.assessWalkthrough.mock.calls[0][0] as string[];
    expect(urls).toHaveLength(2);
    expect(urls[0]).toMatch(/\/0\.jpg$/);
    expect(urls[1]).toMatch(/\/2\.jpg$/);
  });

  it('skips a frame whose upload throws (rejects) without sinking the walk', async () => {
    mocks.storageUpload
      .mockRejectedValueOnce(new Error('network reset'))
      .mockResolvedValueOnce({ data: { path: 'p1' }, error: null })
      .mockResolvedValueOnce({ data: { path: 'p2' }, error: null });

    const req = createWalkthroughRequest({
      frames: [
        createFrameFile('0.jpg'),
        createFrameFile('1.jpg'),
        createFrameFile('2.jpg'),
      ],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(200);
    expect(mocks.assessWalkthrough.mock.calls[0][0]).toHaveLength(2);
  });

  // ---- VLM failure ----
  it('returns 422 when no frame produces a usable assessment', async () => {
    mocks.assessWalkthrough.mockResolvedValue({
      assessment: null,
      perFrameAssessments: [],
      frameCount: 2,
      framesAssessed: 0,
    });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.error).toContain('Could not assess any frame');
    expect(body.frameCount).toBe(2);
    expect(body.framesAssessed).toBe(0);
    expect(mocks.persistWalkthroughRow).not.toHaveBeenCalled();
  });

  // ---- Persistence failure ----
  it('returns 500 when the assessment row fails to persist', async () => {
    mocks.persistWalkthroughRow.mockResolvedValue(null);

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(500);
    expect(mocks.scheduleWalkthroughTraining).not.toHaveBeenCalled();
  });

  // ---- Best-effort image metadata ----
  it('still returns 200 when saving assessment_images rows throws', async () => {
    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === 'assessment_images') {
        return {
          insert: vi.fn().mockRejectedValue(new Error('insert blew up')),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.assessmentId).toBe('assessment-1');
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'Failed to save walkthrough frame images',
      expect.objectContaining({ assessmentId: 'assessment-1' })
    );
  });

  // ---- Rate limiting (wrapper-level) ----
  it('returns 429 when the rate limiter rejects the request', async () => {
    mocks.rateLimiterCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    });

    const req = createWalkthroughRequest({
      frames: [createFrameFile(), createFrameFile()],
      propertyId: 'prop-1',
    });
    const res = await POST(req, segmentData);
    expect(res.status).toBe(429);
    expect(mocks.checkAICostBudget).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// persistWalkthroughRow — cache_key dedup behaviour (real module)
// ---------------------------------------------------------------------------
describe('persistWalkthroughRow (dedup on cache_key)', () => {
  type PersistModule =
    typeof import('@/app/api/assessments/walkthrough/_persist-and-capture');
  let persistWalkthroughRow: PersistModule['persistWalkthroughRow'];

  const baseParams = {
    userId: 'homeowner-1',
    propertyId: 'prop-1',
    domain: 'building',
    cacheKey: 'cache-key-abc',
    assessment: mockAssessment as unknown as Parameters<
      PersistModule['persistWalkthroughRow']
    >[0]['assessment'],
  };

  beforeEach(async () => {
    setupDefaultMocks();
    const actual = await vi.importActual<PersistModule>(
      '@/app/api/assessments/walkthrough/_persist-and-capture'
    );
    persistWalkthroughRow = actual.persistWalkthroughRow;
  });

  it('inserts a new building_assessments row and returns its id', async () => {
    const insertSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 'new-row-1' }, error: null });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    });
    mocks.supabaseFrom.mockReturnValue({ insert });

    const id = await persistWalkthroughRow(baseParams);
    expect(id).toBe('new-row-1');

    expect(mocks.supabaseFrom).toHaveBeenCalledWith('building_assessments');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'homeowner-1',
        property_id: 'prop-1',
        job_id: null,
        cache_key: 'cache-key-abc',
        domain: 'building',
        damage_type: 'water_damage',
        validation_status: 'pending',
        assessment_data: expect.objectContaining({
          source: 'mobile_walkthrough',
        }),
      })
    );
  });

  it('updates the existing row in place on a 23505 cache_key conflict (idempotent re-submit)', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    });

    const updateSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 'existing-row-9' }, error: null });
    const eq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: updateSingle }),
    });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.supabaseFrom.mockReturnValue({ insert, update });

    const id = await persistWalkthroughRow(baseParams);
    expect(id).toBe('existing-row-9');

    // The update targets the conflicting cache_key and must NOT try to
    // rewrite created_at (only updated_at).
    expect(eq).toHaveBeenCalledWith('cache_key', 'cache-key-abc');
    const updatePayload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.created_at).toBeUndefined();
    expect(updatePayload.updated_at).toEqual(expect.any(String));
    expect(updatePayload.cache_key).toBe('cache-key-abc');
  });

  it('returns null (and logs) on a non-conflict insert error', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    });
    mocks.supabaseFrom.mockReturnValue({ insert });

    const id = await persistWalkthroughRow(baseParams);
    expect(id).toBeNull();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Failed to insert walkthrough assessment row',
      expect.objectContaining({ error: 'relation does not exist' })
    );
  });
});
