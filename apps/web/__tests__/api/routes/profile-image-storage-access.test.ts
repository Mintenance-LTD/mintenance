// @vitest-environment node

const state = vi.hoisted(() => ({
  previousUrl: null as string | null,
  updateError: null as unknown,
  upload: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));
const userId = '11111111-1111-4111-8111-111111111111';
const origin = 'https://storage.example.test';

vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _config: unknown,
      handler: (
        req: Request,
        ctx: { user: { id: string } }
      ) => Promise<Response>
    ) =>
    async (request: Request) => {
      try {
        return await handler(request, { user: { id: userId } });
      } catch {
        return new Response(null, { status: 500 });
      }
    },
}));
vi.mock('@mintenance/shared', () => ({
  CUSTOMER_TERMS_VERSION: '2026-11-03',
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/utils/fileValidation', () => ({
  validateImageUpload: async () => ({
    valid: true,
    detectedType: 'image/jpeg',
  }),
  MAX_FILE_SIZES: { profileImage: 5 * 1024 * 1024 },
}));
vi.mock('@/lib/services/agents/AutomationPreferencesService', () => ({
  AutomationPreferencesService: { updatePreferences: vi.fn() },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => ({
      select: () => ({
        eq: () => {
          const result = {
            data: {
              profile_image_url: state.previousUrl,
              cover_photo_url: state.previousUrl,
            },
            error: null,
          };
          return {
            single: async () => result,
            maybeSingle: async () => result,
          };
        },
      }),
      update: (data: unknown) => {
        state.update(data);
        return { eq: async () => ({ error: state.updateError }) };
      },
    }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string) => state.upload(bucket, path),
        remove: (paths: string[]) => state.remove(bucket, paths),
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `https://storage.example.test/storage/v1/object/public/${bucket}/${path}`,
          },
        }),
      }),
    },
  },
}));

import {
  POST as avatarPost,
  DELETE as avatarDelete,
} from '@/app/api/users/avatar/route';
import {
  POST as coverPost,
  DELETE as coverDelete,
} from '@/app/api/users/cover-photo/route';
import { POST as selfiePost } from '@/app/api/users/selfie/route';
import { POST as profilePost } from '@/app/api/user/update-profile/route';

const cases = [
  {
    name: 'avatar replacement',
    handler: avatarPost,
    bucket: 'avatars',
    prefix: '',
    field: 'avatar',
  },
  {
    name: 'avatar deletion',
    handler: avatarDelete,
    bucket: 'avatars',
    prefix: '',
    field: null,
  },
  {
    name: 'cover replacement',
    handler: coverPost,
    bucket: 'profile-images',
    prefix: 'cover-',
    field: 'cover',
  },
  {
    name: 'cover deletion',
    handler: coverDelete,
    bucket: 'profile-images',
    prefix: 'cover-',
    field: null,
  },
  {
    name: 'selfie replacement',
    handler: selfiePost,
    bucket: 'profile-images',
    prefix: 'selfies/',
    field: 'selfie',
  },
  {
    name: 'legacy profile replacement',
    handler: profilePost,
    bucket: 'profile-images',
    prefix: 'avatars/',
    field: 'profileImage',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', origin);
  state.previousUrl = null;
  state.updateError = null;
  state.upload.mockResolvedValue({ error: null });
  state.remove.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe.each(cases)(
  '$name storage authorization',
  ({ handler, bucket, prefix, field }) => {
    const ownedPath = `${prefix}${userId}-123456789.jpg`;
    const publicUrl = (path: string) =>
      `${origin}/storage/v1/object/public/${bucket}/${path}`;
    async function invoke() {
      const form = new FormData();
      if (field)
        form.append(
          field,
          new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
        );
      return handler(
        new Request('https://app.example.test/api/profile', {
          method: field ? 'POST' : 'DELETE',
          ...(field ? { body: form } : {}),
        }) as never
      );
    }

    it('removes the authenticated user’s previous image', async () => {
      state.previousUrl = publicUrl(ownedPath);
      expect((await invoke()).status).toBeLessThan(300);
      expect(state.remove).toHaveBeenCalledExactlyOnceWith(bucket, [ownedPath]);
    });

    it.each([
      [
        'another user',
        publicUrl(
          `${prefix}22222222-2222-4222-8222-222222222222-123456789.jpg`
        ),
      ],
      [
        'user ID prefix collision',
        publicUrl(`${prefix}${userId}-extra-123456789.jpg`),
      ],
      [
        'external host',
        publicUrl(ownedPath).replace(origin, 'https://untrusted.example.test'),
      ],
      [
        'wrong bucket',
        publicUrl(ownedPath).replace(
          `/public/${bucket}/`,
          '/public/other-bucket/'
        ),
      ],
      ['literal traversal', publicUrl(`${prefix}../${ownedPath}`)],
      ['encoded traversal', publicUrl(`${prefix}%2e%2e%2f${ownedPath}`)],
      ['double encoding', publicUrl(`${prefix}%252e%252e%252f${ownedPath}`)],
      ['backslash traversal', publicUrl(`${prefix}..\\${ownedPath}`)],
      ['control character', publicUrl(`${ownedPath}\n`)],
      ['nested path', publicUrl(`${prefix}${userId}-123456789.jpg/child.jpg`)],
      [
        'URL credentials',
        publicUrl(ownedPath).replace('https://', 'https://user@'),
      ],
      ['query suffix', `${publicUrl(ownedPath)}?download=1`],
      ['fragment suffix', `${publicUrl(ownedPath)}#fragment`],
    ])('does not delete a stored URL with %s', async (_label, url) => {
      state.previousUrl = url;
      expect((await invoke()).status).toBeLessThan(300);
      expect(state.remove).not.toHaveBeenCalled();
      expect(state.update).toHaveBeenCalled();
    });

    if (field) {
      it('rolls back only the new upload if saving the profile fails', async () => {
        state.previousUrl = publicUrl(ownedPath);
        state.updateError = { message: 'database unavailable' };
        expect((await invoke()).status).toBeGreaterThanOrEqual(400);
        const [newBucket, newPath] = state.upload.mock.calls[0];
        expect(state.remove).toHaveBeenCalledExactlyOnceWith(newBucket, [
          newPath,
        ]);
      });
    }
  }
);
