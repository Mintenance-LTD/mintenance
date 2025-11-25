/**
 * Normalization Utilities for Building Surveyor Service
 * Normalizes AI responses to valid enum types
 */

import type { DamageSeverity, UrgencyLevel } from './types';

/**
 * Normalize damage category for conformal prediction
 */
export function normalizeDamageCategory(damageType: string): string {
  const normalized = damageType.toLowerCase().trim();
  
  if (normalized.includes('structural') || normalized.includes('foundation')) {
    return normalized.includes('major') || normalized.includes('severe') || normalized.includes('critical')
      ? 'structural_major'
      : 'structural_minor';
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
  
  return 'cosmetic';
}

/**
 * Normalize property type for stratification
 */
export function normalizePropertyType(propertyType: string): string {
  const normalized = propertyType.toLowerCase().trim();
  
  if (normalized.includes('rail')) return 'rail';
  if (normalized.includes('construction') || normalized.includes('site')) return 'construction';
  if (normalized.includes('commercial') || normalized.includes('business')) return 'commercial';
  if (normalized.includes('industrial')) return 'industrial';
  
  return 'residential';
}

/**
 * Get safety threshold based on property type
 */
export function getSafetyThreshold(propertyType: string): number {
  const normalized = normalizePropertyType(propertyType);
  
  if (normalized === 'rail') return 0.0001; // Stricter for rail
  if (normalized === 'construction') return 0.0005; // Stricter for construction
  return 0.001; // Default for residential/commercial
}

/**
 * Normalize severity to valid type
 */
export function normalizeSeverity(severity: unknown): DamageSeverity {
  if (severity === 'early' || severity === 'midway' || severity === 'full') {
    return severity;
  }
  // Default based on string matching
  const s = String(severity).toLowerCase();
  if (s.includes('early') || s.includes('minor') || s.includes('initial')) {
    return 'early';
  }
  if (s.includes('full') || s.includes('severe') || s.includes('complete')) {
    return 'full';
  }
  return 'midway'; // Default
}

/**
 * Normalize urgency to valid type
 */
export function normalizeUrgency(urgency: unknown): UrgencyLevel {
  const validUrgencies: UrgencyLevel[] = [
    'immediate',
    'urgent',
    'soon',
    'planned',
    'monitor',
  ];
  if (validUrgencies.includes(urgency as UrgencyLevel)) {
    return urgency as UrgencyLevel;
  }
  // Default based on string matching
  const u = String(urgency).toLowerCase();
  if (u.includes('immediate') || u.includes('emergency')) {
    return 'immediate';
  }
  if (u.includes('urgent')) {
    return 'urgent';
  }
  if (u.includes('soon') || u.includes('quick')) {
    return 'soon';
  }
  if (u.includes('planned') || u.includes('schedule')) {
    return 'planned';
  }
  return 'monitor'; // Default
}

