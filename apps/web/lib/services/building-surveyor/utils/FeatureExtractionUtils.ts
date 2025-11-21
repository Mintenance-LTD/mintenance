/**
 * Shared Feature Extraction Utilities
 * 
 * This module contains the robust handcrafted feature extraction logic
 * used by both BuildingSurveyorService and FeatureExtractorABTest.
 * 
 * This ensures A/B test results accurately reflect production performance.
 */

import type {
    AssessmentContext,
    RoboflowDetection,
    VisionAnalysisSummary,
    Phase1BuildingAssessment,
    UrgencyLevel,
} from '../types';
import { getConfig } from '../config/BuildingSurveyorConfig';

/**
 * Extract handcrafted features from images and context
 * Returns 40-dimension feature vector normalized to 0-1 range
 * 
 * This is the production-grade implementation used across the system.
 */
export async function extractHandcraftedFeatures(
    imageUrls: string[],
    context?: AssessmentContext,
    assessment?: Phase1BuildingAssessment,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
): Promise<number[]> {
    const config = getConfig();
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
    const visionHasStructural = Boolean(
        visionSummary?.detectedFeatures?.some((feature) =>
            feature.toLowerCase().includes('structural'),
        ),
    );
    const visionHasElectrical = Boolean(
        visionSummary?.detectedFeatures?.some((feature) =>
            feature.toLowerCase().includes('electrical'),
        ),
    );
    const visionHasMold =
        Boolean(
            visionSummary?.detectedFeatures?.some((feature) => feature.toLowerCase().includes('mold')),
        ) ||
        Boolean(
            visionSummary?.labels?.some((label) => label.description.toLowerCase().includes('mold')),
        );
    const uniqueDetectionClasses =
        detectionCount > 0 ? new Set((roboflowDetections || []).map((det) => det.className)).size : 0;
    const detectionConfidenceNormalized =
        detectionCount > 0 ? Math.min(1.0, avgDetectionConfidence / 100) : visionConfidenceNormalized;
    const classDiversity =
        detectionCount > 0 ? Math.min(1.0, uniqueDetectionClasses / detectionCount) : 0;
    const hazardSignal =
        detectionCount > 0
            ? Math.min(
                1.0,
                (moldDetections + crackDetections + moistureDetections) / Math.max(1, detectionCount),
            )
            : visionHasStructural || visionHasMold
                ? 0.7
                : 0.3;

    // 3. Image features (5 features)
    features.push(Math.min(1.0, imageUrls.length / 4)); // Image count normalized
    features.push(visionConfidenceNormalized); // Image quality proxy
    features.push(detectionConfidenceNormalized); // Lighting/clarity proxy
    features.push(classDiversity); // Angle/diversity proxy
    features.push(hazardSignal); // Damage visibility proxy

    const detectionAreas = (roboflowDetections || []).map(
        (det) => (det.boundingBox.width || 0) * (det.boundingBox.height || 0),
    );
    const totalDetectionArea = detectionAreas.reduce((sum, area) => sum + area, 0);
    const largestDetectionArea = detectionAreas.reduce((max, area) => Math.max(max, area), 0);
    const normalizedTotalArea =
        detectionCount > 0
            ? Math.min(1.0, totalDetectionArea / config.imageBaseArea)
            : 0;
    const averageDetectionAreaNormalized =
        detectionCount > 0
            ? Math.min(1.0, (totalDetectionArea / detectionCount) / config.imageBaseArea)
            : 0;
    const maxDetectionAreaNormalized =
        detectionCount > 0 ? Math.min(1.0, largestDetectionArea / config.imageBaseArea) : 0;
    const moldRatio = detectionCount > 0 ? moldDetections / detectionCount : 0;
    const structuralRatio = detectionCount > 0 ? crackDetections / detectionCount : 0;

    features.push(Math.min(1.0, detectionCount / 25)); // detection density
    features.push(normalizedTotalArea);
    features.push(averageDetectionAreaNormalized);
    features.push(moldRatio);
    features.push(structuralRatio);

    // 4. Damage characteristics (10 features)
    if (assessment) {
        features.push(encodeDamageType(assessment.damageAssessment.damageType));
        const severityValue = assessment.damageAssessment.severity === 'early' ? 0.33 :
            assessment.damageAssessment.severity === 'midway' ? 0.66 : 1.0;
        features.push(severityValue);
        features.push(assessment.damageAssessment.confidence / 100);
        features.push(encodeDamageLocation(assessment.damageAssessment.location));
        features.push(0.5); // Size indicators (placeholder)
        features.push(0.5); // Age indicators (placeholder)
        features.push(0.5); // Progression indicators (placeholder)
        features.push(Math.min(1.0, assessment.safetyHazards.hazards.length / 10));
        features.push(Math.min(1.0, assessment.compliance.complianceIssues.length / 10));
        features.push(assessment.insuranceRisk.riskScore / 100);
    } else {
        // Default values when assessment not yet available, informed by detections
        const inferredDamageType = visionHasMold
            ? 0.8
            : visionHasWater
                ? 0.4
                : visionHasStructural
                    ? 0.6
                    : 0.1;
        features.push(inferredDamageType); // Damage type (inferred)
        features.push(visionHasStructural ? 0.66 : 0.5); // Severity (structural risk indicator)
        features.push(visionConfidenceNormalized); // Confidence proxy
        features.push(visionHasWater ? 0.2 : 0.5); // Location proxy
        features.push(
            Math.min(1.0, detectionCount / 20),
            visionHasMold ? 0.7 : 0.5,
            visionHasStructural ? 0.6 : 0.5,
            0.0,
            0.0,
            visionConfidenceNormalized,
        ); // Placeholders influenced by evidence
    }

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

/**
 * Encode location string to 0-1 value
 */
export function encodeLocation(location: string): number {
    if (!location) return 0.5;
    // Simple hash-based encoding
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
        hash = ((hash << 5) - hash) + location.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
}

/**
 * Encode building style from property details
 */
export function encodeBuildingStyle(propertyDetails: string): number {
    if (!propertyDetails) return 0.5;
    const details = propertyDetails.toLowerCase();
    if (details.includes('victorian') || details.includes('period')) return 0.2;
    if (details.includes('modern') || details.includes('contemporary')) return 0.8;
    if (details.includes('new build')) return 0.9;
    return 0.5;
}

/**
 * Encode damage type to 0-1 value
 */
export function encodeDamageType(damageType: string): number {
    const types: Record<string, number> = {
        'water_damage': 0.1,
        'structural_crack': 0.2,
        'damp': 0.3,
        'roof_damage': 0.4,
        'electrical_issue': 0.5,
        'plumbing_issue': 0.6,
        'foundation_issue': 0.7,
        'mold': 0.8,
        'fire_damage': 0.9,
        'unknown_damage': 0.0,
    };
    return types[damageType] || 0.0;
}

/**
 * Encode damage location to 0-1 value
 */
export function encodeDamageLocation(location: string): number {
    const loc = location.toLowerCase();
    if (loc.includes('ceiling')) return 0.1;
    if (loc.includes('wall')) return 0.2;
    if (loc.includes('floor')) return 0.3;
    if (loc.includes('roof')) return 0.4;
    if (loc.includes('basement')) return 0.5;
    if (loc.includes('foundation')) return 0.6;
    return 0.5;
}

/**
 * Encode urgency level to 0-1 value
 */
export function encodeUrgency(urgency: UrgencyLevel): number {
    const values: Record<UrgencyLevel, number> = {
        'immediate': 1.0,
        'urgent': 0.8,
        'soon': 0.6,
        'planned': 0.4,
        'monitor': 0.2,
    };
    return values[urgency] || 0.5;
}
