/**
 * Modality probability extractors for Bayesian fusion.
 * Each extractor maps a modality's evidence to a {probability, confidence, quality} tuple.
 * Pure functions — no class state.
 *
 * Extracted from EnhancedBayesianFusionService.
 */
import type { EnhancedFusionInput } from '../EnhancedBayesianFusionService';
import type { SceneGraphFeatures } from '../scene_graph_features';

interface ModalityProbability {
  probability: number;
  confidence: number;
  quality: number;
}

const DEFAULT_PROBABILITY: ModalityProbability = {
  probability: 0.5,
  confidence: 0,
  quality: 0,
};

/**
 * Extract damage probability from YOLO detections.
 * Based on detection counts × average confidence, with a slight boost
 * because YOLO tends to be conservative.
 */
export function extractYOLOProbability(
  yoloEvidence?: EnhancedFusionInput['yoloEvidence']
): ModalityProbability {
  if (!yoloEvidence || yoloEvidence.totalDetections === 0) {
    return DEFAULT_PROBABILITY;
  }

  const maxDetections = 10;
  const detectionRate = Math.min(
    1,
    yoloEvidence.totalDetections / maxDetections
  );
  const probability = detectionRate * (yoloEvidence.avgConfidence / 100);
  const quality = yoloEvidence.avgConfidence > 70 ? 0.9 : 0.7;

  return {
    probability: Math.min(1, probability * 1.2),
    confidence: yoloEvidence.avgConfidence / 100,
    quality,
  };
}

/**
 * Extract damage probability from SAM3 segmentation.
 * Prefers presence scores when available (more precise) and falls back to
 * instance-weighted confidence otherwise.
 */
export function extractSAM3Probability(
  sam3Evidence?: EnhancedFusionInput['sam3Evidence']
): ModalityProbability {
  if (!sam3Evidence || !sam3Evidence.damageTypes) {
    return DEFAULT_PROBABILITY;
  }

  if (
    sam3Evidence.presenceChecked &&
    sam3Evidence.averagePresenceScore !== undefined
  ) {
    const probability = sam3Evidence.averagePresenceScore;
    let maxPresenceScore = 0;
    for (const damage of Object.values(sam3Evidence.damageTypes)) {
      maxPresenceScore = Math.max(maxPresenceScore, damage.presenceScore || 0);
    }
    const quality = maxPresenceScore > 0.7 ? 0.95 : 0.8;
    return {
      probability,
      confidence: sam3Evidence.overallConfidence,
      quality,
    };
  }

  // Fallback: instance-weighted confidence
  let weightedSum = 0;
  let totalWeight = 0;
  for (const damage of Object.values(sam3Evidence.damageTypes)) {
    const weight = damage.numInstances;
    weightedSum += damage.confidence * weight;
    totalWeight += weight;
  }
  const probability =
    totalWeight > 0
      ? weightedSum / totalWeight
      : sam3Evidence.overallConfidence;

  return {
    probability,
    confidence: sam3Evidence.overallConfidence,
    quality: 0.85,
  };
}

/**
 * Extract damage probability from GPT-4 Vision assessment.
 * Maps the severity string to a probability, boosted when critical hazards flagged.
 */
export function extractGPT4Probability(
  gpt4Assessment?: EnhancedFusionInput['gpt4Assessment']
): ModalityProbability {
  if (!gpt4Assessment) {
    return DEFAULT_PROBABILITY;
  }

  const severityMap: Record<string, number> = {
    none: 0.05,
    minimal: 0.15,
    minor: 0.3,
    early: 0.35,
    moderate: 0.6,
    midway: 0.65,
    severe: 0.85,
    full: 0.9,
    critical: 0.95,
    emergency: 0.99,
  };

  const baseProbability =
    severityMap[gpt4Assessment.severity.toLowerCase()] || 0.5;
  const probability = gpt4Assessment.hasCriticalHazards
    ? Math.min(1, baseProbability * 1.15)
    : baseProbability;
  const quality = gpt4Assessment.confidence > 80 ? 0.9 : 0.75;

  return {
    probability,
    confidence: gpt4Assessment.confidence / 100,
    quality,
  };
}

/**
 * Extract damage probability from scene graph features.
 * Weighted combination of critical-hazard flag, crack density, damage severity,
 * and inverted structural integrity.
 */
export function extractSceneGraphProbability(
  sceneGraph: SceneGraphFeatures
): ModalityProbability {
  const features = sceneGraph.compactFeatureVector || sceneGraph.featureVector;

  const hasCriticalHazard = features[0] || 0;
  const crackDensity = features[1] || 0;
  const damageSeverity = features[5] || 0;
  const structuralIntegrity = features[7] || 0.5;

  const probability = Math.min(
    1,
    hasCriticalHazard * 0.35 +
      crackDensity * 0.25 +
      damageSeverity * 0.25 +
      (1 - structuralIntegrity) * 0.15
  );

  return {
    probability,
    confidence: sceneGraph.spatialFeatures.avgNodeConfidence,
    quality: 0.7,
  };
}
