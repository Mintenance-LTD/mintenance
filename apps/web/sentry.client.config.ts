/**
 * Sentry browser-runtime initialization for Next.js 16 + Sentry SDK v10.
 *
 * This module is imported by `app/sentry-init.tsx` (a client component
 * mounted inside <Providers />) so Sentry initializes exactly once per
 * browser session. Cannot live in instrumentation.ts because that file
 * runs only at server cold-start.
 *
 * Mirrors the redaction patterns from `apps/mobile/App.tsx` so server
 * + browser + mobile share one redaction contract — anything that
 * leaves the user's process is scrubbed identically across all three.
 *
 * Safe to import without `NEXT_PUBLIC_SENTRY_DSN` set — `Sentry.init`
 * is only called when the DSN is present, so preview/local
 * environments without Sentry configured are a no-op.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Mirrored from packages/shared/src/logger.ts redaction list AND
// apps/mobile/App.tsx browser-side scrubber. Any object key matching
// one of these (case-insensitive) is replaced with '[REDACTED]'
// before the event / breadcrumb is shipped to Sentry. Keeps secrets
// out of third-party observability even if a caller accidentally
// extras them into a breadcrumb payload.
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
      if (digits.length >= 13 && digits.length <= 19) {
        return '[REDACTED_CC]';
      }
      return match;
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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(k))) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = scrubValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance tracing — 10% in prod, 100% in development. The
    // server config uses the same rate so traces are joined across
    // client+server runtimes for a complete waterfall.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    environment: process.env.NODE_ENV,
    release:
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      '1.2.4',

    // Transient network noise on slow 3G + leaving-page cancellations
    // generate massive Sentry quota burn for zero useful signal.
    // Filter at the SDK level (Sentry SDK v10 supports an array of
    // string/regex matchers).
    ignoreErrors: [
      // User cancelled or back-navigated mid-fetch
      'AbortError',
      'cancelled',
      'aborted',
      // Network drops on mobile / weak wifi
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // Browser extensions
      /extension:\/\//,
      // Third-party noise from injected scripts
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    beforeSend(event) {
      // Scrub sensitive keys from extras, contexts, request payloads,
      // and breadcrumb data before shipping to Sentry. Mirrors the
      // server logger redaction set so the browser doesn't leak
      // anything the server side already hides.
      if (event.extra) {
        event.extra = scrubValue(event.extra) as typeof event.extra;
      }
      if (event.contexts) {
        event.contexts = scrubValue(event.contexts) as typeof event.contexts;
      }
      if (event.request) {
        // Strip cookies + Authorization headers + form data — same as
        // the mobile + server configs.
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
        if (event.request.query_string) {
          event.request.query_string = '[REDACTED]';
        }
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: b.message ? scrubString(b.message) : b.message,
          data: b.data ? (scrubValue(b.data) as typeof b.data) : b.data,
        }));
      }

      // Scrub the message + each exception's `value` so a stack trace
      // containing a JWT or CC number is redacted in-line.
      if (event.message) {
        event.message = scrubString(event.message);
      }
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrubString(ex.value);
        }
      }

      return event;
    },

    initialScope: {
      tags: { component: 'web-client' },
    },
  });
}
