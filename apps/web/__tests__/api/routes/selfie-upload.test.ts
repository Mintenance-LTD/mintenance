// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly.

/**
 * POST /api/users/selfie — verified-selfie upload.
 * Route: apps/web/app/api/users/selfie/route.ts
 *
 * Exists because the mobile SelfieCaptureScreen used to upload
 * client-side and then write `profiles.profile_photo_is_selfie` itself,
 * which is impossible: that column is deliberately excluded from the
 * `authenticated` UPDATE grant (verified against the live project on
 * 2026-07-31 — SELECT only), so every selfie ended in "Could not save
 * your selfie". The flag is a TRUST SIGNAL, so the fix routes through
 * the service role rather than widening the grant.
 *
 * These tests pin the security-relevant behaviour: the flag is set true,
 * magic-byte validation gates the write, and a failed row update rolls
 * back the uploaded blob.
 */

let testUser: { id: string } = { id: 'user-1' };

const mocks = vi.hoisted(() => ({
  validateImageUpload: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
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
        getPublicUrl: () => ({
          data: { publicUrl: 'https://cdn/profile-images/selfies/new.jpg' },
        }),
        remove: (...a: unknown[]) => mocks.storageRemove(...a),
      }),
    },
  },
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

import { POST } from '@/app/api/users/selfie/route';

function selfieForm(): FormData {
  const fd = new FormData();
  fd.append(
    'selfie',
    new File([new ArrayBuffer(1024)], 'shot.jpg', { type: 'image/jpeg' })
  );
  return fd;
}
function req(fd: FormData) {
  return { formData: async () => fd } as unknown as Request;
}

/** profiles: .select().eq().single() then .update().eq() */
function mockProfiles(opts: {
  previousUrl?: string | null;
  updateError?: unknown;
}) {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }),
  });
  mocks.supabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { profile_image_url: opts.previousUrl ?? null },
          error: null,
        }),
      }),
    }),
    update,
  });
  return { update };
}

beforeEach(() => {
  vi.clearAllMocks();
  testUser = { id: 'user-1' };
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.storageRemove.mockResolvedValue({ error: null });
});

describe('POST /api/users/selfie', () => {
  it('sets the profile_photo_is_selfie trust flag server-side', async () => {
    mocks.validateImageUpload.mockResolvedValue({
      valid: true,
      detectedType: 'image/jpeg',
    });
    const { update } = mockProfiles({});

    const res = await POST(req(selfieForm()) as never);

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_photo_is_selfie: true,
        profile_image_url: 'https://cdn/profile-images/selfies/new.jpg',
      })
    );
  });

  it('rejects a file failing magic-byte validation before touching storage', async () => {
    mocks.validateImageUpload.mockResolvedValue({
      valid: false,
      error: 'File content is not a valid image',
    });

    const res = await POST(req(selfieForm()) as never);

    expect(res.status).toBe(400);
    expect(mocks.storageUpload).not.toHaveBeenCalled();
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

  it('rolls back the uploaded blob when the profile row update fails', async () => {
    mocks.validateImageUpload.mockResolvedValue({
      valid: true,
      detectedType: 'image/jpeg',
    });
    mockProfiles({ updateError: { message: 'permission denied' } });

    const res = await POST(req(selfieForm()) as never);

    expect(res.status).toBeGreaterThanOrEqual(400);
    // The new blob must not be left orphaned in the bucket.
    const uploadedPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(mocks.storageRemove).toHaveBeenCalledWith([uploadedPath]);
  });

  it('derives the stored extension from the DETECTED type, not the filename', async () => {
    mocks.validateImageUpload.mockResolvedValue({
      valid: true,
      detectedType: 'image/webp',
    });
    mockProfiles({});

    await POST(req(selfieForm()) as never);

    const storedPath = mocks.storageUpload.mock.calls[0][0] as string;
    expect(storedPath.endsWith('.webp')).toBe(true);
    expect(storedPath.startsWith('selfies/')).toBe(true);
  });
});
