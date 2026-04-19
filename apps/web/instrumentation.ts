/**
 * Next.js instrumentation file
 * Runs at startup on every serverless function cold start.
 * CRITICAL: Must never throw — an unhandled error here crashes ALL routes.
 *
 * Sentry integration (2026-04-15):
 *   Imports `sentry.server.config.ts` at Node.js runtime startup and
 *   `sentry.edge.config.ts` at edge runtime startup. Exports
 *   `onRequestError = Sentry.captureRequestError` which is the
 *   Next.js 15+ / Sentry v10 convention for capturing errors thrown
 *   in Server Components, route handlers, and middleware.
 *
 *   Both configs are no-ops when SENTRY_DSN is not set, so this file
 *   is safe to deploy before the DSN is configured in Vercel.
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Sentry runtime init — load the config matching the current runtime.
  // Wrapped in try/catch so a missing/broken Sentry config never crashes
  // the server on cold start.
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config');
    }
  } catch (sentryError) {
    console.error(
      '[instrumentation] Sentry initialization failed (non-fatal):',
      sentryError
    );
  }

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
            logger.warn('WARNING: Using Stripe test key in production!', {
              service: 'instrumentation',
            });
          }

          if (!env.UPSTASH_REDIS_REST_URL) {
            logger.warn(
              'WARNING: Redis not configured - rate limiting will be degraded',
              { service: 'instrumentation' }
            );
          }
        }
      } catch (envError) {
        // Log but don't crash — routes can still function with
        // fallback env handling in individual modules
        console.error(
          '[instrumentation] Environment validation failed:',
          envError
        );
      }

      // Initialize Roboflow (optional, non-critical)
      try {
        const { logRoboflowConfig } =
          await import('./lib/config/roboflow.config');
        logRoboflowConfig();
      } catch {
        // Roboflow not configured — OK
      }

      // Initialize YOLO model (optional, non-critical)
      try {
        const { RoboflowDetectionService } =
          await import('./lib/services/building-surveyor/RoboflowDetectionService');
        await RoboflowDetectionService.initialize();
      } catch {
        // YOLO model not available — OK
      }

      // Start scheduled retraining checks (if enabled)
      if (process.env.YOLO_CONTINUOUS_LEARNING_ENABLED === 'true') {
        try {
          const { YOLORetrainingService } =
            await import('./lib/services/building-surveyor/YOLORetrainingService');
          setInterval(
            async () => {
              try {
                await YOLORetrainingService.checkAndRetrain();
              } catch (error) {
                logger.error('Scheduled retraining check failed', error, {
                  service: 'yolo-retraining',
                });
              }
            },
            24 * 60 * 60 * 1000
          );

          YOLORetrainingService.checkAndRetrain().catch((error) => {
            logger.error('Initial retraining check failed', error, {
              service: 'yolo-retraining',
            });
          });

          logger.info(
            'YOLO continuous learning enabled - scheduled checks active'
          );
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

/**
 * Sentry's App Router error hook (Next.js 15+ / Sentry SDK v10 convention).
 * Next.js calls this whenever an error is thrown in a Server Component,
 * Server Action, Route Handler, middleware, or edge runtime. Sentry's
 * captureRequestError is safe to export unconditionally — when no DSN
 * is configured, it becomes a no-op.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional
 */
export const onRequestError = Sentry.captureRequestError;
