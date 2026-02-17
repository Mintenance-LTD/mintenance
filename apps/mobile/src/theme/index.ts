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

export const theme = {
  // Colors from design tokens with Airbnb-inspired warm overrides
  colors: {
    ...tokens.colors,

    // ── Airbnb-style palette (design brief V2) ──
    // Brand: Emerald green (matching web app #10B981)
    primary: '#10B981',
    primaryLight: '#D1FAE5',
    primaryDark: '#059669',

    // Accent: Coral for urgency & important pricing
    accent: '#FF6B6B',
    accentLight: '#FFE6E6',

    // Rating gold for star ratings
    ratingGold: '#FFD700',

    // Text: high-contrast neutral hierarchy
    textPrimary: '#222222',
    textSecondary: '#717171',
    textTertiary: '#9A9A9A',

    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F7F7F7',
    backgroundTertiary: '#EFEFEF',

    // Surfaces
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F8F8',

    // Borders
    border: '#EBEBEB',
    borderLight: '#F0F0F0',

    // Placeholder
    placeholder: '#B0B0B0',

    // Text inverse (for dark backgrounds)
    textInverse: '#FFFFFF',
    textInverseMuted: 'rgba(255, 255, 255, 0.78)',

    // Overlay helpers
    overlayWhite10: 'rgba(255, 255, 255, 0.10)',
    overlayWhite15: 'rgba(255, 255, 255, 0.15)',
    overlayWhite20: 'rgba(255, 255, 255, 0.20)',
    overlayDark30: 'rgba(0, 0, 0, 0.3)',
    overlayDark50: 'rgba(0, 0, 0, 0.5)',
  },

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

  // Component Variants (Airbnb-inspired)
  components: {
    button: {
      primary: {
        backgroundColor: '#10B981',
        color: '#FFFFFF',
        borderColor: '#10B981',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#000000',
        borderColor: '#D0D0D0',
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: '#808080',
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
        color: '#000000',
        borderColor: 'transparent',
      },
    },
    card: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D0D0D0',
        borderWidth: 0,
        borderRadius: 16,
      },
      elevated: {
        backgroundColor: '#FFFFFF',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#D0D0D0',
        borderWidth: 1,
        borderRadius: 16,
      },
    },
    input: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D0D0D0',
        color: '#000000',
        placeholderTextColor: '#D0D0D0',
      },
      outline: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D0D0D0',
        color: '#000000',
        placeholderTextColor: '#D0D0D0',
      },
      filled: {
        backgroundColor: '#F8F8F8',
        borderColor: '#D0D0D0',
        color: '#000000',
        placeholderTextColor: '#D0D0D0',
      },
      focused: {
        borderColor: '#000000',
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

export default theme;
