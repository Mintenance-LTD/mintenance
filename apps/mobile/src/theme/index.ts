// Centralized Theme System for Mintenance Mobile App
// Uses shared design tokens while preserving mobile-specific functionality
import { PixelRatio, Dimensions } from 'react-native';
import { mobileTokens, createNormalize } from '@mintenance/design-tokens';

// Dynamic text scaling utilities
const { width: screenWidth } = Dimensions.get('window');

// Create normalize function using design tokens adapter
const normalize = createNormalize(
  screenWidth,
  () => PixelRatio.getFontScale(),
  (size: number) => PixelRatio.roundToNearestPixel(size),
  1.3
);

// Text scaling hook for dynamic accessibility
export const useAccessibleFontSize = (
  baseFontSize: number,
  maxScale: number = 1.3
) => {
  return normalize(baseFontSize, maxScale);
};

type BorderRadiusMap = {
  none: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  full: number;
  [key: string]: number; // allow additional aliases like 'md' without changing visuals
};

// Use design tokens as base, add mobile-specific features
const tokens = mobileTokens;

// ── Dark mode reactivity ──
// Colors defined as getter-backed properties so that ANY code reading
// theme.colors.X at render time gets the correct light/dark value.
// The dark mode flag lives in a separate file (darkModeState.ts) to
// avoid circular imports between theme/index.ts ↔ design-system/theme.tsx.
// NOTE: StyleSheet.create at module scope freezes values at import time,
// so screens should apply theme.colors.background as an inline style override
// on their root container.
import { isDarkMode } from './darkModeState';
export { setDarkModeEnabled } from './darkModeState';

// Light palette (default)
const lightColors = {
  ...tokens.colors,
  primary: '#0D9488',
  primaryLight: '#CCFBF1',
  primaryDark: '#0F766E',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  ratingGold: '#F59E0B',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  placeholder: '#94A3B8',
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255, 255, 255, 0.80)',
  overlayWhite10: 'rgba(255, 255, 255, 0.10)',
  overlayWhite15: 'rgba(255, 255, 255, 0.15)',
  overlayWhite20: 'rgba(255, 255, 255, 0.20)',
  overlayDark30: 'rgba(0, 0, 0, 0.3)',
  overlayDark50: 'rgba(0, 0, 0, 0.5)',
} as const;

// Build reactive colors: each property is a getter reading the current _isDark flag.
// At render time (inline styles, JSX), the getter fires and returns the right value.
const reactiveColors: Record<string, string> = {};
for (const key of Object.keys(lightColors)) {
  Object.defineProperty(reactiveColors, key, {
    get() {
      // darkColors is defined further below — reference is safe because
      // the getter is only called at runtime, not at module-init time.
      return isDarkMode() ? _darkColorsRef[key] : (lightColors as Record<string, string>)[key];
    },
    enumerable: true,
    configurable: true,
  });
}

export const theme = {
  // Colors: getter-backed so runtime reads pick up dark/light mode
  colors: reactiveColors as typeof lightColors,

  // Typography from design tokens with mobile normalization
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    // Font Sizes (normalized from design tokens)
    fontSize: {
      xs: normalize(tokens.typography.rawFontSize.xs),
      sm: normalize(tokens.typography.rawFontSize.sm),
      base: normalize(tokens.typography.rawFontSize.base),
      md: normalize(tokens.typography.rawFontSize.md),
      lg: normalize(tokens.typography.rawFontSize.lg),
      xl: normalize(tokens.typography.rawFontSize.xl),
      '2xl': normalize(tokens.typography.rawFontSize['2xl']),
      '3xl': normalize(tokens.typography.rawFontSize['3xl']),
      '4xl': normalize(tokens.typography.rawFontSize['4xl']),
      '5xl': normalize(tokens.typography.rawFontSize['5xl']),
    },
    // Raw font sizes from design tokens
    rawFontSize: {
      ...tokens.typography.rawFontSize,
    },
    // Accessibility font sizes (larger scaling)
    accessibleFontSize: {
      xs: normalize(tokens.typography.rawFontSize.xs, 1.5),
      sm: normalize(tokens.typography.rawFontSize.sm, 1.5),
      base: normalize(tokens.typography.rawFontSize.base, 1.5),
      md: normalize(tokens.typography.rawFontSize.md, 1.5),
      lg: normalize(tokens.typography.rawFontSize.lg, 1.5),
      xl: normalize(tokens.typography.rawFontSize.xl, 1.5),
      '2xl': normalize(tokens.typography.rawFontSize['2xl'], 1.5),
      '3xl': normalize(tokens.typography.rawFontSize['3xl'], 1.5),
      '4xl': normalize(tokens.typography.rawFontSize['4xl'], 1.5),
      '5xl': normalize(tokens.typography.rawFontSize['5xl'], 1.5),
    },
    // Line Heights (mobile uses numbers, not strings)
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },
    // Brief-aligned size presets (non-normalized, direct px values)
    briefSizes: {
      body: 14,
      bodyLarge: 16,
      secondary: 18,
      title: 20,
      headline: 24,
      display: 32,
      hero: 48,
    },
  },

  // Spacing from design tokens
  spacing: {
    ...tokens.spacing,
  },

  // Border Radius from design tokens
  borderRadius: {
    ...tokens.borderRadius,
    xxl: 20, // Mobile-specific addition
  } as BorderRadiusMap,

  // Shadows (Airbnb-inspired: subtler, wider spread)
  shadows: {
    ...tokens.shadows,
    // Override with softer Airbnb-style shadows
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    base: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 6,
    },
  },

  // Component Variants (web-aligned)
  components: {
    button: {
      primary: {
        backgroundColor: '#0D9488',
        color: '#FFFFFF',
        borderColor: '#0D9488',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: '#CBD5E1',
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: '#64748B',
        borderColor: 'transparent',
      },
      success: {
        backgroundColor: '#10B981',
        color: '#FFFFFF',
        borderColor: '#10B981',
      },
      danger: {
        backgroundColor: tokens.colors.error,
        color: '#FFFFFF',
        borderColor: tokens.colors.error,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: 'transparent',
      },
    },
    card: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 0,
        borderRadius: 12,
      },
      elevated: {
        backgroundColor: '#FFFFFF',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 12,
      },
    },
    input: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        color: '#0F172A',
        placeholderTextColor: '#94A3B8',
      },
      outline: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        color: '#0F172A',
        placeholderTextColor: '#94A3B8',
      },
      filled: {
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        color: '#0F172A',
        placeholderTextColor: '#94A3B8',
      },
      focused: {
        borderColor: '#0D9488',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOpacity: 0.05,
      },
      error: {
        borderColor: tokens.colors.errorDark,
        backgroundColor: '#FEF2F2',
        color: tokens.colors.errorDark,
      },
    },
  },

  // Layout Constants (Airbnb-inspired: more generous spacing)
  layout: {
    screenPadding: 24,           // was 16 - more breathing room
    cardPadding: 20,             // was 16
    sectionSpacing: 32,          // was 24 - generous section gaps
    cardGap: 16,                 // consistent gap between cards
    listItemGap: 12,             // gap between list items
    buttonHeight: 48,            // was 44 - taller buttons
    buttonHeightLarge: 52,       // was 48
    inputHeight: 48,             // was 44 - taller inputs
    inputHeightLarge: 52,        // was 48
    headerHeight: 60,            // was 56
    tabBarHeight: {
      ios: 83,
      android: 60,               // was 56
    },
    minTouchTarget: 44,
    breakpoints: {
      sm: 375,
      md: 768,
      lg: 1024,
    },
  },

  // Animation Timings & Micro-interactions (mobile-specific)
  animation: {
    duration: {
      instant: 100,
      fast: 150,
      normal: 300,
      slow: 500,
      slower: 750,
    },
    easing: {
      linear: 'linear' as const,
      ease: 'ease' as const,
      easeIn: 'ease-in' as const,
      easeOut: 'ease-out' as const,
      easeInOut: 'ease-in-out' as const,
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as const,
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' as const,
    },
    buttonPress: {
      scale: 0.96,
      duration: 100,
    },
    cardHover: {
      scale: 1.02,
      duration: 200,
    },
    iconBounce: {
      scale: 1.2,
      duration: 150,
    },
    slideIn: {
      translateX: 50,
      duration: 300,
    },
    fadeIn: {
      opacity: [0, 1],
      duration: 300,
    },
    pulse: {
      scale: [1, 1.05, 1],
      duration: 1000,
    },
  },
};

// Theme Type for TypeScript
export type Theme = typeof theme;

// Utility functions (using design tokens)
export const getColor = tokens.getColor;

export const getSpacing = (size: keyof typeof tokens.spacing) => {
  return tokens.spacing[size];
};

export const getFontSize = (size: keyof typeof theme.typography.fontSize) => {
  return theme.typography.fontSize[size];
};

export const getAccessibleFontSize = (
  size: keyof typeof theme.typography.rawFontSize,
  maxScale: number = 1.3
) => {
  return normalize(theme.typography.rawFontSize[size], maxScale);
};

export const scaledFontSize = (
  size: number,
  maxScale: number = 1.3
): number => {
  return normalize(size, maxScale);
};

export const getShadow = (size: keyof typeof theme.shadows) => {
  return theme.shadows[size];
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'posted':
      return tokens.colors.statusPosted;
    case 'assigned':
      return tokens.colors.statusAssigned;
    case 'in_progress':
      return tokens.colors.statusInProgress;
    case 'completed':
      return tokens.colors.statusCompleted;
    case 'cancelled':
      return tokens.colors.statusCancelled;
    default:
      return tokens.colors.textSecondary;
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return tokens.colors.priorityHigh;
    case 'medium':
      return tokens.colors.priorityMedium;
    case 'low':
      return tokens.colors.priorityLow;
    default:
      return tokens.colors.textSecondary;
  }
};

export const getCategoryColor = (category: string) => {
  const categoryKey = category
    .toLowerCase()
    .replace(/\s+/g, '') as keyof typeof tokens.colors;
  return (tokens.colors as Record<string, string>)[categoryKey] || tokens.colors.textSecondary;
};

// Dark mode color overrides — consumed by the reactive getters above
const _darkColorsRef: Record<string, string> = {
  ...lightColors,
  primary: '#14B8A6',
  primaryLight: '#065F46',
  primaryDark: '#2DD4BF',
  accent: '#FBBF24',
  accentLight: '#3A2A0A',
  ratingGold: '#FBBF24',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',
  surface: '#1E293B',
  surfaceSecondary: '#1E293B',
  border: '#334155',
  borderLight: '#1E293B',
  placeholder: '#64748B',
  textInverse: '#0F172A',
  textInverseMuted: 'rgba(15, 23, 42, 0.78)',
  overlayWhite10: 'rgba(255, 255, 255, 0.10)',
  overlayWhite15: 'rgba(255, 255, 255, 0.15)',
  overlayWhite20: 'rgba(255, 255, 255, 0.20)',
  overlayDark30: 'rgba(0, 0, 0, 0.5)',
  overlayDark50: 'rgba(0, 0, 0, 0.7)',
};

// Keep backward-compat alias used by getTheme()
const darkColors = _darkColorsRef as typeof theme.colors;

const darkShadows: typeof theme.shadows = {
  ...theme.shadows,
  sm: { ...theme.shadows.sm, shadowOpacity: 0.2 },
  base: { ...theme.shadows.base, shadowOpacity: 0.25 },
  md: { ...theme.shadows.md, shadowOpacity: 0.3 },
  large: { ...theme.shadows.large, shadowOpacity: 0.35 },
  xl: { ...theme.shadows.xl, shadowOpacity: 0.4 },
};

const darkComponents: typeof theme.components = {
  button: {
    ...theme.components.button,
    secondary: { backgroundColor: 'transparent', color: '#F1F5F9', borderColor: '#475569' },
    ghost: { backgroundColor: 'transparent', color: '#F1F5F9', borderColor: 'transparent' },
  },
  card: {
    default: { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 0, borderRadius: 12 },
    elevated: { backgroundColor: '#1E293B', borderColor: 'transparent', borderWidth: 0 },
    outlined: { backgroundColor: 'transparent', borderColor: '#334155', borderWidth: 1, borderRadius: 12 },
  },
  input: {
    default: { backgroundColor: '#1E293B', borderColor: '#475569', color: '#F1F5F9', placeholderTextColor: '#64748B' },
    outline: { backgroundColor: '#1E293B', borderColor: '#475569', color: '#F1F5F9', placeholderTextColor: '#64748B' },
    filled: { backgroundColor: '#334155', borderColor: '#475569', color: '#F1F5F9', placeholderTextColor: '#64748B' },
    focused: { borderColor: '#2DD4BF', backgroundColor: '#1E293B', shadowColor: '#000000', shadowOpacity: 0.1 },
    error: { borderColor: tokens.colors.errorDark, backgroundColor: '#3A1A1A', color: tokens.colors.errorDark },
  },
};

/** Returns the full theme for the given color scheme */
export const getTheme = (isDark: boolean): Theme => {
  if (!isDark) return theme;
  return {
    ...theme,
    colors: darkColors,
    shadows: darkShadows,
    components: darkComponents,
  };
};

/**
 * Hook that returns the app theme reactive to dark/light mode.
 * Uses design-system ThemeProvider context when available,
 * falls back to the static light theme.
 */
export { useTheme } from '../design-system/theme';

export default theme;
