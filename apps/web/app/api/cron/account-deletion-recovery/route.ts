import { withCronHandler } from '@/lib/cron-handler';
import { runAccountDeletionCleanup } from '@/lib/services/account/AccountDeletionRecoveryService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';
export const maxDuration = 60;
export const GET = withCronHandler('account-deletion-recovery', async () => {
  const result = await runAccountDeletionCleanup();
  if (result.retried || result.needsReview)
    throw new ServiceUnavailableError('Account deletion cleanup');
  return { processed: result.completed };
});
