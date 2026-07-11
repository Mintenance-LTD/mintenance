// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly.

/**
 * Magic-byte validation regression tests for POST /api/users/avatar.
 * Route: apps/web/app/api/users/avatar/route.ts
 *
 * Before the 2026-07-06 audit fix (#10) the route trusted the client-declared
 * `file.type`, so arbitrary bytes labelled `image/png` landed in the `avatars`
 * bucket. It now runs the shared `validateImageUpload` (magic-number sniff)
 * like the other upload routes. These tests pin: a file that fails magic-byte
 * validation is rejected before any storage/DB write.
 */

let testUser: { id: string } = { id: 'user-1' };

const mocks = vi.hoisted(() => ({
  validateImageUpload: vi.fn(),
  storageUpload: vi.fn(),
  supabaseFrom: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_config: unknown, handler: (req: unknown, ctx: unknown) => unknown) =>
    async (req: unknown) => {
      const { NextResponse } = await import('next/server');
      try {
        return await handler(req, { user: testUser, requestId: 'test' });
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

vi.mock('@/lib/utils/fileValidation', () => ({
  validateImageUpload: mocks.validateImageUpload,
  MAX_FILE_SIZES: { profileImage: 5 * 1024 * 1024 },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...a: unknown[]) => mocks.supabaseFrom(...a),
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => mocks.storageUpload(...a),
        getPublicUrl: () => ({ data: { publicUrl: 'https://cdn/x.jpg' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

import { POST } from '@/app/api/users/avatar/route';

function fileForm(): FormData {
  const fd = new FormData();
  fd.append(
    'avatar',
    new File([new ArrayBuffer(1024)], 'x.png', { type: 'image/png' })
  );
  return fd;
}
function req(fd: FormData) {
  return { formData: async () => fd } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  testUser = { id: 'user-1' };
  mocks.storageUpload.mockResolvedValue({ error: null });
});

describe('POST /api/users/avatar — magic-byte validation (#10)', () => {
  it('rejects a file that fails magic-byte validation before any upload', async () => {
    mocks.validateImageUpload.mockResolvedValue({
      valid: false,
      error: 'File content is not a valid image',
    });

    const res = await POST(req(fileForm()) as never);
    expect(res.status).toBe(400);
    expect(mocks.storageUpload).not.toHaveBeenCalled();
    // The size cap is passed through to the validator.
    expect(mocks.validateImageUpload).toHaveBeenCalledWith(
      expect.anything(),
      5 * 1024 * 1024
    );
  });

  it('returns 400 when no file is supplied', async () => {
    const res = await POST(req(new FormData()) as never);
    expect(res.status).toBe(400);
    expect(mocks.validateImageUpload).not.toHaveBeenCalled();
  });

  it('names the stored file from the DETECTED type, not the client filename', async () => {
    mocks.validateImageUpload.mockResolvedValue({
      valid: true,
      detectedType: 'image/webp',
    });
    // profiles select (previous avatar) then update both resolve cleanly.
    mocks.supabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({
              data: { profile_image_url: null },
              error: null,
            }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await POST(req(fileForm()) as never);
    expect(res.status).toBe(200);
    const storedName = mocks.storageUpload.mock.calls[0][0] as string;
    // Extension derived from image/webp, not the ".png" filename.
    expect(storedName.endsWith('.webp')).toBe(true);
  });
});
