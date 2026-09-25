import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../../utils/mobileApiClient';

/**
 * Analyse the existing record using its already-attached photos. The server owns
 * the result and failure state; a client timeout must never overwrite a result.
 */
export async function triggerAIAnalysis(assessmentId: string): Promise<void> {
  try {
    await mobileApiClient.post(
      `/api/assessments/${encodeURIComponent(assessmentId)}/analyze`,
      {},
      { timeout: 300_000 }
    );
  } catch (error) {
    logger.warn('Assessment analysis request interrupted; check saved status', {
      assessmentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
