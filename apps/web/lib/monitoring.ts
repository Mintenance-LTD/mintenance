import * as Sentry from '@sentry/nextjs';
import { logger } from '@mintenance/shared';

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Sentry client/server configs handle the actual init (sentry.client.config.ts / sentry.server.config.ts).
 * This module provides helper functions for capturing events and setting user context.
 */
export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('Sentry DSN not configured — error monitoring is disabled. Set NEXT_PUBLIC_SENTRY_DSN in your environment.', {
      service: 'monitoring',
    });
    return;
  }
  logger.info('Sentry monitoring active', { service: 'monitoring' });
}

/**
 * Capture custom events
 */
export const captureEvent = {
  userAction: (action: string, data?: Record<string, unknown>) => {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: action,
      data,
      level: 'info',
    });
  },
  apiError: (endpoint: string, error: Error, statusCode?: number) => {
    Sentry.captureException(error, {
      tags: {
        endpoint,
        statusCode: statusCode?.toString(),
      },
    });
  },
  performance: (metric: string, value: number, unit: string = 'ms') => {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metric}: ${value}${unit}`,
      level: 'info',
    });
  },
  businessMetric: (metric: string, value: number, tags?: Record<string, string>) => {
    Sentry.addBreadcrumb({
      category: 'business-metric',
      message: `${metric}: ${value}`,
      data: tags,
      level: 'info',
    });
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
