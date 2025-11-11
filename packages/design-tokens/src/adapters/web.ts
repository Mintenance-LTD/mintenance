/**
 * Web Platform Adapter
 * 
 * Converts design tokens to CSS/Tailwind-compatible format.
 */

import { colors } from '../colors';
import { typography } from '../typography';
import { spacing } from '../spacing';
import { shadows } from '../shadows';
import { borderRadius } from '../borderRadius';
import { gradients } from '../gradients';
import { effects } from '../effects';

export const webTokens = {
  colors: {
    ...colors,
  },

  typography: {
    ...typography,
    fontSize: {
      xs: `${typography.fontSize.xs}px`,
      sm: `${typography.fontSize.sm}px`,
      base: `${typography.fontSize.base}px`,
      md: `${typography.fontSize.md}px`,
      lg: `${typography.fontSize.lg}px`,
      xl: `${typography.fontSize.xl}px`,
      '2xl': `${typography.fontSize['2xl']}px`,
      '3xl': `${typography.fontSize['3xl']}px`,
      '4xl': `${typography.fontSize['4xl']}px`,
      '5xl': `${typography.fontSize['5xl']}px`,
    },
  },

  spacing: {
    ...Object.keys(spacing).reduce((acc, key) => {
      const value = spacing[key as keyof typeof spacing];
      acc[key] = typeof value === 'number' ? `${value}px` : value;
      return acc;
    }, {} as Record<string, string | number>),
  },

  shadows: shadows.web,

  borderRadius: {
    ...Object.keys(borderRadius).reduce((acc, key) => {
      const value = borderRadius[key as keyof typeof borderRadius];
      acc[key] = typeof value === 'number' ? `${value}px` : value;
      return acc;
    }, {} as Record<string, string | number>),
  },

  gradients: {
    ...gradients,
  },

  effects: {
    ...effects,
  },

  // Utility functions
  getColor: (colorPath: string): string => {
    const keys = colorPath.split('.');
    let value: unknown = colors;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return colors.textSecondary; // fallback
      }
    }
    return typeof value === 'string' ? value : colors.textSecondary;
  },

  // Tailwind config helper
  toTailwindConfig: () => ({
    colors: {
      ...colors,
      // Flatten nested colors if needed
    },
    fontSize: webTokens.typography.fontSize,
    spacing: webTokens.spacing,
    borderRadius: webTokens.borderRadius,
    boxShadow: webTokens.shadows,
  }),
} as const;

export type WebTokens = typeof webTokens;

