import { logger } from '@mintenance/shared';
import { memoryManager } from '../../ml-engine/memory/MemoryManager';

/**
 * Memory-query phase extracted from AssessmentOrchestrator on
 * 2026-05-09. Queries all 3 memory levels in parallel for the
 * provided feature vector, weighs each result by confidence, and
 * returns a 5-dim adjustment vector for the orchestrator to feed
 * into the final assessment.
 *
 * Returns the zero vector on any failure — memory is best-effort
 * here; the GPT-4 assessment remains valid without it.
 */
export async function computeMemoryAdjustments(
  agentName: string,
  features: number[],
  useTitans: boolean
): Promise<number[]> {
  const memoryAdjustments: number[] = [0, 0, 0, 0, 0];

  try {
    const memorySystem = memoryManager.getMemorySystem(agentName);

    let processedFeatures = features;
    if (useTitans && memorySystem) {
      processedFeatures = await memorySystem.processWithTitans(features);
    }

    const memoryPromises = [0, 1, 2].map((level) =>
      memoryManager.query(agentName, processedFeatures.slice(0, 40), level)
    );

    const memoryResults = await Promise.all(memoryPromises);
    const validMemoryResults = memoryResults.filter(
      (result) => result.values && result.values.length === 5
    );

    if (validMemoryResults.length > 0) {
      let totalWeight = 0;
      const combined = [0, 0, 0, 0, 0];
      for (const result of validMemoryResults) {
        const weight = result.confidence;
        totalWeight += weight;
        for (let i = 0; i < 5; i++) {
          combined[i] += result.values[i] * weight;
        }
      }
      if (totalWeight > 0) {
        for (let i = 0; i < 5; i++) {
          memoryAdjustments[i] = combined[i] / totalWeight;
        }
      }
    }
  } catch (memoryError) {
    logger.warn('Memory query failed, continuing without adjustments', {
      service: 'AssessmentOrchestrator',
      error: memoryError,
    });
  }

  return memoryAdjustments;
}
