/**
 * Design Tokens - Main Export
 * 
 * Central export for all design tokens used across web and mobile platforms.
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './borderRadius';
export * from './gradients';
export * from './effects';

// Re-export types from their respective modules
export type { Colors } from './colors';
export type { Typography } from './typography';
export type { Spacing } from './spacing';
export type { Shadows } from './shadows';
export type { BorderRadius } from './borderRadius';
export type { Gradients } from './gradients';
export type { Effects } from './effects';

// Export platform adapters
export * from './adapters/mobile';
export * from './adapters/web';

// Combined design tokens object
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';
import { borderRadius } from './borderRadius';
import { gradients } from './gradients';
import { effects } from './effects';

export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  gradients,
  effects,
} as const;

export type DesignTokens = typeof designTokens;

