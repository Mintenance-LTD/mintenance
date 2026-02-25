import { withCronHandler } from '@/lib/cron-handler';
import { VLMRetrainingService } from '@/lib/services/building-surveyor/VLMRetrainingService';

/**
 * VLM Student Retraining Cron - Daily check for retraining needs.
 * Checks buffer size, last training date, and triggers retraining
 * with calibration recalculation when thresholds are met.
 */
export const GET = withCronHandler(
  'vlm-retraining',
  async () => {
    return await VLMRetrainingService.checkAndRetrain();
  },
  { maxRequests: 1, windowMs: 86400000 } // 1 per day
);
