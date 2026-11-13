import * as Sentry from '@sentry/react-native';
import { User } from '@mintenance/types';
import { setSentryFunctions, logger } from '../utils/logger';
import { config, isFeatureEnabled } from './environment';

/**
 * @deprecated Not wired into the app. Sentry is initialised directly in
 * App.tsx (which owns the PII-redaction `beforeSend` scrubber), and App.tsx
 * also wires the logger→Sentry bridge via `setSentryFunctions`. Do NOT call
 * this — it would re-init Sentry with a config that lacks that scrubber.
 * Kept only because its unit tests document the bridge contract.
 */
export const initSentry = () => {
  // Check if crash reporting is enabled and if we have a DSN
  if (!isFeatureEnabled('enableCrashReporting') || !config.sentryDsn) {
    logger.info('Sentry disabled', {
      crashReportingEnabled: isFeatureEnabled('enableCrashReporting'),
      hasDsn: !!config.sentryDsn,
    });
    // Set up no-op functions for logger
    setSentryFunctions({
      captureMessage: () => {},
      captureException: () => {},
      addBreadcrumb: () => {},
    });
    return;
  }

  // Use @sentry/react-native directly for initialization (removed sentry-expo for security)
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.environment,
    debug: config.environment === 'development',
    beforeSend(event) {
      // AUDIT_PUNCH_LIST P2 #73 (B6-P2-4) — drop dev-environment events
      // unless `EXPO_PUBLIC_SENTRY_DEBUG=1` is set, matching the
      // override App.tsx already supports. Without this escape,
      // there was no way to test Sentry wiring locally.
      if (
        config.environment === 'development' &&
        !process.env.EXPO_PUBLIC_SENTRY_DEBUG
      ) {
        return null;
      }
      return event;
    },
  });

  // Set up Sentry functions for logger after initialization
  setSentryFunctions({
    captureMessage: (message: string, level: string) => {
      Sentry.captureMessage(message, level as Sentry.SeverityLevel);
    },
    captureException: Sentry.captureException,
    addBreadcrumb: Sentry.addBreadcrumb,
  });
};

export const captureException = (
  error: Error,
  extra?: Record<string, unknown>
) => {
  if (
    !isFeatureEnabled('enableCrashReporting') ||
    config.environment === 'development'
  ) {
    logger.error('Sentry', error, extra);
    return;
  }

  Sentry.captureException(error, {
    extra,
  });
};





export const addBreadcrumb = (
  message: string,
  category?: string,
  data?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'app',
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
};

// Performance monitoring utilities




// Network request monitoring


// Navigation tracking


// Business logic monitoring
export const trackUserAction = (
  action: string,
  details?: Record<string, unknown>
) => {
  addBreadcrumb(`User action: ${action}`, 'user', details);
};

// App state monitoring

