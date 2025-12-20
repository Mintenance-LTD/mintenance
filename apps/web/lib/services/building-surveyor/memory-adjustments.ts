/**
 * Memory Adjustments for Building Surveyor Service
 * Applies learned adjustments from memory system to assessments
 */

import type { Phase1BuildingAssessment, DamageSeverity, UrgencyLevel } from './types';

/**
 * Apply memory adjustments to assessment
 * adjustments: [damage_type_adjustment, severity_adjustment, cost_adjustment, urgency_adjustment, confidence_calibration]
 */
export function applyMemoryAdjustments(
  assessment: Phase1BuildingAssessment,
  adjustments: number[]
): Phase1BuildingAssessment {
  const [damageTypeAdj, severityAdj, costAdj, urgencyAdj, confidenceCal] = adjustments;

  // Apply confidence calibration
  const calibratedConfidence = calibrateConfidence(
    assessment.damageAssessment.confidence,
    confidenceCal
  );

  // Apply severity adjustment
  const adjustedSeverity = applySeverityAdjustment(
    assessment.damageAssessment.severity,
    severityAdj
  );

  // Apply urgency adjustment
  const adjustedUrgency = applyUrgency(
    assessment.urgency.urgency,
    urgencyAdj
  );

  // Apply cost adjustment
  const adjustedCost = adjustCostEstimate(
    assessment.contractorAdvice.estimatedCost,
    costAdj
  );

  // Create adjusted assessment
  return {
    ...assessment,
    damageAssessment: {
      ...assessment.damageAssessment,
      severity: adjustedSeverity,
      confidence: calibratedConfidence,
    },
    urgency: {
      ...assessment.urgency,
      urgency: adjustedUrgency,
    },
    contractorAdvice: {
      ...assessment.contractorAdvice,
      estimatedCost: adjustedCost,
    },
  };
}

/**
 * Apply damage type adjustment (currently not modifying type, but could be enhanced)
 */
export function applyDamageTypeAdjustment(originalType: string, adjustment: number): string {
  // For now, return original type
  // Future: Could adjust confidence or suggest alternative types
  return originalType;
}

/**
 * Apply severity adjustment
 */
export function applySeverityAdjustment(
  originalSeverity: DamageSeverity,
  adjustment: number
): DamageSeverity {
  // Adjustment is in range [-1, 1], where:
  // -1 = reduce severity (full -> midway -> early)
  // +1 = increase severity (early -> midway -> full)
  // 0 = no change

  if (Math.abs(adjustment) < 0.1) {
    return originalSeverity; // No significant adjustment
  }

  const severityOrder: DamageSeverity[] = ['early', 'midway', 'full'];
  const currentIndex = severityOrder.indexOf(originalSeverity);

  if (adjustment > 0.3) {
    // Increase severity
    if (currentIndex < severityOrder.length - 1) {
      return severityOrder[currentIndex + 1];
    }
  } else if (adjustment < -0.3) {
    // Decrease severity
    if (currentIndex > 0) {
      return severityOrder[currentIndex - 1];
    }
  }

  return originalSeverity;
}

/**
 * Calibrate confidence based on memory feedback
 */
export function calibrateConfidence(originalConfidence: number, calibration: number): number {
  // Calibration is in range [-1, 1], where:
  // -1 = reduce confidence significantly
  // +1 = increase confidence significantly
  // 0 = no change

  const adjustment = calibration * 20; // Scale to ±20 points
  const calibrated = originalConfidence + adjustment;

  return Math.max(0, Math.min(100, calibrated));
}

/**
 * Adjust cost estimate based on memory feedback
 */
export function adjustCostEstimate(
  originalCost: { min: number; max: number; recommended: number },
  adjustment: number
): { min: number; max: number; recommended: number } {
  // Adjustment is in range [-1, 1], where:
  // -1 = reduce cost by up to 50%
  // +1 = increase cost by up to 50%
  // 0 = no change

  if (Math.abs(adjustment) < 0.1) {
    return originalCost; // No significant adjustment
  }

  const multiplier = 1 + (adjustment * 0.5); // Scale to ±50%

  return {
    min: Math.max(0, Math.round(originalCost.min * multiplier)),
    max: Math.max(0, Math.round(originalCost.max * multiplier)),
    recommended: Math.max(0, Math.round(originalCost.recommended * multiplier)),
  };
}

/**
 * Adjust urgency level
 */
export function applyUrgency(originalUrgency: UrgencyLevel, adjustment: number): UrgencyLevel {
  // Adjustment is in range [-1, 1], where:
  // -1 = reduce urgency (immediate -> urgent -> soon -> planned -> monitor)
  // +1 = increase urgency (monitor -> planned -> soon -> urgent -> immediate)
  // 0 = no change

  if (Math.abs(adjustment) < 0.1) {
    return originalUrgency; // No significant adjustment
  }

  const urgencyOrder: UrgencyLevel[] = ['monitor', 'planned', 'soon', 'urgent', 'immediate'];
  const currentIndex = urgencyOrder.indexOf(originalUrgency);

  if (adjustment > 0.3) {
    // Increase urgency
    if (currentIndex < urgencyOrder.length - 1) {
      return urgencyOrder[currentIndex + 1];
    }
  } else if (adjustment < -0.3) {
    // Decrease urgency
    if (currentIndex > 0) {
      return urgencyOrder[currentIndex - 1];
    }
  }

  return originalUrgency;
}

