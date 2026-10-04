const { validatePublicBuildEnvironment } =
  // Expo evaluates this config-time module directly in Node as CommonJS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../../validate-public-build-env') as {
    validatePublicBuildEnvironment: (env: Record<string, string>) => void;
  };

it('rejects an email-service key in the public monitoring field without echoing it', () => {
  const privateKey = [
    'SG',
    'fake-key-identifier',
    'fake-key-secret-value',
  ].join('.');
  let failure: Error | undefined;
  try {
    validatePublicBuildEnvironment({ EXPO_PUBLIC_SENTRY_DSN: privateKey });
  } catch (error) {
    failure = error as Error;
  }
  expect(failure?.message).toContain('EXPO_PUBLIC_SENTRY_DSN');
  expect(failure?.message).not.toContain(privateKey);
});

it.each([
  'sk_test_fake_server_key',
  'sk_live_fake_server_key',
  'sb_secret_fake_server_key',
])('rejects server keys in any public field', (value) => {
  expect(() =>
    validatePublicBuildEnvironment({ EXPO_PUBLIC_OTHER_KEY: value })
  ).toThrow('Private credentials');
});

it('rejects a service-role JWT while allowing an anonymous client JWT', () => {
  const token = (role: string) =>
    `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  expect(() =>
    validatePublicBuildEnvironment({
      EXPO_PUBLIC_SUPABASE_ANON_KEY: token('service_role'),
    })
  ).toThrow('Private credentials');
  expect(() =>
    validatePublicBuildEnvironment({
      EXPO_PUBLIC_SUPABASE_ANON_KEY: token('anon'),
    })
  ).not.toThrow();
});

it('allows a public monitoring DSN and an explicitly disabled monitoring configuration', () => {
  expect(() =>
    validatePublicBuildEnvironment({
      EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.test/42',
    })
  ).not.toThrow();
  expect(() =>
    validatePublicBuildEnvironment({ EXPO_PUBLIC_SENTRY_DSN: '' })
  ).not.toThrow();
});

it('rejects a malformed monitoring DSN without exposing its value', () => {
  expect(() =>
    validatePublicBuildEnvironment({ EXPO_PUBLIC_SENTRY_DSN: 'not-a-dsn' })
  ).toThrow('public HTTPS Sentry DSN');
});
