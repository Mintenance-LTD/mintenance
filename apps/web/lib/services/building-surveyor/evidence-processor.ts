/**
 * Evidence Processor for Building Surveyor Service
 * Processes and summarizes evidence from Roboflow detections.
 * Google Cloud Vision removed — GPT-4o handles visual analysis directly.
 */

import type { RoboflowDetection, VisionAnalysisSummary } from './types';

/**
 * Sanitise ML-sourced labels before injecting into GPT prompts.
 * Strips anything that could be a prompt injection attempt from
 * external API responses (Roboflow className, Vision API labels/objects).
 */
export function sanitiseMLLabel(label: string, maxLength = 100): string {
  return label
    // Only allow alphanumeric, spaces, hyphens, underscores, parentheses
    .replace(/[^\w\s\-(),.]/g, '')
    // Strip prompt injection patterns
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '')
    .replace(/you\s+are\s+now\s+/gi, '')
    .replace(/system\s*:\s*/gi, '')
    .replace(/assistant\s*:\s*/gi, '')
    .replace(/\bdo\s+not\s+follow\b/gi, '')
    .replace(/\boverride\b/gi, '')
    .replace(/\bdisregard\b/gi, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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
        const key = sanitiseMLLabel(detection.className).toLowerCase();
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

  // VisionAnalysisSummary kept for backward compat (preRunEvidence may still supply it)
  if (visionAnalysis) {
    const topLabels = visionAnalysis.labels.slice(0, 5).map(
      (label) => `${sanitiseMLLabel(label.description)} (${Math.round(label.score * 100)}%)`,
    );
    const topObjects = visionAnalysis.objects.slice(0, 5).map(
      (obj) => `${sanitiseMLLabel(obj.name)} (${Math.round(obj.score * 100)}%)`,
    );
    const features = visionAnalysis.detectedFeatures.slice(0, 6).map(f => sanitiseMLLabel(f)).join(', ');

    summaryParts.push(`Vision confidence ${Math.round(visionAnalysis.confidence)}%`);
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
