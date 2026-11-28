function applyAndroidStagingEnvironment(env = process.env) {
  if (env.MINTENANCE_ANDROID_STAGING_PROJECT !== '1') return;

  // Expo Preview also inherits organisation variables. Select only the
  // dedicated staging inputs before evaluating config or inlining the bundle.
  const supabaseUrl = env.MINTENANCE_STAGING_SUPABASE_URL ?? '';
  const apiUrl = env.MINTENANCE_STAGING_API_URL ?? '';
  Object.assign(env, {
    EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: env.MINTENANCE_STAGING_SUPABASE_CLIENT_KEY ?? '',
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: env.MINTENANCE_STAGING_STRIPE_KEY ?? '',
    EXPO_PUBLIC_API_URL: apiUrl,
    EXPO_PUBLIC_API_BASE_URL: apiUrl,
    EXPO_PUBLIC_WEB_URL: apiUrl,
    EXPO_PUBLIC_MOBILE_API_GATEWAY_URL: supabaseUrl
      ? `${supabaseUrl}/functions/v1/mobile-api-relay`
      : '',
    EXPO_PUBLIC_ENABLE_ANALYTICS: 'false',
    EXPO_PUBLIC_ENABLE_CRASH_REPORTING: 'false',
    EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING: 'false',
    EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: 'false',
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '',
    GOOGLE_MAPS_API_KEY: '',
  });
}

module.exports = { applyAndroidStagingEnvironment };
