/**
 * Sentry Utilities
 * 
 * Safe Sentry imports with fallback no-op functions for when Sentry is not available.
 * This ensures the app continues to work even if Sentry configuration is missing.
 */

// Safe Sentry imports
let sentryFunctions: any = {};

try {
  const sentry = require('../config/sentry');
  sentryFunctions = {
    setUserContext: sentry.setUserContext || (() => {}),
    trackUserAction: sentry.trackUserAction || (() => {}),
    addBreadcrumb: sentry.addBreadcrumb || (() => {}),
    measureAsyncPerformance: sentry.measureAsyncPerformance || ((fn: any) => fn()),
  };
} catch (error) {
  console.log('Sentry not available, using no-op functions');
  sentryFunctions = {
    setUserContext: () => {},
    trackUserAction: () => {},
    addBreadcrumb: () => {},
    measureAsyncPerformance: (fn: any) => fn(),
  };
}

export const {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} = sentryFunctions;
