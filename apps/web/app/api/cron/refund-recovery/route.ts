import { withCronHandler } from '@/lib/cron-handler';
import { runRefundRecovery } from '@/lib/services/payment/RefundRecoveryService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

export const maxDuration = 60;
export const GET = withCronHandler('refund-recovery', async () => {
  const result = await runRefundRecovery();
  if (result.failed)
    throw new ServiceUnavailableError('Refund recovery requires attention');
  return result;
});
