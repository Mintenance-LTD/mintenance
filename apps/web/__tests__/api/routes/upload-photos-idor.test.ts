// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly.

/**
 * IDOR regression tests for POST /api/jobs/upload-photos.
 * Route: apps/web/app/api/jobs/upload-photos/route.ts
 *
 * This route uploads under the service-role client (RLS bypassed) and uses the
 * client-supplied job_id as the storage-path prefix. Before the 2026-07-06
 * audit fix (#4) any authenticated user could write photos into another job's
 * folder by supplying its id. These tests pin the ownership gate: the job_id is
 * validated as a UUID and the caller must be the job's homeowner or contractor;
 * omitting job_id (pre-creation upload) stays allowed under the shared prefix.
 *
 * withApiHandler is mocked to a passthrough that injects the test user, so we
 * exercise the handler's authorization logic without the full middleware.
 */

let testUser: { id: string } = { id: 'user-1' };

const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  storageUpload: vi.fn(),
  signJobStoragePath: vi.fn(),
  validateImageUpload: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Passthrough that injects the test user AND replicates withApiHandler's
// error handling: thrown APIErrors become JSON responses with their statusCode.
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_config: unknown, handler: (req: unknown, ctx: unknown) => unknown) =>
    async (req: unknown) => {
      const { NextResponse } = await import('next/server');
      try {
        return await handler(req, { user: testUser, requestId: 'test-req' });
      } catch (error) {
        const e = error as {
          statusCode?: number;
          toResponse?: () => unknown;
          message?: string;
        };
        return NextResponse.json(
          e.toResponse ? e.toResponse() : { error: { message: e.message } },
          { status: e.statusCode ?? 500 }
        );
      }
    },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => mocks.supabaseFrom(...args),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mocks.storageUpload(...args),
      }),
    },
  },
}));

vi.mock('@/lib/api/job-storage', () => ({
  signJobStoragePath: mocks.signJobStoragePath,
}));

vi.mock('@/lib/utils/fileValidation', () => ({
  validateImageUpload: mocks.validateImageUpload,
  MAX_FILE_SIZES: { jobPhoto: 10 * 1024 * 1024 },
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

import { POST } from '@/app/api/jobs/upload-photos/route';

function createFakeFile(): File {
  return new File([new ArrayBuffer(1024)], 'photo.jpg', { type: 'image/jpeg' });
}

function req(formData: FormData) {
  return { formData: async () => formData } as unknown as Request;
}

function jobRowMock(row: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row, error }),
      }),
    }),
  };
}

const OWNED_JOB_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  testUser = { id: 'user-1' };
  mocks.validateImageUpload.mockResolvedValue({
    valid: true,
    detectedType: 'image/jpeg',
  });
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.signJobStoragePath.mockResolvedValue(
    'https://signed.example/photo.jpg'
  );
});

describe('POST /api/jobs/upload-photos — job_id ownership (IDOR)', () => {
  it('rejects a syntactically invalid job_id with 400', async () => {
    const fd = new FormData();
    fd.append('photos', createFakeFile());
    fd.append('job_id', 'not-a-uuid');

    const res = await POST(req(fd) as never);
    expect(res.status).toBe(400);
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('rejects with 403 when the caller does not own the job', async () => {
    mocks.supabaseFrom.mockReturnValue(
      jobRowMock({
        id: OWNED_JOB_ID,
        homeowner_id: 'someone-else',
        contractor_id: 'another-contractor',
      })
    );
    const fd = new FormData();
    fd.append('photos', createFakeFile());
    fd.append('job_id', OWNED_JOB_ID);

    const res = await POST(req(fd) as never);
    expect(res.status).toBe(403);
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('rejects with 400 when the job_id does not exist', async () => {
    mocks.supabaseFrom.mockReturnValue(
      jobRowMock(null, { message: 'no rows' })
    );
    const fd = new FormData();
    fd.append('photos', createFakeFile());
    fd.append('job_id', OWNED_JOB_ID);

    const res = await POST(req(fd) as never);
    expect(res.status).toBe(400);
    expect(mocks.storageUpload).not.toHaveBeenCalled();
  });

  it('allows the homeowner and prefixes the path with the job id', async () => {
    testUser = { id: 'homeowner-1' };
    mocks.supabaseFrom.mockReturnValue(
      jobRowMock({
        id: OWNED_JOB_ID,
        homeowner_id: 'homeowner-1',
        contractor_id: 'contractor-1',
      })
    );
    const fd = new FormData();
    fd.append('photos', createFakeFile());
    fd.append('job_id', OWNED_JOB_ID);

    const res = await POST(req(fd) as never);
    expect(res.status).toBe(200);
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
    const uploadedPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith(`${OWNED_JOB_ID}/`)).toBe(true);
  });

  it('allows uploads with no job_id (pre-creation) under the shared prefix', async () => {
    const fd = new FormData();
    fd.append('photos', createFakeFile());
    // no job_id

    const res = await POST(req(fd) as never);
    expect(res.status).toBe(200);
    // No ownership lookup should happen when job_id is absent.
    expect(mocks.supabaseFrom).not.toHaveBeenCalled();
    const uploadedPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(uploadedPath.startsWith('job-photos/')).toBe(true);
  });
});
