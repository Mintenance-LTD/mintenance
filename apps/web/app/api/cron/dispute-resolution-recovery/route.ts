import { withCronHandler } from '@/lib/cron-handler';
import { runDisputeResolutionRecovery } from '@/lib/services/payment/DisputeResolutionRecoveryService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

export const maxDuration = 60;
export const GET = withCronHandler('dispute-resolution-recovery', async () => {
  const result = await runDisputeResolutionRecovery();
  if (result.failed)
    throw new ServiceUnavailableError('Dispute recovery requires attention');
  return result;
});
