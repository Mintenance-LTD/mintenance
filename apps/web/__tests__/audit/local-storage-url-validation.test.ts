import { afterEach, expect, it, vi } from 'vitest';
import { validateURL } from '@/lib/security/url-validation';
afterEach(() => vi.unstubAllEnvs());
const local =
  'http://127.0.0.1:57321/storage/v1/object/sign/Job-storage/job-photos/photo.png?token=synthetic';
it('accepts only the configured local storage origin and preserves its port', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:57321');
  expect(await validateURL(local)).toEqual({
    isValid: true,
    normalizedUrl: local,
  });
});
it.each([
  ['production', local],
  ['development', local.replace('57321', '57322')],
  ['development', local.replace('/Job-storage/', '/private/')],
  ['development', 'http://127.0.0.1:57321/auth/v1/admin/users'],
  ['development', local.replace('127.0.0.1', 'user:password@127.0.0.1')],
  ['development', local.replace('photo.png', '%2e%2e/secret.png')],
])('blocks unsafe URL in %s: %s', async (mode, url) => {
  vi.stubEnv('NODE_ENV', mode);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:57321');
  expect((await validateURL(url)).isValid).toBe(false);
});
