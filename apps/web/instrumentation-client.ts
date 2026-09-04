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

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /bearer/i,
  /jwt/i,
  /api[_-]?key/i,
  /mfa/i,
  /totp/i,
  /^stripe_/i,
  /auth[_-]?tag/i,
  /^iv$/i,
  /credit[_-]?card/i,
  /^cc[_-]?num/i,
  /tax[_-]?id/i,
  /national[_-]?insurance/i,
  /dob|date[_-]?of[_-]?birth/i,
];

const JWT_SHAPE =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const CC_NUMBER_SHAPE = /\b(?:\d[ -]?){13,19}\b/g;
const STRIPE_SECRET_SHAPE = /sk_(?:live|test)_[A-Za-z0-9]{20,}/g;
const STRIPE_RESTRICTED_SHAPE = /rk_(?:live|test)_[A-Za-z0-9]{20,}/g;
const STRIPE_WEBHOOK_SHAPE = /whsec_[A-Za-z0-9]{20,}/g;
const OPENAI_KEY_SHAPE = /sk-[A-Za-z0-9_-]{20,}/g;

function scrubString(value: string): string {
  return value
    .replace(JWT_SHAPE, '[REDACTED_JWT]')
    .replace(STRIPE_SECRET_SHAPE, 'sk_[REDACTED]')
    .replace(STRIPE_RESTRICTED_SHAPE, 'rk_[REDACTED]')
    .replace(STRIPE_WEBHOOK_SHAPE, 'whsec_[REDACTED]')
    .replace(OPENAI_KEY_SHAPE, 'sk-[REDACTED]')
    .replace(CC_NUMBER_SHAPE, (match) => {
      const digits = match.replace(/[^0-9]/g, '');
      return digits.length >= 13 && digits.length <= 19
        ? '[REDACTED_CC]'
        : match;
    });
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      out[key] = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
        ? '[REDACTED]'
        : scrubValue(nestedValue, depth + 1);
    }
    return out;
  }
  return value;
}

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

    ignoreErrors: [
      'AbortError',
      'cancelled',
      'aborted',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      /extension:\/\//,
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

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
      if (event.extra) {
        event.extra = scrubValue(event.extra) as typeof event.extra;
      }
      if (event.contexts) {
        event.contexts = scrubValue(event.contexts) as typeof event.contexts;
      }
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-csrf-token',
            'stripe-signature',
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
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          message: breadcrumb.message
            ? scrubString(breadcrumb.message)
            : breadcrumb.message,
          data: breadcrumb.data
            ? (scrubValue(breadcrumb.data) as typeof breadcrumb.data)
            : breadcrumb.data,
        }));
      }
      if (event.message) {
        event.message = scrubString(event.message);
      }
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.value) exception.value = scrubString(exception.value);
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
