/**
 * Border Radius Tokens
 * 
 * Border radius values for consistent rounded corners across the application.
 */

export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export type BorderRadius = typeof borderRadius;

