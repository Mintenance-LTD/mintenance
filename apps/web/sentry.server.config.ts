/**
 * Sentry server-side initialization for Next.js 16 + Sentry SDK v10.
 *
 * Imported from `instrumentation.ts` when NEXT_RUNTIME === 'nodejs'.
 * Captures errors from Server Components, API routes, server actions,
 * and the Node.js runtime.
 *
 * Safe to deploy without `SENTRY_DSN` set — `Sentry.init` is only called
 * when the DSN is present, so preview/local environments without Sentry
 * configured are a no-op.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance tracing — 10% in prod to control cost.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    environment: process.env.NODE_ENV,
    release:
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      '1.2.4',

    // Scrub PII and auth secrets before any event leaves the server.
    // On the server we also strip request bodies because they may
    // include full form data (payment details, PII) that the client
    // would have redacted.
    beforeSend(event) {
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
        if (event.request.query_string) {
          event.request.query_string = '[REDACTED]';
        }
      }
      // Never let an OpenAI/Stripe/Supabase API key end up in an error
      // message. These are the prefix patterns we consider sensitive.
      if (event.message) {
        event.message = redactSecrets(event.message);
      }
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = redactSecrets(ex.value);
        }
      }
      return event;
    },

    initialScope: {
      tags: { component: 'web-server' },
    },
  });
}

function redactSecrets(input: string): string {
  return input
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-[REDACTED]')
    .replace(/sk_(live|test)_[A-Za-z0-9]{20,}/g, 'sk_$1_[REDACTED]')
    .replace(/whsec_[A-Za-z0-9]{20,}/g, 'whsec_[REDACTED]')
    .replace(
      /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
      '[JWT_REDACTED]'
    );
}
