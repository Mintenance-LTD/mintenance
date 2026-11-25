const {
  validateReleaseEnvironment: validate,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('../validate-release-env');

const valid = {
  EAS_BUILD_PROFILE: 'staging',
  EXPO_PUBLIC_ENVIRONMENT: 'staging',
  EXPO_PUBLIC_SUPABASE_URL: 'https://database.example.test',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-client-key',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.example.test',
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_synthetic',
};

it('accepts complete sandbox release settings', () => {
  expect(() => validate(valid)).not.toThrow();
});

it('does not bypass missing settings in cloud builds', () => {
  expect(() =>
    validate({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'internal' })
  ).toThrow('is required');
});

it.each([
  ['EXPO_PUBLIC_SUPABASE_URL', '${STAGING_SUPABASE_URL}'],
  ['EXPO_PUBLIC_API_BASE_URL', 'http://api.example.test'],
  ['EXPO_PUBLIC_API_BASE_URL', 'https://localhost'],
  ['EXPO_PUBLIC_API_URL', 'https://other.example.test'],
  ['EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_synthetic'],
  ['EXPO_PUBLIC_USE_MOCK', 'true'],
])(
  'rejects invalid release setting %s without printing the value',
  (name, value) => {
    try {
      validate({ ...valid, [name]: value });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect((error as Error).message).toContain(
        'Mobile release configuration invalid'
      );
      expect((error as Error).message).not.toContain(value);
    }
  }
);

it('permits incomplete local development configuration', () => {
  expect(() => validate({ NODE_ENV: 'development' })).not.toThrow();
});

it.each([
  ['EXPO_PUBLIC_SUPABASE_URL', 'https://ukrjudtlvapiajkjbcrd.supabase.co'],
  ['EXPO_PUBLIC_API_BASE_URL', 'https://www.mintenance.co.uk./api'],
  ['EXPO_PUBLIC_MOBILE_API_GATEWAY_URL', 'https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/mobile-api-relay'],
])('blocks production %s in the staging build profile', (name, value) => {
  expect(() => validate({
    ...valid,
    EXPO_PUBLIC_ENVIRONMENT: 'production',
    [name]: value,
  })).toThrow(`${name} points to production`);
});
