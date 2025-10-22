/**
 * Next.js 15 instrumentation file
 * Runs at startup to validate production configuration
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and validate all environment variables
    // This will throw with detailed errors if any required vars are missing or invalid
    const { env, isProduction } = await import('./lib/env');

    console.log('✅ Environment variables validated successfully');

    if (isProduction()) {
      console.log('🚀 Running in production mode');

      // Additional production checks
      if (env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        console.warn('⚠️  WARNING: Using Stripe test key in production!');
      }

      if (!env.UPSTASH_REDIS_REST_URL) {
        console.warn('⚠️  WARNING: Redis not configured - rate limiting will be degraded');
      }
    }
  }
}
