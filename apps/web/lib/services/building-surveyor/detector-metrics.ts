/**
 * Detector Metrics for Building Surveyor Service
 * Computes metrics from multiple detection sources
 */

import type { RoboflowDetection, VisionAnalysisSummary } from './types';

/**
 * Compute out-of-distribution score
 */
export function computeOODScore(
  roboflowDetections: RoboflowDetection[],
  bayesianFusionResult: { mean: number; variance: number }
): number {
  // High variance suggests OOD
  // Low detection count suggests OOD
  const detectionCount = roboflowDetections.length;
  const varianceScore = Math.min(1, bayesianFusionResult.variance * 2);
  const countScore = detectionCount === 0 ? 0.8 : Math.max(0, 1 - detectionCount / 10);
  
  return Math.max(0, Math.min(1, (varianceScore + countScore) / 2));
}

/**
 * Compute detector disagreement (variance between detectors)
 */
export function computeDetectorDisagreement(
  roboflowDetections: RoboflowDetection[],
  visionAnalysis: VisionAnalysisSummary | null,
  assessmentConfidence: number
): number {
  const roboflowConfidence = roboflowDetections.length > 0
    ? roboflowDetections.reduce((sum, d) => sum + d.confidence, 0) / roboflowDetections.length / 100
    : 0.5;
  
  const visionConfidence = visionAnalysis?.confidence ? visionAnalysis.confidence / 100 : 0.5;
  const gptConfidence = assessmentConfidence / 100;

  // Compute variance between confidences
  const confidences = [roboflowConfidence, visionConfidence, gptConfidence].filter(c => c > 0);
  if (confidences.length === 0) return 0;

  const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / confidences.length;

  return Math.min(1, Math.sqrt(variance));
}

