import { withCronHandler } from '@/lib/cron-handler';
import { DistillationProcessorService } from '@/lib/services/building-surveyor/DistillationProcessorService';

/**
 * Knowledge Distillation Job Processor.
 * Picks up pending distillation jobs and executes training.
 * Should be called every 30 minutes.
 */
export const GET = withCronHandler('distillation-processor', async () => {
  return await DistillationProcessorService.processNextPendingJob();
});
