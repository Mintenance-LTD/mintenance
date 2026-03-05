import { withCronHandler } from '@/lib/cron-handler';
import { RecurringJobCreatorService } from '@/lib/services/recurring/RecurringJobCreatorService';

export const GET = withCronHandler('recurring-job-creator', async () => {
  return await RecurringJobCreatorService.processSchedules();
});
