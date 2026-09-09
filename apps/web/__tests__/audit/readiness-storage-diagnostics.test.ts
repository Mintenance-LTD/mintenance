// Audit observation tests: passing assertions document unsafe current behavior.
import { describe, it, expect, vi } from 'vitest';
const storage = vi.hoisted(() => ({ sign: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { storage: { from: storage.from } },
}));
import { updatePropertySchema } from '@/lib/validation/schemas-user';
import {
  extractJobStoragePath,
  resignJobStorageUrls,
} from '@/lib/api/job-storage';

describe('AUDIT: property image signing authority', () => {
  it('does not sign object keys from another origin', async () => {
    const foreignUrl =
      'https://unrelated.example/storage/v1/object/sign/Job-storage/other-owner/private.jpg?token=expired';
    const parsed = updatePropertySchema.parse({ photos: [foreignUrl] });
    expect(extractJobStoragePath(foreignUrl)).toBeNull();
    storage.from.mockReturnValue({ createSignedUrl: storage.sign });
    storage.sign.mockResolvedValue({
      data: { signedUrl: 'https://local.example/new-synthetic-signature' },
      error: null,
    });
    expect(await resignJobStorageUrls(parsed.photos!)).toEqual([foreignUrl]);
    expect(storage.from).not.toHaveBeenCalled();
    expect(storage.sign).not.toHaveBeenCalled();
  });
});
