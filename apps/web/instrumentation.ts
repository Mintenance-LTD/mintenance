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

    // Log Roboflow configuration (if configured)
    const { logRoboflowConfig } = await import('./lib/config/roboflow.config');
    logRoboflowConfig();

    // Initialize local YOLO model if configured
    const { RoboflowDetectionService } = await import('./lib/services/building-surveyor/RoboflowDetectionService');
    await RoboflowDetectionService.initialize();

    // Start scheduled retraining checks (if enabled)
    if (process.env.YOLO_CONTINUOUS_LEARNING_ENABLED === 'true') {
      const { YOLORetrainingService } = await import('./lib/services/building-surveyor/YOLORetrainingService');
      
      // Check for retraining every 24 hours
      setInterval(async () => {
        try {
          await YOLORetrainingService.checkAndRetrain();
        } catch (error) {
          console.error('Scheduled retraining check failed:', error);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      // Also check immediately on startup (if conditions met)
      YOLORetrainingService.checkAndRetrain().catch((error) => {
        console.error('Initial retraining check failed:', error);
      });
      
      console.log('✅ YOLO continuous learning enabled - scheduled checks active');
    }

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
