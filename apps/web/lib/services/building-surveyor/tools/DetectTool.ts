/**
 * Detect tool: wraps RoboflowDetectionService; maps detections to damage_taxonomy.damage_type.
 */

import { RoboflowDetectionService } from '../RoboflowDetectionService';
import { mapClassNameToDamageType } from './damage-type-mapping';
import type { DetectToolResult, ToolRun, ToolRunSummary } from './types';
import type { RoboflowDetection } from '../types';

export interface DetectToolParams {
  imageUrls: string[];
}

/**
 * Run detect tool: YOLO/Roboflow on image URLs; return result and summary for evidence.
 */
export async function runDetectTool(params: DetectToolParams): Promise<
  ToolRun<DetectToolResult>
> {
  const { imageUrls } = params;
  const normalizedUrls = imageUrls.slice(0, 8);

  const detections: RoboflowDetection[] = await RoboflowDetectionService.detect(normalizedUrls);

  const damageTypesDetected = new Set<string>();
  const mapped = detections.map((d) => {
    const damageType = mapClassNameToDamageType(d.className);
    if (damageType) damageTypesDetected.add(damageType);
    return {
      className: d.className,
      damageType: damageType ?? undefined,
      confidence: d.confidence,
      boundingBox: d.boundingBox,
    };
  });

  const avgConfidence =
    mapped.length > 0
      ? mapped.reduce((s, d) => s + d.confidence, 0) / mapped.length
      : 0;

  const result: DetectToolResult = {
    detections: mapped,
    detectionCount: mapped.length,
    damageTypesDetected: Array.from(damageTypesDetected),
  };

  const summary: ToolRunSummary = {
    success: true,
    confidence: avgConfidence * 100,
    count: mapped.length,
    damageTypesDetected: result.damageTypesDetected,
  };

  return {
    toolName: 'detect',
    params: { imageUrls: normalizedUrls },
    result,
    summary,
  };
}
