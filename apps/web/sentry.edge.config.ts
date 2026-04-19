/**
 * Sentry edge-runtime initialization for Next.js 16 + Sentry SDK v10.
 *
 * Imported from `instrumentation.ts` when NEXT_RUNTIME === 'edge'.
 * Captures errors from middleware.ts and any route handlers using
 * `export const runtime = 'edge'`.
 *
 * Kept minimal on purpose: the edge runtime has a tight bundle-size
 * budget (1MB) and does not support `replayIntegration` or heavier
 * Sentry features.
 *
 * Safe to deploy without `SENTRY_DSN` — no-op if missing.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Edge traces sampled lower than server — middleware runs on every
    // request and we don't want to 10x our Sentry quota.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    environment: process.env.NODE_ENV,
    release:
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      '1.2.4',

    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-csrf-token',
          ];
          for (const header of sensitiveHeaders) {
            delete event.request.headers[header];
          }
        }
        if (event.request.query_string) {
          event.request.query_string = '[REDACTED]';
        }
      }
      return event;
    },

    initialScope: {
      tags: { component: 'web-edge' },
    },
  });
}
