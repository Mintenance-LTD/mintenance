// Sentry temporarily disabled - install @sentry/nextjs to enable
// To enable Sentry monitoring:
// 1. npm install @sentry/nextjs
// 2. Uncomment the code below
// 3. Configure NEXT_PUBLIC_SENTRY_DSN in .env

/*
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Set sampling rate for profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Performance monitoring
  integrations: [
    Sentry.httpIntegration(),
  ],

  // Environment
  environment: process.env.NODE_ENV,

  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Before send hook to filter sensitive data
  beforeSend(event: Parameters<NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>>[0], hint: Parameters<NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>>[1]) {
    // Filter out sensitive data
    if (event.request) {
      if (event.request.cookies) {
        delete event.request.cookies;
      }

      // Filter out sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          if (event.request && event.request.headers) {
            delete event.request.headers[header];
          }
        });
      }
    }

    return event;
  },

  // Tags for better filtering
  initialScope: {
    tags: {
      component: 'web-server',
    },
  },
});
*/

export {};
