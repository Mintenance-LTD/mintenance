/**
 * Tests for POST /api/jobs/[id]/photos/after
 * Route: apps/web/app/api/jobs/[id]/photos/after/route.ts
 *
 * Covers: authentication, job not found, contractor ownership check,
 * missing photos, too many photos, file validation, auto-completion
 * when job is in_progress with escrow held, skipping auto-complete
 * when no escrow, success photo upload response.
 */
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  supabaseFrom: vi.fn(),
  supabaseStorageFrom: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  verifyGeolocation: vi.fn(),
  validatePhotoQuality: vi.fn(),
  validatePhotoRequirements: vi.fn(),
  validateImageUpload: vi.fn(),
  createNotification: vi.fn(),
  sendJobCompletedEmail: vi.fn(),
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
      from: (...args: unknown[]) => mocks.supabaseStorageFrom(...args),
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

vi.mock('@/lib/services/escrow/PhotoVerificationService', () => ({
  PhotoVerificationService: {
    verifyGeolocation: mocks.verifyGeolocation,
    validatePhotoQuality: mocks.validatePhotoQuality,
    validatePhotoRequirements: mocks.validatePhotoRequirements,
  },
}));

vi.mock('@/lib/utils/fileValidation', () => ({
  validateImageUpload: mocks.validateImageUpload,
}));

vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: mocks.createNotification,
  },
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendJobCompletedEmail: mocks.sendJobCompletedEmail,
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
function createFakeFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function createFormDataRequest(url: string, formData: FormData): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'x-csrf-token': 'test-csrf-token',
    },
    body: formData,
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
  category: 'plumbing',
  status: 'in_progress',
  title: 'Fix kitchen sink',
  latitude: 51.5074,
  longitude: -0.1278,
};

function setupDefaultMocks() {
  mocks.getCurrentUserFromCookies.mockResolvedValue(contractorUser);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true, remaining: 19, resetTime: Date.now() + 60000, retryAfter: 0,
  });
  mocks.verifyGeolocation.mockResolvedValue({ withinThreshold: true, distance: 10 });
  mocks.validatePhotoQuality.mockResolvedValue({ passed: true, qualityScore: 85 });
  mocks.validatePhotoRequirements.mockResolvedValue({ passed: true, missingAngles: [] });
  mocks.validateImageUpload.mockResolvedValue({ valid: true });
  mocks.createNotification.mockResolvedValue('notif-1');
  mocks.sendJobCompletedEmail.mockResolvedValue(true);
}

function setupPhotoMocks(overrides: {
  jobData?: unknown;
  jobError?: unknown;
  escrowData?: unknown;
  updateError?: unknown;
} = {}) {
  const jobResult = { data: overrides.jobData ?? inProgressJob, error: overrides.jobError ?? null };
  const escrowResult = {
    data: 'escrowData' in overrides ? overrides.escrowData : { id: 'escrow-1' },
    error: null,
  };
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
    if (table === 'job_photos_metadata') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
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

  // Storage mock
  mocks.supabaseStorageFrom.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ data: { path: 'job-photos/job-1/after/photo.jpg' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/photo.jpg' } }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/jobs/[id]/photos/after', () => {
  let POST: typeof import('@/app/api/jobs/[id]/photos/after/route').POST;

  beforeEach(async () => {
    setupDefaultMocks();
    const mod = await import('@/app/api/jobs/[id]/photos/after/route');
    POST = mod.POST;
  });

  // ---- Authentication ----
  it('should return 401 when user is not authenticated', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue(null);

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(401);
  });

  // ---- Job not found ----
  it('should return 404 when job does not exist', async () => {
    setupPhotoMocks({ jobData: null, jobError: { message: 'not found' } });

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/bad-id/photos/after', formData);
    const res = await POST(req, segmentData('bad-id'));
    expect(res.status).toBe(404);
  });

  // ---- Ownership check ----
  it('should return 403 when user is not the assigned contractor', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'other-contractor',
      email: 'other@test.com',
      role: 'contractor',
      first_name: 'Other',
      last_name: 'Person',
    });
    setupPhotoMocks();

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.message).toContain('authorized');
  });

  // ---- No photos submitted ----
  it('should return 400 when no photos are submitted', async () => {
    setupPhotoMocks();

    const formData = new FormData();
    // no photos appended
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('photo');
  });

  // ---- Too many photos ----
  it('should return 400 when more than 10 photos are submitted', async () => {
    setupPhotoMocks();

    const formData = new FormData();
    for (let i = 0; i < 11; i++) {
      formData.append('photos', createFakeFile(`photo${i}.jpg`, 'image/jpeg', 1024));
    }
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('10');
  });

  // ---- File too large ----
  it('should return 400 when a photo exceeds 10MB', async () => {
    setupPhotoMocks();

    const formData = new FormData();
    const largeFile = createFakeFile('huge.jpg', 'image/jpeg', 11 * 1024 * 1024);
    formData.append('photos', largeFile);
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('10MB');
  });

  // ---- Invalid file type ----
  it('should return 400 for invalid file type', async () => {
    setupPhotoMocks();

    const formData = new FormData();
    formData.append('photos', createFakeFile('doc.pdf', 'application/pdf', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);
  });

  // ---- Invalid magic bytes ----
  it('should return 400 when file magic bytes do not match image', async () => {
    mocks.validateImageUpload.mockResolvedValue({ valid: false, error: 'Not a valid image file' });
    setupPhotoMocks();

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain('image');
  });

  // ---- Success with auto-complete ----
  it('should upload photos and auto-complete job when in_progress with escrow held', async () => {
    setupPhotoMocks();

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.jobCompleted).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
  });

  // ---- Auto-complete skipped when no escrow ----
  it('should upload photos but NOT auto-complete when no escrow held', async () => {
    setupPhotoMocks({ escrowData: null });

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.jobCompleted).toBe(false);
  });

  // ---- No auto-complete when job is not in_progress ----
  it('should not auto-complete when job is already completed', async () => {
    setupPhotoMocks({ jobData: { ...inProgressJob, status: 'completed' } });

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.jobCompleted).toBe(false);
  });

  // ---- Admin can upload for any job ----
  it('should allow admin to upload photos for any job', async () => {
    mocks.getCurrentUserFromCookies.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
    });
    setupPhotoMocks();

    const formData = new FormData();
    formData.append('photos', createFakeFile('photo.jpg', 'image/jpeg', 1024));
    const req = createFormDataRequest('http://localhost:3000/api/jobs/job-1/photos/after', formData);
    const res = await POST(req, segmentData('job-1'));
    expect(res.status).toBe(200);
  });
});
