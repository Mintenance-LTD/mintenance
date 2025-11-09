// import * as Sentry from '@sentry/nextjs'; // Temporarily disabled for Next.js 15 compatibility

// Mock Sentry for type safety when disabled
const Sentry = {
  setUser: (_user: any) => {},
  setTag: (_key: string, _value: any) => {},
};

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
  // Sentry temporarily disabled for Next.js 15 compatibility
  console.log('Sentry monitoring disabled for Next.js 15 compatibility');
  return;
  
  /* Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Set sampling rate for profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Performance monitoring
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/yourserver\.io\/api/,
        ],
      }),
      new Sentry.Replay({
        // Capture 10% of all sessions
        sessionSampleRate: 0.1,
        // Capture 100% of sessions with an error
        errorSampleRate: 1.0,
      }),
    ],
    
    // Capture unhandled promise rejections
    captureUnhandledRejections: true,
    
    // Capture uncaught exceptions
    captureUncaughtException: true,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Release version
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    
    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      // Filter out sensitive headers
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          delete event.request.headers[header];
        });
      }
      
      return event;
    },
    
    // Tags for better filtering
    initialScope: {
      tags: {
        component: 'web-app',
      },
    },
  */
}

/**
 * Capture custom events
 */
export const captureEvent = {
  // Sentry temporarily disabled for Next.js 15 compatibility
  userAction: (action: string, data?: Record<string, any>) => {
    console.log('Sentry disabled - User action:', action, data);
  },
  apiError: (endpoint: string, error: Error, statusCode?: number) => {
    console.error('Sentry disabled - API error:', endpoint, error.message, statusCode);
  },
  performance: (metric: string, value: number, unit: string = 'ms') => {
    console.log(`Sentry disabled - Performance: ${metric} = ${value}${unit}`);
  },
  businessMetric: (metric: string, value: number, tags?: Record<string, string>) => {
    console.log(`Sentry disabled - Business metric: ${metric} = ${value}`, tags);
  }
};

/**
 * Set user context for better error tracking
 */
export function setUserContext(user: {
  id: string;
  email: string;
  role: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
  });
  
  Sentry.setTag('user.role', user.role);
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
  Sentry.setTag('user.role', null);
}
