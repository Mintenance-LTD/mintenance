import fs from 'fs';
import path from 'path';
import vm from 'vm';

const source = fs.readFileSync(path.join(__dirname, '../load-env.js'), 'utf8');

function load(content: string, injected: Record<string, string> = {}) {
  const env = { ...injected };
  vm.runInNewContext(source, {
    require: (name: string) =>
      name === 'fs'
        ? { existsSync: () => true, readFileSync: () => content }
        : path,
    __dirname,
    process: { env, cwd: () => __dirname },
    console: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return env;
}

describe('mobile shared environment defaults', () => {
  it.each([
    ['NEXT_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
    [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    ],
    ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_API_URL'],
    ['SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL'],
    ['SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
  ])('preserves explicitly injected %s settings', (fileKey, mobileKey) => {
    expect(
      load(`${fileKey}=shared-default`, { [mobileKey]: 'isolated-setting' })[
        mobileKey
      ]
    ).toBe('isolated-setting');
    expect(
      load(`${fileKey}=shared-default`, { [mobileKey]: '' })[mobileKey]
    ).toBe('');
    expect(load(`${fileKey}=shared-default`)[mobileKey]).toBe('shared-default');
  });

  it('does not expose private provider settings to the mobile environment', () => {
    expect(
      load(
        'STRIPE_SECRET_KEY=synthetic-private\nSUPABASE_SERVICE_ROLE_KEY=synthetic-private'
      )
    ).toEqual({});
  });
});
