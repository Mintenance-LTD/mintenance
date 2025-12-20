/**
 * Encoding Utilities for Building Surveyor Service
 * Converts categorical data into numeric features for ML models
 */

import type { UrgencyLevel } from './types';

/**
 * Encode location string to numeric value (0-1)
 * Simple hash-based encoding for UK locations
 */
export function encodeLocation(location: string): number {
  if (!location) return 0.5;
  
  // Simple hash of location string
  let hash = 0;
  for (let i = 0; i < location.length; i++) {
    const char = location.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Normalize to 0-1 range
  return Math.abs(hash % 1000) / 1000;
}

/**
 * Encode building style from property details
 */
export function encodeBuildingStyle(propertyDetails: string): number {
  if (!propertyDetails) return 0.5;
  
  const details = propertyDetails.toLowerCase();
  
  // Victorian, Edwardian, Georgian
  if (details.includes('victorian') || details.includes('edwardian') || details.includes('georgian')) {
    return 0.2; // Older properties
  }
  
  // Modern, contemporary
  if (details.includes('modern') || details.includes('contemporary') || details.includes('new build')) {
    return 0.8; // Newer properties
  }
  
  // Mid-century, 1960s-1980s
  if (details.includes('mid-century') || details.includes('1960') || details.includes('1970') || details.includes('1980')) {
    return 0.5; // Mid-range
  }
  
  return 0.5; // Default
}

/**
 * Encode damage type to numeric value
 */
export function encodeDamageType(damageType: string): number {
  if (!damageType) return 0.5;
  
  const type = damageType.toLowerCase();
  
  // Structural damage (most severe)
  if (type.includes('structural') || type.includes('foundation') || type.includes('load-bearing')) {
    return 0.9;
  }
  
  // Water damage (high severity)
  if (type.includes('water') || type.includes('flood') || type.includes('leak')) {
    return 0.7;
  }
  
  // Mold, rot (moderate-high)
  if (type.includes('mold') || type.includes('rot') || type.includes('damp')) {
    return 0.6;
  }
  
  // Cracks (moderate)
  if (type.includes('crack')) {
    return 0.5;
  }
  
  // Cosmetic (low)
  if (type.includes('cosmetic') || type.includes('paint') || type.includes('stain')) {
    return 0.2;
  }
  
  return 0.5; // Default
}

/**
 * Encode damage location to numeric value
 */
export function encodeDamageLocation(location: string): number {
  if (!location) return 0.5;
  
  const loc = location.toLowerCase();
  
  // Critical areas
  if (loc.includes('roof') || loc.includes('foundation') || loc.includes('structural')) {
    return 0.9;
  }
  
  // Important areas
  if (loc.includes('bathroom') || loc.includes('kitchen') || loc.includes('electrical')) {
    return 0.7;
  }
  
  // Standard areas
  if (loc.includes('wall') || loc.includes('ceiling') || loc.includes('floor')) {
    return 0.5;
  }
  
  // Less critical
  if (loc.includes('exterior') || loc.includes('garden') || loc.includes('shed')) {
    return 0.3;
  }
  
  return 0.5; // Default
}

/**
 * Encode urgency level to numeric value (0-1)
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

