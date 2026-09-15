import { withCronHandler } from '@/lib/cron-handler';
import { runAdminReleaseRecovery } from '@/lib/services/payment/AdminReleaseRecoveryService';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

export const maxDuration = 60;
export const GET = withCronHandler('admin-release-recovery', async () => {
  const result = await runAdminReleaseRecovery();
  if (result.failed)
    throw new ServiceUnavailableError('Release recovery requires attention');
  return result;
});
