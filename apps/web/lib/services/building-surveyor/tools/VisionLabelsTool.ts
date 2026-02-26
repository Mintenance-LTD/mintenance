/**
 * Vision labels tool: previously wrapped Google Cloud Vision.
 * Google Vision dependency removed — GPT-4o handles visual analysis directly.
 * Returns empty result to maintain interface compatibility.
 */

import type { VisionLabelsToolResult, ToolRun, ToolRunSummary } from './types';

export interface VisionLabelsToolParams {
  imageUrls: string[];
}

/**
 * Run vision_labels tool: returns empty result (Google Vision removed).
 * GPT-4o now handles all visual analysis directly via image URLs in prompts.
 */
export async function runVisionLabelsTool(params: VisionLabelsToolParams): Promise<
  ToolRun<VisionLabelsToolResult>
> {
  const { imageUrls } = params;
  const normalizedUrls = imageUrls.slice(0, 5);

  const result: VisionLabelsToolResult = {
    labels: [],
    detectedFeatures: [],
    confidence: 0,
  };

  const summary: ToolRunSummary = {
    success: false,
    message: 'Google Vision removed — GPT-4o handles visual analysis directly',
  };

  return {
    toolName: 'vision_labels',
    params: { imageUrls: normalizedUrls },
    result,
    summary,
  };
}
