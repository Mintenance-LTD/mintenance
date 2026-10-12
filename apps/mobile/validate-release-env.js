// Run after EAS resolves public settings and before Expo bundles the app.
function validateReleaseEnvironment(env = process.env) {
  const release =
    env.NODE_ENV === 'production' ||
    ['staging', 'production'].includes(env.EXPO_PUBLIC_ENVIRONMENT) ||
    (env.EAS_BUILD_PROFILE && env.EAS_BUILD_PROFILE !== 'development');
  if (!release) return;

  const errors = [];
  for (const name of [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_API_BASE_URL',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ]) {
    if (!env[name]?.trim()) errors.push(`${name} is required`);
  }
  for (const [name, value] of Object.entries(env)) {
    if (
      (name.startsWith('EXPO_PUBLIC_') || name === 'GOOGLE_MAPS_API_KEY') &&
      /\$\{[^}]+\}/.test(value || '')
    )
      errors.push(`${name} contains an unresolved placeholder`);
  }
  for (const name of [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_API_BASE_URL',
    'EXPO_PUBLIC_API_URL',
  ]) {
    if (!env[name]) continue;
    try {
      const url = new URL(env[name]);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
        throw new Error();
    } catch {
      errors.push(`${name} must be a public HTTPS URL`);
    }
  }
  if (
    env.EXPO_PUBLIC_API_URL &&
    env.EXPO_PUBLIC_API_BASE_URL &&
    env.EXPO_PUBLIC_API_URL.replace(/\/$/, '') !==
      env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '')
  ) {
    errors.push('API URL settings must point to the same backend');
  }
  const key = env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (key && !/^pk_(test|live)_[A-Za-z0-9]+$/.test(key))
    errors.push('Stripe publishable key is malformed');
  if (
    env.EXPO_PUBLIC_ENVIRONMENT === 'staging' &&
    key &&
    !key.startsWith('pk_test_')
  ) {
    errors.push('Staging builds require Stripe sandbox keys');
  }
  if (env.EXPO_PUBLIC_USE_MOCK === 'true')
    errors.push('Release builds cannot use mock data');
  // Never include setting values in build logs.
  if (errors.length)
    throw new Error(
      `Mobile release configuration invalid: ${errors.join('; ')}`
    );
}

module.exports = { validateReleaseEnvironment };
