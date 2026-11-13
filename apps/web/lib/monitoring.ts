import * as Sentry from '@sentry/nextjs';
import { logger } from '@mintenance/shared';

/**
 * Capture custom events
 */
const captureEvent = {
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
  businessMetric: (
    metric: string,
    value: number,
    tags?: Record<string, string>
  ) => {
    Sentry.addBreadcrumb({
      category: 'business-metric',
      message: `${metric}: ${value}`,
      data: tags,
      level: 'info',
    });
  },
};
