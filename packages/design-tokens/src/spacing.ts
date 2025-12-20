/**
 * Spacing Tokens
 * 
 * Spacing scale based on 4px base unit.
 * Used for margins, padding, and gaps throughout the application.
 */

export const spacing = {
  // Base scale (multiples of 4px)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,

  // Semantic aliases
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export type Spacing = typeof spacing;

