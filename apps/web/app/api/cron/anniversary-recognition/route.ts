import { withCronHandler } from '@/lib/cron-handler';
import { AnniversaryService } from '@/lib/services/retention/AnniversaryService';

/**
 * Cron endpoint: send anniversary recognition emails to contractors
 * whose platform join date matches today's month/day.
 * Runs daily at 08:00 UTC.
 */
export const GET = withCronHandler('anniversary-recognition', async () => {
  return await AnniversaryService.sendAnniversaryEmails();
});
