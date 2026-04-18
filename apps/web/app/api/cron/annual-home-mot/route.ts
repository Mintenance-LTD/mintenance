import { withCronHandler } from '@/lib/cron-handler';
import { AnnualHomeMOTService } from '@/lib/services/retention/AnnualHomeMOTService';

/**
 * Annual Home MOT email — fires daily at 07:00 UTC and emails every
 * homeowner whose property anniversary lands today. R5 #6 of
 * docs/RETENTION_ROADMAP_2026.md.
 */
export const GET = withCronHandler('annual-home-mot', async () => {
  return await AnnualHomeMOTService.sendTodaysAnniversaries();
});
