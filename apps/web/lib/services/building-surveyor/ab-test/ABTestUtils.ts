/**
 * Utility functions for A/B Testing
 */

/**
 * Normalize property type for stratification
 * Maps industrial types (rail, construction) to standardized names
 */
export function normalizePropertyType(propertyType: string): string {
  const normalized = propertyType.toLowerCase().trim();
  
  // Industrial types
  if (normalized.includes('rail') || normalized.includes('railway') || normalized.includes('track')) {
    return 'rail';
  }
  if (normalized.includes('construction') || normalized.includes('site') || normalized.includes('infrastructure')) {
    return 'construction';
  }
  
  // Standard types
  if (normalized.includes('residential') || normalized.includes('home') || normalized.includes('house')) {
    return 'residential';
  }
  if (normalized.includes('commercial') || normalized.includes('business') || normalized.includes('office')) {
    return 'commercial';
  }
  
  // Default
  return normalized || 'residential';
}

/**
 * Get safety threshold based on property type
 * Industrial contexts (rail, construction) require stricter thresholds
 */
export function getSafetyThreshold(propertyType: string, config: {
  DELTA_SAFETY: number;
  DELTA_SAFETY_RAIL: number;
  DELTA_SAFETY_CONSTRUCTION: number;
}): number {
  const normalized = normalizePropertyType(propertyType);
  
  if (normalized === 'rail') {
    return config.DELTA_SAFETY_RAIL;
  }
  if (normalized === 'construction') {
    return config.DELTA_SAFETY_CONSTRUCTION;
  }
  
  return config.DELTA_SAFETY;
}

/**
 * Normalize damage category for stratification
 * Maps various damage types to canonical categories for consistent stratification
 */
export function normalizeDamageCategory(damageType: string): string {
  const normalized = damageType.toLowerCase().trim();
  
  // Map to canonical categories
  if (normalized.includes('structural') || normalized.includes('foundation')) {
    return 'structural';
  }
  if (normalized.includes('water') || normalized.includes('leak') || normalized.includes('flood')) {
    return 'water_damage';
  }
  if (normalized.includes('electrical') || normalized.includes('wiring')) {
    return 'electrical';
  }
  if (normalized.includes('mold') || normalized.includes('fungus')) {
    return 'mold';
  }
  if (normalized.includes('pest') || normalized.includes('termite') || normalized.includes('rodent')) {
    return 'pest';
  }
  if (normalized.includes('fire') || normalized.includes('smoke')) {
    return 'fire';
  }
  if (normalized.includes('roof') || normalized.includes('siding') || normalized.includes('exterior')) {
    return 'exterior';
  }
  
  // Default: cosmetic or unknown
  return 'cosmetic';
}

/**
 * Get current season for drift detection
 */
export function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Compute OOD (Out-of-Distribution) score
 * 
 * Detects unusual patterns that suggest the input is outside the training distribution.
 * Higher score = more likely to be OOD.
 */
export function computeOODScore(
  roboflowDetections: Array<{ confidence?: number }>,
  fusionResult: { fusionMean: number; fusionVariance: number; disagreementVariance: number }
): number {
  // OOD indicators:
  // 1. Very low detector confidence (unusual patterns)
  // 2. High variance/disagreement (uncertainty)
  // 3. No detections (unusual for property damage images)
  
  let oodScore = 0.0;

  // Low confidence suggests OOD
  if (fusionResult.fusionMean < 0.3) {
    oodScore += 0.4;
  } else if (fusionResult.fusionMean < 0.5) {
    oodScore += 0.2;
  }

  // High variance suggests uncertainty/OOD
  if (fusionResult.fusionVariance > 0.2) {
    oodScore += 0.3;
  } else if (fusionResult.fusionVariance > 0.1) {
    oodScore += 0.15;
  }

  // High disagreement suggests OOD
  if (fusionResult.disagreementVariance > 0.15) {
    oodScore += 0.2;
  }

  // No detections is unusual
  if (roboflowDetections.length === 0) {
    oodScore += 0.1;
  }

  return Math.min(1.0, oodScore);
}

