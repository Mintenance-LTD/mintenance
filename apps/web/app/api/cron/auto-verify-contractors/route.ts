import { withCronHandler } from '@/lib/cron-handler';
import { AutoVerificationService } from '@/lib/services/admin/AutoVerificationService';

/**
 * Cron endpoint for automatic contractor verification.
 * Evaluates unverified contractors against configurable rules and
 * auto-verifies eligible ones.
 *
 * Recommended schedule: daily
 */
export const GET = withCronHandler('auto-verify-contractors', async () => {
  const result = await AutoVerificationService.processAutoVerifications();
  return {
    verified: result.verified,
    skipped: result.skipped,
    errors: result.errors,
  };
});
