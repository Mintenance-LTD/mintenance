/**
 * MINTENANCE DESIGN TOKENS
 * Professional design system inspired by Birch & Revealbot
 *
 * This file is a barrel re-exporting all design values from the
 * ./design-tokens-parts/ sub-modules. The original monolithic
 * definition was split for maintainability (<500 lines/file).
 *
 * Consumers can continue importing from '@/lib/design-tokens'.
 *
 * Brand Identity:
 * - Primary: Navy Blue (#1E293B) - Professional, trustworthy
 * - Secondary: Mint Green (#14B8A6) - Fresh, modern
 * - Accent: Yellow/Gold (#F59E0B) - Energy, attention
 *
 * All color combinations are WCAG AA compliant
 */

export { colors } from './design-tokens-parts/colors';
export { typography } from './design-tokens-parts/typography';
export { spacing, borderRadius } from './design-tokens-parts/spacing';
export { shadows } from './design-tokens-parts/shadows';
export { components } from './design-tokens-parts/components';

import { colors } from './design-tokens-parts/colors';
import { typography } from './design-tokens-parts/typography';
import {
  spacing,
  borderRadius,
  zIndex,
  breakpoints,
  mediaQueries,
  containers,
} from './design-tokens-parts/spacing';
import { shadows, gradients } from './design-tokens-parts/shadows';
import { transitions } from './design-tokens-parts/animations';
import { components } from './design-tokens-parts/components';

// Default export with all tokens
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  gradients,
  transitions,
  zIndex,
  breakpoints,
  mediaQueries,
  containers,
  components,
} as const;

export default designTokens;
