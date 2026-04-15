/**
 * Sentry client-side initialization for Next.js 16 + Sentry SDK v10.
 *
 * This file is auto-loaded by Next.js on the client side when the app
 * first hydrates. It replaces the older `sentry.client.config.ts`
 * convention (which Sentry v9+ deprecated in favor of
 * `instrumentation-client.ts`).
 *
 * Safe to deploy without `NEXT_PUBLIC_SENTRY_DSN` set — `Sentry.init` is
 * only called when the DSN is present, so preview/local environments
 * without Sentry configured are a no-op.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance tracing — keep low in production to avoid blowing
    // through the Sentry quota. Bump in staging if you need more
    // visibility into a specific flow.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay — only capture replays when an error is thrown in
    // production, and sample 10% of routine sessions for baseline UX.
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Propagate trace headers to our own APIs but NOT to third-party
    // services — avoids leaking internal trace IDs to Stripe/Supabase.
    tracePropagationTargets: [
      'localhost',
      /^\/api\//,
      /^https:\/\/.*\.mintenance\.co\.uk\/api/,
      /^https:\/\/.*\.mintenance\.app\/api/,
    ],

    environment: process.env.NODE_ENV,
    release:
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      '1.2.4',

    // Scrub PII and auth secrets before any event leaves the browser.
    // Even with `sendDefaultPii: false` (Sentry's default), a user-typed
    // error message may contain the sensitive data, so we also filter
    // headers and cookies defensively.
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
        // Strip query params that may contain tokens
        if (event.request.query_string) {
          event.request.query_string = '[REDACTED]';
        }
      }
      return event;
    },

    initialScope: {
      tags: { component: 'web-client' },
    },
  });
}

// Instrument App Router navigations so Sentry creates transactions
// spanning client-side route changes. Required for accurate page
// performance metrics in Sentry v10+.
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/instrumentation/automatic-instrumentation/
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
