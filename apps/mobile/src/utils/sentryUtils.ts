/**
 * Sentry Utilities
 *
 * Safe Sentry imports with fallback no-op functions for when Sentry is not available.
 * This ensures the app continues to work even if Sentry configuration is missing.
 */

import { logger } from './logger';
import type { User } from '@mintenance/types';

/** Type-safe function signatures for Sentry utilities */
type SetUserContextFn = (user: User | null) => void;
type TrackUserActionFn = (action: string, data?: Record<string, unknown>) => void;
type AddBreadcrumbFn = (message: string, category?: string) => void;
type MeasureAsyncPerformanceFn = <T>(fn: () => Promise<T>, name: string, category: string) => Promise<T>;

interface SentryFunctions {
  setUserContext: SetUserContextFn;
  trackUserAction: TrackUserActionFn;
  addBreadcrumb: AddBreadcrumbFn;
  measureAsyncPerformance: MeasureAsyncPerformanceFn;
}

// Safe Sentry imports
let sentryFunctions: SentryFunctions;

try {
  const sentry = require('../config/sentry');
  sentryFunctions = {
    setUserContext: sentry.setUserContext || (() => {}),
    trackUserAction: sentry.trackUserAction || (() => {}),
    addBreadcrumb: sentry.addBreadcrumb || (() => {}),
    measureAsyncPerformance: sentry.measureAsyncPerformance || (<T>(fn: () => Promise<T>) => fn()),
  };
} catch (error) {
  logger.debug('Sentry not available, using no-op functions');
  sentryFunctions = {
    setUserContext: () => {},
    trackUserAction: () => {},
    addBreadcrumb: () => {},
    measureAsyncPerformance: <T>(fn: () => Promise<T>) => fn(),
  };
}

export const {
  setUserContext,
  trackUserAction,
  addBreadcrumb,
  measureAsyncPerformance,
} = sentryFunctions;
