import { withCronHandler } from '@/lib/cron-handler';
import { AgentProcessorService } from '@/lib/services/agents/AgentProcessorService';

/**
 * Cron endpoint for AI agent processing cycle.
 * Runs job status monitoring, predictive risk assessment, and weather rescheduling.
 * Should be called every hour.
 */
export const GET = withCronHandler('agent-processor', async () => {
  return await AgentProcessorService.runProcessingCycle();
});
