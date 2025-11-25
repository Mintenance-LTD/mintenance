/**
 * Evidence Processor for Building Surveyor Service
 * Processes and summarizes evidence from multiple detection sources
 */

import type { ImageAnalysisResult } from '@/lib/services/ImageAnalysisService';
import type { RoboflowDetection, VisionAnalysisSummary } from './types';

/**
 * Map detailed Google Vision result into compact summary structure
 */
export function toVisionSummary(
  result: ImageAnalysisResult | null,
): VisionAnalysisSummary | null {
  if (!result) {
    return null;
  }

  return {
    provider: 'google-vision',
    confidence: result.confidence,
    labels: result.labels,
    objects: result.objects,
    detectedFeatures: result.detectedFeatures,
    suggestedCategories: result.suggestedCategories,
    propertyType: result.propertyType,
    condition: result.condition,
    complexity: result.complexity,
  };
}

/**
 * Build textual summary from multimodal evidence sources
 */
export function buildEvidenceSummary(
  roboflowDetections: RoboflowDetection[],
  visionAnalysis: VisionAnalysisSummary | null,
): string | undefined {
  const summaryParts: string[] = [];

  if (roboflowDetections.length > 0) {
    const topClasses = roboflowDetections
      .reduce<Record<string, { count: number; maxConfidence: number }>>((acc, detection) => {
        const key = detection.className.toLowerCase();
        const existing = acc[key] || { count: 0, maxConfidence: 0 };
        acc[key] = {
          count: existing.count + 1,
          maxConfidence: Math.max(existing.maxConfidence, detection.confidence),
        };
        return acc;
      }, {});

    const classSummary = Object.entries(topClasses)
      .map(
        ([name, stats]) =>
          `${stats.count} × ${name} (max confidence ${Math.round(stats.maxConfidence)}%)`,
      )
      .slice(0, 5);

    summaryParts.push(`Roboflow detected: ${classSummary.join('; ')}`);
  }

  if (visionAnalysis) {
    const topLabels = visionAnalysis.labels.slice(0, 5).map(
      (label) => `${label.description} (${Math.round(label.score * 100)}%)`,
    );
    const topObjects = visionAnalysis.objects.slice(0, 5).map(
      (obj) => `${obj.name} (${Math.round(obj.score * 100)}%)`,
    );
    const features = visionAnalysis.detectedFeatures.slice(0, 6).join(', ');

    summaryParts.push(`Google Vision confidence ${Math.round(visionAnalysis.confidence)}%`);
    if (topLabels.length > 0) {
      summaryParts.push(`Top labels: ${topLabels.join(', ')}`);
    }
    if (topObjects.length > 0) {
      summaryParts.push(`Objects: ${topObjects.join(', ')}`);
    }
    if (features) {
      summaryParts.push(`Features: ${features}`);
    }
  }

  if (summaryParts.length === 0) {
    return undefined;
  }

  return summaryParts.join('\n');
}

