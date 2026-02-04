/**
 * Vision labels tool: wraps ImageAnalysisService.analyzePropertyImages.
 */

import { ImageAnalysisService } from '@/lib/services/ImageAnalysisService';
import type { VisionLabelsToolResult, ToolRun, ToolRunSummary } from './types';

export interface VisionLabelsToolParams {
  imageUrls: string[];
}

/**
 * Run vision_labels tool: Google Vision (or future OpenCLIP) on image URLs; return result and summary.
 */
export async function runVisionLabelsTool(params: VisionLabelsToolParams): Promise<
  ToolRun<VisionLabelsToolResult>
> {
  const { imageUrls } = params;
  const normalizedUrls = imageUrls.slice(0, 5);

  const analysis = await ImageAnalysisService.analyzePropertyImages(normalizedUrls, 5);

  if (!analysis) {
    return {
      toolName: 'vision_labels',
      params: { imageUrls: normalizedUrls },
      result: { labels: [], detectedFeatures: [], confidence: 0 },
      summary: { success: false, message: 'Image analysis not available' },
    };
  }

  const labels = (analysis.labels ?? []).map((l) => ({
    description: l.description ?? '',
    score: l.score ?? 0,
  }));
  const detectedFeatures = analysis.detectedFeatures ?? [];
  const confidence = (analysis.confidence ?? 0) * 100;

  const result: VisionLabelsToolResult = {
    labels,
    detectedFeatures,
    confidence,
  };

  const summary: ToolRunSummary = {
    success: true,
    confidence,
    count: labels.length,
    detectedFeatures,
  };

  return {
    toolName: 'vision_labels',
    params: { imageUrls: normalizedUrls },
    result,
    summary,
  };
}
