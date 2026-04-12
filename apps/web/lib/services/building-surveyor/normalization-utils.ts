/**
 * Normalization Utilities for Building Surveyor Service
 * Normalizes AI responses to valid enum types
 */

import type {
  DamageSeverity,
  UrgencyLevel,
  CanonicalDamageType,
} from './types';

/**
 * Normalize damage category for conformal prediction
 */
export function normalizeDamageCategory(damageType: string): string {
  const normalized = damageType.toLowerCase().trim();

  if (normalized.includes('structural') || normalized.includes('foundation')) {
    return normalized.includes('major') ||
      normalized.includes('severe') ||
      normalized.includes('critical')
      ? 'structural_major'
      : 'structural_minor';
  }
  if (
    normalized.includes('water') ||
    normalized.includes('leak') ||
    normalized.includes('flood')
  ) {
    return 'water_damage';
  }
  if (normalized.includes('electrical') || normalized.includes('wiring')) {
    return 'electrical';
  }
  if (normalized.includes('mold') || normalized.includes('fungus')) {
    return 'mold';
  }
  if (
    normalized.includes('pest') ||
    normalized.includes('termite') ||
    normalized.includes('rodent')
  ) {
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
  if (normalized.includes('construction') || normalized.includes('site'))
    return 'construction';
  if (normalized.includes('commercial') || normalized.includes('business'))
    return 'commercial';
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
 * Normalize severity to valid 4-tier type.
 * Handles legacy 3-tier values (midway→developing, full→dangerous) and free-text GPT labels.
 */
export function normalizeSeverity(severity: unknown): DamageSeverity {
  // Direct match on new 4-tier values
  if (
    severity === 'early' ||
    severity === 'developing' ||
    severity === 'significant' ||
    severity === 'dangerous'
  ) {
    return severity;
  }
  // Legacy 3-tier mapping
  if (severity === 'midway') return 'developing';
  if (severity === 'full') return 'dangerous';

  // Free-text matching
  const s = String(severity).toLowerCase();
  if (
    s.includes('early') ||
    s.includes('minor') ||
    s.includes('initial') ||
    s.includes('cosmetic')
  ) {
    return 'early';
  }
  if (
    s.includes('significant') ||
    s.includes('serious') ||
    s.includes('advanced')
  ) {
    return 'significant';
  }
  if (
    s.includes('dangerous') ||
    s.includes('severe') ||
    s.includes('critical') ||
    s.includes('structural') ||
    s.includes('complete')
  ) {
    return 'dangerous';
  }
  return 'developing'; // Default (was 'midway')
}

/**
 * Map free-text damage type string to one of 15 canonical types.
 * Used to normalize GPT-4o output before DB storage.
 */
export function canonicalizeDamageType(
  damageType: string
): CanonicalDamageType {
  const d = damageType.toLowerCase().trim();

  // Already canonical
  const CANONICAL: CanonicalDamageType[] = [
    'pipe_leak',
    'water_damage',
    'wall_crack',
    'roof_damage',
    'electrical_fault',
    'mold_damp',
    'fire_damage',
    'window_broken',
    'door_damaged',
    'floor_damage',
    'ceiling_damage',
    'foundation_crack',
    'hvac_issue',
    'gutter_blocked',
    'general_damage',
    'none',
  ];
  if (CANONICAL.includes(d as CanonicalDamageType))
    return d as CanonicalDamageType;

  // Water / pipe
  if (
    d.includes('leak') ||
    d.includes('burst') ||
    d.includes('pipe') ||
    d.includes('plumbing') ||
    d.includes('faucet')
  )
    return 'pipe_leak';
  if (d.includes('water damage') || d.includes('water_damage'))
    return 'water_damage';

  // Structural
  if (
    d.includes('structural') &&
    (d.includes('collapse') || d.includes('major') || d.includes('foundation'))
  )
    return 'foundation_crack';
  if (
    d.includes('crack') ||
    d.includes('plaster') ||
    (d.includes('wall') && !d.includes('mold'))
  )
    return 'wall_crack';

  // Roof
  if (
    d.includes('roof') ||
    d.includes('shingle') ||
    (d.includes('tile') && !d.includes('floor'))
  )
    return 'roof_damage';

  // Mold / damp
  if (
    d.includes('mold') ||
    d.includes('mould') ||
    d.includes('damp') ||
    d.includes('fungus')
  )
    return 'mold_damp';

  // Fire
  if (d.includes('fire')) return 'fire_damage';

  // Electrical
  if (d.includes('electr') || d.includes('wiring')) return 'electrical_fault';

  // Corrosion / cosmetic
  if (
    d.includes('corrosion') ||
    d.includes('rust') ||
    d.includes('cosmetic') ||
    d.includes('paint') ||
    d.includes('discoloration') ||
    d.includes('stain')
  )
    return 'general_damage';

  // Window
  if (d.includes('window') || d.includes('glazing')) return 'window_broken';

  // Floor
  if (d.includes('floor') || d.includes('paving')) return 'floor_damage';

  // Ceiling
  if (d.includes('ceiling')) return 'ceiling_damage';

  // HVAC
  if (
    d.includes('hvac') ||
    d.includes('boiler') ||
    d.includes('heating') ||
    d.includes('mechanical')
  )
    return 'hvac_issue';

  // Gutter
  if (d.includes('gutter') || d.includes('drain')) return 'gutter_blocked';

  // None / unknown
  if (d === 'none' || d === 'unknown' || d === '') return 'none';

  return 'general_damage';
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
