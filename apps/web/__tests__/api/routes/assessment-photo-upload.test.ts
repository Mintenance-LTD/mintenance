// @vitest-environment node
/**
 * Tests for POST /api/assessments/photo-upload  (multipart/form-data)
 * Route: apps/web/app/api/assessments/photo-upload/route.ts
 *
 * This route exists because React Native's direct-to-storage upload never
 * landed bytes — the assessment-photos bucket held zero objects for its entire
 * life — and both mobile photo paths swallowed the failure, so a photo-less
 * assessment reported success. The phone now streams files here and the server
 * owns storage.
 *
 * The properties worth pinning:
 *   - the bucket is private, so the route returns SIGNED urls, never public ones
 *   - the stored format is derived from the file's magic bytes, not the
 *     client's content-type header (the old quick-AI path labelled every
 *     non-PNG upload image/jpeg, so HEIC was stored as undecodable "JPEG")
 *   - junk and oversize files are skipped, and a total failure is a 502 the
 *     caller can act on rather than a warning nobody sees
 *   - an assessmentId anchor is ownership-checked
 */
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getCurrentUserFromCookies: vi.fn(),
  getCurrentUserFromBearerToken: vi.fn(),
  requireCSRF: vi.fn(),
  rateLimiterCheckRateLimit: vi.fn(),
  supabaseFrom: vi.fn(),
  storageUpload: vi.fn(),
  storageCreateSignedUrl: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

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
        createSignedUrl: (...args: unknown[]) =>
          mocks.storageCreateSignedUrl(...args),
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
// Fixtures
// ---------------------------------------------------------------------------
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ASSESSMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SIGNED =
  'https://storage.example/object/sign/assessment-photos/x.jpg?t=1';

const homeowner = {
  id: USER_ID,
  email: 'h@test.com',
  role: 'homeowner' as const,
  first_name: 'T',
  last_name: 'H',
};

/** Real JPEG magic bytes (FF D8 FF E0) padded past the 12-byte minimum. */
function jpegFile(name = 'a.jpg'): File {
  const head = [0xff, 0xd8, 0xff, 0xe0];
  const bytes = new Uint8Array(64);
  head.forEach((b, i) => (bytes[i] = b));
  return new File([bytes], name, { type: 'image/jpeg' });
}

/** Real HEIC magic bytes: ....ftypheic */
function heicFile(name = 'a.heic'): File {
  const bytes = new Uint8Array(64);
  const brand = Buffer.from('....ftypheic', 'ascii');
  brand.forEach((b, i) => (bytes[i] = b));
  return new File([bytes], name, { type: 'image/jpeg' }); // lying header, on purpose
}

/** Not an image at all. */
function junkFile(name = 'a.txt'): File {
  return new File([new Uint8Array(64).fill(0x41)], name, {
    type: 'image/jpeg',
  });
}

function multipart(files: File[], fields: Record<string, string> = {}) {
  const form = new FormData();
  files.forEach((f) => form.append('photos', f));
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  return new NextRequest(
    new URL('/api/assessments/photo-upload', 'http://localhost:3000'),
    { method: 'POST', body: form, headers: { 'x-csrf-token': 't' } }
  );
}

async function post(req: NextRequest) {
  const { POST } = await import('@/app/api/assessments/photo-upload/route');
  return POST(req, { params: Promise.resolve({}) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUserFromCookies.mockResolvedValue(homeowner);
  mocks.getCurrentUserFromBearerToken.mockResolvedValue(null);
  mocks.requireCSRF.mockResolvedValue(undefined);
  mocks.rateLimiterCheckRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
    retryAfter: 0,
  });
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.storageCreateSignedUrl.mockResolvedValue({
    data: { signedUrl: SIGNED },
    error: null,
  });
  // building_assessments ownership lookup
  mocks.supabaseFrom.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { id: ASSESSMENT_ID, user_id: USER_ID },
          error: null,
        }),
      }),
    }),
  }));
});

describe('POST /api/assessments/photo-upload', () => {
  it('returns signed URLs, never public ones', async () => {
    const res = await post(multipart([jpegFile()]));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.urls).toEqual([SIGNED]);
    expect(body.urls[0]).toContain('/object/sign/');
    expect(body.urls[0]).not.toContain('/object/public/');
  });

  it('files quick-AI photos under the caller own folder when unanchored', async () => {
    await post(multipart([jpegFile()]));
    const path = mocks.storageUpload.mock.calls[0]![0] as string;
    expect(path.startsWith(`quick-ai/${USER_ID}/`)).toBe(true);
  });

  it('files anchored photos under the assessment', async () => {
    await post(multipart([jpegFile()], { assessmentId: ASSESSMENT_ID }));
    const path = mocks.storageUpload.mock.calls[0]![0] as string;
    expect(path.startsWith(`assessments/${ASSESSMENT_ID}/`)).toBe(true);
  });

  it('stores HEIC as HEIC even though the client claimed image/jpeg', async () => {
    await post(multipart([heicFile()]));
    const [path, , opts] = mocks.storageUpload.mock.calls[0] as [
      string,
      unknown,
      { contentType: string },
    ];
    expect(opts.contentType).toBe('image/heic');
    expect(path.endsWith('.heic')).toBe(true);
  });

  it('skips a file whose bytes are not an image', async () => {
    const res = await post(multipart([jpegFile(), junkFile()]));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.stored).toBe(1);
    expect(body.skipped).toEqual([1]);
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when nothing could be stored, rather than a silent success', async () => {
    mocks.storageUpload.mockResolvedValue({ error: { message: 'boom' } });
    const res = await post(multipart([jpegFile()]));
    expect(res.status).toBe(502);
    expect(mocks.logger.error).toHaveBeenCalled();
  });

  it('rejects a request with no photos', async () => {
    const res = await post(multipart([]));
    expect(res.status).toBe(400);
  });

  it('refuses to attach photos to an assessment the caller does not own', async () => {
    mocks.supabaseFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: ASSESSMENT_ID, user_id: OTHER_ID },
            error: null,
          }),
        }),
      }),
    }));
    const res = await post(
      multipart([jpegFile()], { assessmentId: ASSESSMENT_ID })
    );
    expect(res.status).toBe(403);
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('404s an unknown assessment anchor', async () => {
    mocks.supabaseFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }));
    const res = await post(
      multipart([jpegFile()], { assessmentId: ASSESSMENT_ID })
    );
    expect(res.status).toBe(404);
  });
});
