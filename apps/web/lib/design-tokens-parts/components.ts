/**
 * MINTENANCE DESIGN TOKENS - Component tokens (button, card, input, badge)
 */

import { colors } from './colors';
import { shadows } from './shadows';
import { borderRadius, spacing } from './spacing';

export const components = {
  // Button variants
  button: {
    primary: {
      bg: colors.navy[800],
      bgHover: colors.navy[900],
      color: colors.white,
      shadow: shadows.sm,
      shadowHover: shadows.primary,
    },
    secondary: {
      bg: colors.mint[500],
      bgHover: colors.mint[600],
      color: colors.white,
      shadow: shadows.sm,
      shadowHover: shadows.secondary,
    },
    gold: {
      bg: colors.gold[500],
      bgHover: colors.gold[600],
      color: colors.white,
      shadow: shadows.gold,
    },
    ghost: {
      bg: 'transparent',
      bgHover: colors.gray[50],
      color: colors.text.secondary,
      border: colors.border.default,
    },
  },

  // Card styles
  card: {
    bg: colors.cardBg,
    border: colors.border.light,
    borderHover: colors.border.default,
    shadow: shadows.sm,
    shadowHover: shadows.md,
    radius: borderRadius.xl,
    padding: spacing[8],
  },

  // Input styles
  input: {
    bg: colors.white,
    border: colors.border.default,
    borderFocus: colors.border.focus,
    borderError: colors.error[500],
    color: colors.text.primary,
    placeholder: colors.text.disabled,
    radius: borderRadius.md,
    padding: `${spacing[3.5]} ${spacing[4]}`,
  },

  // Badge styles
  badge: {
    success: {
      bg: colors.success.light,
      color: colors.success.dark,
    },
    warning: {
      bg: colors.warning.light,
      color: colors.warning.dark,
    },
    error: {
      bg: colors.error.light,
      color: colors.error.dark,
    },
    info: {
      bg: colors.info.light,
      color: colors.info.dark,
    },
    neutral: {
      bg: colors.gray[100],
      color: colors.gray[700],
    },
  },
} as const;

type Components = typeof components;
