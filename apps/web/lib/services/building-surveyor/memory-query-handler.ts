/**
 * Memory Query Handler for Building Surveyor Service
 * Handles memory queries and adjustment combination
 */

import { memoryManager } from '../ml-engine/memory/MemoryManager';
import type { MemoryQueryResult } from '../ml-engine/memory/types';
import { logger } from '@mintenance/shared';

const AGENT_NAME = 'building-surveyor';

/**
 * Query memory system for learned adjustments
 * Returns array of 5 adjustment values: [damage_type, severity, cost, urgency, confidence]
 */
export async function queryMemoryAdjustments(
  features: number[],
  useTitans: boolean = false
): Promise<number[]> {
  let memoryAdjustments: number[] = [0, 0, 0, 0, 0]; // Default: no adjustments

  try {
    const memorySystem = memoryManager.getMemorySystem(AGENT_NAME);

    let processedFeatures = features;
    if (useTitans && memorySystem) {
      // Use Titans-enhanced processing
      processedFeatures = await memorySystem.processWithTitans(features);
    }

    const memoryResults: MemoryQueryResult[] = [];
    for (let level = 0; level < 3; level++) {
      const result = await memoryManager.query(AGENT_NAME, processedFeatures.slice(0, 40), level);
      if (result.values && result.values.length === 5) {
        memoryResults.push(result);
      }
    }

    // Combine adjustments from all levels (weighted by confidence)
    if (memoryResults.length > 0) {
      let totalWeight = 0;
      const combined = [0, 0, 0, 0, 0];
      for (const result of memoryResults) {
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
      service: 'memory-query-handler',
      error: memoryError,
    });
  }

  return memoryAdjustments;
}

