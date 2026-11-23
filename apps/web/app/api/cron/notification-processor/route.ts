import { withCronHandler } from '@/lib/cron-handler';
import { NotificationProcessorService } from '@/lib/services/notifications/NotificationProcessorService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';
import { QuoteAmendmentEmailService } from '@/lib/services/notifications/QuoteAmendmentEmailService';
import { advanceEmergencyReports } from '@/lib/services/notifications/EmergencyReportService';

/**
 * Cron endpoint for processing notification delivery and retries.
 * Should be called every 5 minutes.
 */
export const maxDuration = 60;
export const GET = withCronHandler('notification-processor', async () => {
  // Advance ownership before delivery, even if the previous alert was sent,
  // muted, missed, or exhausted its retries. Failures surface in cron health.
  const emergencyReportsAdvanced = await advanceEmergencyReports();
  const [result, email] = await Promise.all([
    NotificationProcessorService.processQueuedNotifications(),
    QuoteAmendmentEmailService.process(),
  ]);
  if (
    result.queuedErrors > 0 ||
    email.emailErrors > 0 ||
    email.emailNeedsReview > 0
  ) {
    throw new ServiceUnavailableError(
      'Notification processing needs recovery.'
    );
  }
  return { ...result, ...email, emergencyReportsAdvanced };
});
