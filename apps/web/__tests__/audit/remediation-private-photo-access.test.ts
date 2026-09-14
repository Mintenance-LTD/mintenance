import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), sign: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mocks.rpc,
    storage: { from: () => ({ createSignedUrl: mocks.sign }) },
  },
}));
import {
  PRIVATE_PHOTO_PLACEHOLDER,
  resignJobStorageUrls,
} from '@/lib/api/job-storage';

describe('private photo signing boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:55321');
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.sign.mockResolvedValue({
      data: { signedUrl: 'fresh-authorized-url' },
      error: null,
    });
  });

  it('does not renew another owner’s same-origin signed URL', async () => {
    const url =
      'http://127.0.0.1:55321/storage/v1/object/sign/Job-storage/other/private.jpg?token=old';
    expect(await resignJobStorageUrls([url], 'unrelated-user')).toEqual([
      PRIVATE_PHOTO_PLACEHOLDER,
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith('authorized_private_photo_paths', {
      p_actor_id: 'unrelated-user',
      p_paths: ['other/private.jpg'],
    });
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('never signs for an anonymous public profile visitor', async () => {
    expect(await resignJobStorageUrls(['job/private.jpg'], null)).toEqual([
      PRIVATE_PHOTO_PLACEHOLDER,
    ]);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('signs only authorized paths, preserving batch positions and limiting expiry', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ path: 'mine/photo.jpg' }],
      error: null,
    });
    expect(
      await resignJobStorageUrls(
        [
          null,
          'mine/photo.jpg',
          'other/private.jpg',
          'https://cdn.example/public.jpg',
          undefined,
        ],
        'owner',
        86400
      )
    ).toEqual([
      PRIVATE_PHOTO_PLACEHOLDER,
      'fresh-authorized-url',
      PRIVATE_PHOTO_PLACEHOLDER,
      'https://cdn.example/public.jpg',
      PRIVATE_PHOTO_PLACEHOLDER,
    ]);
    expect(mocks.sign).toHaveBeenCalledExactlyOnceWith('mine/photo.jpg', 3600);
  });

  it('fails closed when the authorization RPC is unavailable', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'unavailable' },
    });
    expect(await resignJobStorageUrls(['mine/photo.jpg'], 'owner')).toEqual([
      PRIVATE_PHOTO_PLACEHOLDER,
    ]);
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('does not reuse the old private capability when signing fails', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ path: 'mine/photo.jpg' }],
      error: null,
    });
    mocks.sign.mockResolvedValue({
      data: null,
      error: { message: 'Object not found' },
    });
    const url =
      'http://127.0.0.1:55321/storage/v1/object/sign/Job-storage/mine/photo.jpg?token=old';
    expect(await resignJobStorageUrls([url], 'owner')).toEqual([
      PRIVATE_PHOTO_PLACEHOLDER,
    ]);
  });
});
