/**
 * Feature Extractor for Building Surveyor Service
 * Extracts features from images and context for memory system
 */

import type {
  Phase1BuildingAssessment,
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from './types';
import {
  encodeLocation,
  encodeBuildingStyle,
  encodeDamageType,
  encodeDamageLocation,
  encodeUrgency,
} from './encoding-utils';
import { LearnedFeatureExtractor } from './LearnedFeatureExtractor';
import { logger } from '@mintenance/shared';

/**
 * Extract detection features from images and context
 * Returns 40-dimension feature vector normalized to 0-1 range
 * 
 * Uses learned feature extractor if enabled, otherwise falls back to handcrafted features
 */
export async function extractDetectionFeatures(
  imageUrls: string[],
  context?: AssessmentContext,
  assessment?: Phase1BuildingAssessment,
  roboflowDetections?: RoboflowDetection[],
  visionSummary?: VisionAnalysisSummary | null,
  useLearnedFeatures: boolean = false,
  learnedFeatureExtractor: LearnedFeatureExtractor | null = null
): Promise<number[]> {
  // Use learned feature extractor if available and enabled
  if (useLearnedFeatures && learnedFeatureExtractor) {
    try {
      return await learnedFeatureExtractor.extractFeatures(
        imageUrls,
        context,
        roboflowDetections,
        visionSummary
      );
    } catch (error) {
      logger.warn('Learned feature extraction failed, falling back to handcrafted', {
        service: 'feature-extractor',
        error: error instanceof Error ? error.message : 'unknown',
      });
      // Fall through to handcrafted features
    }
  }

  // Fallback to handcrafted features
  return extractDetectionFeaturesHandcrafted(
    imageUrls,
    context,
    assessment,
    roboflowDetections,
    visionSummary
  );
}

/**
 * Handcrafted feature extraction (original implementation)
 * Kept as fallback and for comparison
 */
export function extractDetectionFeaturesHandcrafted(
  imageUrls: string[],
  context?: AssessmentContext,
  assessment?: Phase1BuildingAssessment,
  roboflowDetections?: RoboflowDetection[],
  visionSummary?: VisionAnalysisSummary | null
): number[] {
  const features: number[] = [];

  // 1. Property context (5 features)
  const propertyType = context?.propertyType || 'residential';
  features.push(propertyType === 'residential' ? 1.0 : propertyType === 'commercial' ? 0.5 : 0.0);
  features.push(Math.min(1.0, (context?.ageOfProperty || 50) / 200)); // Normalized age
  features.push(encodeLocation(context?.location || '')); // Encoded location
  features.push(encodeBuildingStyle(context?.propertyDetails || '')); // Encoded style
  features.push(0.5); // Property value tier (placeholder, can be enhanced)

  // 2. Detection evidence metrics
  const detectionCount = roboflowDetections?.length ?? 0;
  const avgDetectionConfidence =
    detectionCount > 0
      ? (roboflowDetections || []).reduce((sum, det) => sum + det.confidence, 0) / detectionCount
      : 0;
  const moldDetections =
    roboflowDetections?.filter((det) => det.className.toLowerCase().includes('mold')).length || 0;
  const crackDetections =
    roboflowDetections?.filter((det) => det.className.toLowerCase().includes('crack')).length || 0;
  const moistureDetections =
    roboflowDetections?.filter((det) => det.className.toLowerCase().includes('moist')).length || 0;
  const visionConfidenceNormalized = Math.min(1.0, (visionSummary?.confidence ?? 50) / 100);
  const visionHasWater = Boolean(
    visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('water')),
  );
  const visionHasMold = Boolean(
    visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('mold')),
  );
  const visionHasStructural = Boolean(
    visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('structural') || 
      label.description.toLowerCase().includes('crack') || 
      label.description.toLowerCase().includes('damage')),
  );
  const visionHasElectrical = Boolean(
    visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('electrical') || 
      label.description.toLowerCase().includes('wire')),
  );

  const detectionConfidenceNormalized = Math.min(1.0, avgDetectionConfidence / 100);
  const hazardSignal = Math.min(1.0, (moldDetections + moistureDetections) / 10);

  features.push(Math.min(1.0, detectionCount / 20)); // Normalized detection count
  features.push(detectionConfidenceNormalized);
  features.push(Math.min(1.0, moldDetections / 5));
  features.push(Math.min(1.0, crackDetections / 5));
  features.push(Math.min(1.0, moistureDetections / 5));
  features.push(visionConfidenceNormalized);
  features.push(visionHasWater ? 1.0 : 0.0);
  features.push(visionHasMold ? 1.0 : 0.0);
  features.push(visionHasStructural ? 1.0 : 0.0);
  features.push(visionHasElectrical ? 1.0 : 0.0);
  features.push(hazardSignal);

  // 3. Damage type and location encoding (5 features)
  if (assessment) {
    features.push(encodeDamageType(assessment.damageAssessment.damageType));
    features.push(encodeDamageLocation(assessment.damageAssessment.location));
  } else {
    // Infer from detections
    const hasWaterDamage = visionHasWater || moistureDetections > 0;
    const hasCrackDamage = crackDetections > 0 || visionHasStructural;
    const hasMoldDamage = visionHasMold || moldDetections > 0;
    
    if (hasWaterDamage) {
      features.push(encodeDamageType('water_damage'));
    } else if (hasCrackDamage) {
      features.push(encodeDamageType('structural_crack'));
    } else if (hasMoldDamage) {
      features.push(encodeDamageType('mold'));
    } else {
      features.push(0.0); // Unknown
    }
    
    features.push(0.5); // Location unknown
  }

  // 4. Image metadata (5 features)
  features.push(Math.min(1.0, imageUrls.length / 10)); // Normalized image count
  features.push(0.5); // Average image quality (placeholder)
  features.push(0.5); // Average image resolution (placeholder)
  features.push(0.0); // Has exterior images (placeholder)
  features.push(0.0); // Has interior images (placeholder)

  // 5. Assessment scores (5 features)
  if (assessment) {
    features.push(assessment.safetyHazards.overallSafetyScore / 100);
    features.push(assessment.compliance.complianceScore / 100);
    features.push(assessment.insuranceRisk.riskScore / 100);
    features.push(encodeUrgency(assessment.urgency.urgency));
    features.push(assessment.urgency.priorityScore / 100);
  } else {
    features.push(
      visionHasStructural ? 0.4 : 0.7,
      visionHasElectrical ? 0.5 : 0.8,
      detectionCount > 0 ? detectionConfidenceNormalized : 0.5,
      visionHasStructural ? 0.6 : 0.4,
      visionConfidenceNormalized,
    );
  }

  // 6. Cost features (5 features)
  if (assessment?.contractorAdvice?.estimatedCost) {
    const cost = assessment.contractorAdvice.estimatedCost;
    features.push(Math.min(1.0, cost.min / 10000));
    features.push(Math.min(1.0, cost.max / 10000));
    features.push(Math.min(1.0, cost.recommended / 10000));
    features.push(Math.min(1.0, (cost.max - cost.min) / 10000));
    const complexityValue = assessment.contractorAdvice.complexity === 'low' ? 0.33 :
                          assessment.contractorAdvice.complexity === 'medium' ? 0.66 : 1.0;
    features.push(complexityValue);
  } else {
    const structuralRisk = visionHasStructural || crackDetections > 0;
    features.push(
      Math.min(1.0, detectionCount / 20),
      Math.min(1.0, (moldDetections + moistureDetections) / 10),
      detectionConfidenceNormalized,
      hazardSignal,
      structuralRisk ? 0.7 : visionHasMold ? 0.6 : 0.4,
    );
  }

  // 7. Temporal features (5 features)
  const now = new Date();
  features.push((now.getMonth() / 11) * 0.25 + (now.getDate() / 30) * 0.25); // Time of year
  features.push(0.5); // Weather context (placeholder)
  features.push(0.0); // Assessment frequency (placeholder)
  features.push(0.0); // Days since first detection (placeholder)
  features.push(0.0); // Follow-up indicator (0 = initial)

  // Ensure exactly 40 features
  while (features.length < 40) {
    features.push(0.0);
  }

  return features.slice(0, 40);
}

