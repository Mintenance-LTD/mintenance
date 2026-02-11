// Sentry client-side configuration (Issue 41)
// Requires: npm install @sentry/nextjs
// Configure: NEXT_PUBLIC_SENTRY_DSN in .env

// Guard import — only initialise if the package is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;

try {
  // Dynamic require so the build doesn't fail if @sentry/nextjs is missing
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs');
} catch {
  // @sentry/nextjs not installed — Sentry monitoring disabled
}

if (Sentry) {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,

      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      integrations: [
        Sentry.browserTracingIntegration({
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.mintenance\.app\/api/,
          ],
        }),
        Sentry.replayIntegration({
          sessionSampleRate: 0.1,
          errorSampleRate: 1.0,
        }),
      ],

      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeSend(event: any) {
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
            sensitiveHeaders.forEach((header: string) => {
              if (event.request?.headers) {
                delete event.request.headers[header];
              }
            });
          }
        }
        return event;
      },

      initialScope: {
        tags: { component: 'web-app' },
      },
    });
  }
}

export {};
