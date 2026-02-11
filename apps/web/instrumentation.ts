/**
 * Next.js instrumentation file
 * Runs at startup on every serverless function cold start.
 * CRITICAL: Must never throw — an unhandled error here crashes ALL routes.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { logger } = await import('@mintenance/shared');

      // Validate environment variables (logs warnings but doesn't throw)
      try {
        const { env, isProduction } = await import('./lib/env');
        logger.info('Environment variables validated successfully');

        if (isProduction()) {
          logger.info('Running in production mode');

          if (env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
            logger.warn('WARNING: Using Stripe test key in production!', { service: 'instrumentation' });
          }

          if (!env.UPSTASH_REDIS_REST_URL) {
            logger.warn('WARNING: Redis not configured - rate limiting will be degraded', { service: 'instrumentation' });
          }
        }
      } catch (envError) {
        // Log but don't crash — routes can still function with
        // fallback env handling in individual modules
        console.error('[instrumentation] Environment validation failed:', envError);
      }

      // Initialize Roboflow (optional, non-critical)
      try {
        const { logRoboflowConfig } = await import('./lib/config/roboflow.config');
        logRoboflowConfig();
      } catch {
        // Roboflow not configured — OK
      }

      // Initialize YOLO model (optional, non-critical)
      try {
        const { RoboflowDetectionService } = await import('./lib/services/building-surveyor/RoboflowDetectionService');
        await RoboflowDetectionService.initialize();
      } catch {
        // YOLO model not available — OK
      }

      // Start scheduled retraining checks (if enabled)
      if (process.env.YOLO_CONTINUOUS_LEARNING_ENABLED === 'true') {
        try {
          const { YOLORetrainingService } = await import('./lib/services/building-surveyor/YOLORetrainingService');
          setInterval(async () => {
            try {
              await YOLORetrainingService.checkAndRetrain();
            } catch (error) {
              logger.error('Scheduled retraining check failed', error, { service: 'yolo-retraining' });
            }
          }, 24 * 60 * 60 * 1000);

          YOLORetrainingService.checkAndRetrain().catch((error) => {
            logger.error('Initial retraining check failed', error, { service: 'yolo-retraining' });
          });

          logger.info('YOLO continuous learning enabled - scheduled checks active');
        } catch {
          // YOLO retraining not available — OK
        }
      }
    } catch (error) {
      // Last-resort catch — never let instrumentation crash the server
      console.error('[instrumentation] Fatal error during startup:', error);
    }
  }
}
