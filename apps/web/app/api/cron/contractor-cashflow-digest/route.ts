import { withCronHandler } from '@/lib/cron-handler';
import { CashFlowDigestService } from '@/lib/services/retention/CashFlowDigestService';

/**
 * Friday cash-flow digest for contractors.
 * Runs every Friday at 09:00 UTC. Positions Mintenance as "the platform
 * that pays" per R2 of docs/RETENTION_ROADMAP_2026.md.
 */
export const GET = withCronHandler('contractor-cashflow-digest', async () => {
  return await CashFlowDigestService.sendWeeklyDigest();
});
