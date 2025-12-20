/**
 * Configuration constants for A/B Testing Harness
 */

export const AB_TEST_CONFIG = {
  /** Effective context dimension */
  D_EFF: 12,
  
  /** Safety threshold (default) */
  DELTA_SAFETY: 0.001,
  
  /** Stricter threshold for rail infrastructure */
  DELTA_SAFETY_RAIL: 0.0001,
  
  /** Stricter threshold for construction sites */
  DELTA_SAFETY_CONSTRUCTION: 0.0005,
} as const;

// Export DELTA_SAFETY for convenience
export const DELTA_SAFETY = AB_TEST_CONFIG.DELTA_SAFETY;

