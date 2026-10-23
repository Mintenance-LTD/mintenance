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

function isolatedBrowserEnvironment() {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('CI', 'true');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('E2E_TESTING', 'true');
  vi.stubEnv('E2E_AUTH_SECRET', 'a'.repeat(64));
  vi.stubEnv('E2E_SUPABASE_URL', 'http://127.0.0.1:56321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:56321');
}
const isolatedPhoto = local.replace('57321', '56321');
it('accepts the disposable storage photo in the isolated production-mode CI build', async () => {
  isolatedBrowserEnvironment();
  expect(await validateURL(isolatedPhoto)).toEqual({
    isValid: true,
    normalizedUrl: isolatedPhoto,
  });
});
it.each([
  ['CI', 'false'],
  ['VERCEL', '1'],
  ['VERCEL_ENV', 'production'],
  ['E2E_TESTING', 'false'],
  ['E2E_AUTH_SECRET', ''],
  ['E2E_SUPABASE_URL', 'http://127.0.0.1:57321'],
  ['NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'],
])(
  'keeps the production private-IP guard when %s is %s',
  async (key, value) => {
    isolatedBrowserEnvironment();
    vi.stubEnv(key, value);
    expect((await validateURL(isolatedPhoto)).isValid).toBe(false);
  }
);
it.each([
  isolatedPhoto.replace('56321', '56322'),
  isolatedPhoto.replace('127.0.0.1:56321', '169.254.169.254'),
  isolatedPhoto.replace('/Job-storage/', '/private/'),
  'http://127.0.0.1:56321/auth/v1/admin/users',
  isolatedPhoto.replace('photo.png', '%2e%2e/secret.png'),
  isolatedPhoto.replace('127.0.0.1', 'user:password@127.0.0.1'),
])('does not broaden isolated CI access beyond job photos: %s', async (url) => {
  isolatedBrowserEnvironment();
  expect((await validateURL(url)).isValid).toBe(false);
});
