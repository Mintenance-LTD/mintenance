/**
 * Mobile Platform Adapter
 * 
 * Converts design tokens to React Native StyleSheet-compatible format.
 * Note: The normalize function should be called from the mobile app with
 * React Native's PixelRatio and Dimensions.
 */

import { colors } from '../colors';
import { typography } from '../typography';
import { spacing } from '../spacing';
import { shadows } from '../shadows';
import { borderRadius } from '../borderRadius';

// Normalize function factory - takes screen width and PixelRatio from React Native
export const createNormalize = (
  screenWidth: number,
  getFontScale: () => number,
  roundToNearestPixel: (size: number) => number,
  maxScale: number = 1.3
) => {
  const scale = screenWidth / 375; // Base width for iPhone 11
  
  return (size: number, customMaxScale?: number): number => {
    const newSize = size * scale;
    const fontScale = getFontScale();
    const scaledSize = newSize * Math.min(fontScale, customMaxScale ?? maxScale);
    return roundToNearestPixel(scaledSize);
  };
};

// Base mobile tokens (without normalized font sizes - normalization happens in app)
export const mobileTokens = {
  colors: {
    ...colors,
  },

  typography: {
    ...typography,
    // Raw font sizes - will be normalized in the mobile app
    rawFontSize: {
      xs: typography.fontSize.xs,
      sm: typography.fontSize.sm,
      base: typography.fontSize.base,
      md: typography.fontSize.md,
      lg: typography.fontSize.lg,
      xl: typography.fontSize.xl,
      '2xl': typography.fontSize['2xl'],
      '3xl': typography.fontSize['3xl'],
      '4xl': typography.fontSize['4xl'],
      '5xl': typography.fontSize['5xl'],
    },
  },

  spacing: {
    ...spacing,
  },

  shadows: shadows.mobile,

  borderRadius: {
    ...borderRadius,
  },

  // Utility function
  getColor: (colorPath: string) => {
    const keys = colorPath.split('.');
    let value: any = colors;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return typeof value === 'string' ? value : undefined;
  },
} as const;

export type MobileTokens = typeof mobileTokens;

