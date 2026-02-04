/**
 * Segment tool: wraps SAM3Service; segments by damage types from taxonomy.
 */

import { SAM3Service } from '../SAM3Service';
import type { DamageTypeSegmentation } from '../SAM3Service';
import type { SegmentToolResult, ToolRun, ToolRunSummary } from './types';

export interface SegmentToolParams {
  imageUrl: string;
  damageTypes: string[];
}

/**
 * Run segment tool: SAM3 segmentation for each damage type; return result and summary.
 */
export async function runSegmentTool(params: SegmentToolParams): Promise<
  ToolRun<SegmentToolResult>
> {
  const { imageUrl, damageTypes } = params;

  const commonTypes = [
    'water damage',
    'crack',
    'mold',
    'rot',
    'stain',
    'structural damage',
    'wall_crack',
    'mold_damp',
    'pipe_leak',
  ];
  const toSegment = damageTypes.length > 0 ? damageTypes : commonTypes;

  let result: DamageTypeSegmentation | null = null;
  try {
    const available = await SAM3Service.healthCheck();
    if (available) {
      result = await SAM3Service.segmentDamageTypes(imageUrl, toSegment);
    }
  } catch {
    // SAM3 optional; continue with empty result
  }

  const damageTypesResult: Record<string, { numInstances: number; confidence: number }> = {};
  let segmentCount = 0;
  if (result?.success && result.damage_types) {
    for (const [type, data] of Object.entries(result.damage_types)) {
      const numInstances = data?.num_instances ?? 0;
      const scores = data?.scores ?? [];
      const confidence = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      damageTypesResult[type] = { numInstances, confidence };
      segmentCount += numInstances;
    }
  }

  const resultOut: SegmentToolResult = {
    damageTypes: damageTypesResult,
    segmentCount,
  };

  const avgConfidence =
    Object.keys(damageTypesResult).length > 0
      ? Object.values(damageTypesResult).reduce((s, v) => s + v.confidence, 0) /
        Object.keys(damageTypesResult).length
      : 0;

  const summary: ToolRunSummary = {
    success: result?.success ?? false,
    confidence: avgConfidence * 100,
    count: segmentCount,
    damageTypes: Object.keys(damageTypesResult),
  };

  return {
    toolName: 'segment',
    params: { imageUrl, damageTypes: toSegment },
    result: resultOut,
    summary,
  };
}
