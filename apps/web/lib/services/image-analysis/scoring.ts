/**
 * Pure helpers for cost estimation and confidence scoring.
 */

/**
 * Estimate cost factors based on condition and complexity
 */
export function estimateCostFactors(
  condition: 'excellent' | 'good' | 'fair' | 'poor',
  complexity: 'simple' | 'moderate' | 'complex',
  propertyType?: string
): {
  sizeMultiplier: number;
  complexityMultiplier: number;
  conditionMultiplier: number;
} {
  const conditionMultipliers = {
    excellent: 1.0,
    good: 1.1,
    fair: 1.3,
    poor: 1.6,
  };

  const complexityMultipliers = {
    simple: 0.8,
    moderate: 1.0,
    complex: 1.5,
  };

  const sizeMultipliers = {
    apartment: 0.9,
    house: 1.0,
    commercial: 1.2,
  };

  return {
    sizeMultiplier: propertyType ? sizeMultipliers[propertyType as keyof typeof sizeMultipliers] || 1.0 : 1.0,
    complexityMultiplier: complexityMultipliers[complexity],
    conditionMultiplier: conditionMultipliers[condition],
  };
}

/**
 * Calculate overall confidence in image analysis
 */
export function calculateConfidence(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>
): number {
  if (labels.length === 0 && objects.length === 0) {
    return 0;
  }

  // Average confidence from top labels and objects
  const topLabels = labels.slice(0, 5);
  const topObjects = objects.slice(0, 5);

  const avgLabelScore = topLabels.length > 0
    ? topLabels.reduce((sum, l) => sum + l.score, 0) / topLabels.length
    : 0;

  const avgObjectScore = topObjects.length > 0
    ? topObjects.reduce((sum, o) => sum + o.score, 0) / topObjects.length
    : 0;

  // Weighted average (labels are more reliable)
  const confidence = (avgLabelScore * 0.6 + avgObjectScore * 0.4) * 100;

  return Math.min(95, Math.max(30, Math.round(confidence)));
}
