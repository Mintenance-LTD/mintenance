/**
 * Error Reporting Module
 * Handles Sentry integration and remote error reporting
 */

import { logger } from '../logger';
import { ErrorTracker } from '../errorTracking';
import { ErrorCategory, ErrorSeverity, ErrorContext } from './ErrorTypes';

export class ErrorReporting {
  private analyticsEnabled = true;

  /**
   * Report error to Sentry and other tracking services
   */
  reportError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {},
    userId?: string
  ): string {
    if (!this.analyticsEnabled) return '';

    try {
      // Delegate to original error tracker (Sentry integration)
      const eventId = ErrorTracker.captureError(error, category, severity, {
        userId,
        feature: context.feature,
        userJourney: context.userJourney,
        jobId: context.jobId,
        contractorId: context.contractorId,
        experimentVariant: context.experimentVariant
      }, context.customData);

      logger.debug('ErrorReporting', 'Error reported to Sentry', {
        category,
        severity,
        eventId
      });

      return eventId;
    } catch (reportingError) {
      logger.error('ErrorReporting', 'Failed to report error', reportingError as Error);
      return '';
    }
  }

  /**
   * Enable or disable reporting
   */
  setReportingEnabled(enabled: boolean): void {
    this.analyticsEnabled = enabled;
    logger.info('ErrorReporting', `Error reporting ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if reporting is enabled
   */
  isReportingEnabled(): boolean {
    return this.analyticsEnabled;
  }
}
