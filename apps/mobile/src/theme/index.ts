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
  // Colors from design tokens (exact same values)
  colors: {
    ...tokens.colors,
    // Mobile-specific overlay helpers
    overlayWhite10: 'rgba(255, 255, 255, 0.10)',
    overlayWhite15: 'rgba(255, 255, 255, 0.15)',
    overlayWhite20: 'rgba(255, 255, 255, 0.20)',
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
      normal: 1.4, // Mobile uses 1.4 instead of 1.5 for better readability
      relaxed: 1.6,
      loose: 1.8,
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

  // Shadows from design tokens (React Native format)
  shadows: {
    ...tokens.shadows,
  },

  // Component Variants (using design tokens)
  components: {
    button: {
      primary: {
        backgroundColor: tokens.colors.primary,
        color: tokens.colors.white,
        borderColor: tokens.colors.primary,
      },
      secondary: {
        backgroundColor: 'transparent',
        color: tokens.colors.primary,
        borderColor: tokens.colors.primary,
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: tokens.colors.info,
        borderColor: 'transparent',
      },
      success: {
        backgroundColor: tokens.colors.secondary,
        color: tokens.colors.white,
        borderColor: tokens.colors.secondary,
      },
      danger: {
        backgroundColor: tokens.colors.error,
        color: tokens.colors.white,
        borderColor: tokens.colors.error,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: tokens.colors.primary,
        borderColor: 'transparent',
      },
    },
    card: {
      default: {
        backgroundColor: tokens.colors.white,
        borderColor: tokens.colors.border,
        borderWidth: 1,
        borderRadius: tokens.borderRadius.xl,
      },
      elevated: {
        backgroundColor: tokens.colors.white,
        borderColor: 'transparent',
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: tokens.colors.border,
        borderWidth: 1,
        borderRadius: tokens.borderRadius.xl,
      },
    },
    input: {
      default: {
        backgroundColor: tokens.colors.white,
        borderColor: tokens.colors.border,
        color: tokens.colors.textPrimary,
        placeholderTextColor: tokens.colors.placeholder,
      },
      outline: {
        backgroundColor: tokens.colors.white,
        borderColor: tokens.colors.border,
        color: tokens.colors.textPrimary,
        placeholderTextColor: tokens.colors.placeholder,
      },
      filled: {
        backgroundColor: tokens.colors.backgroundSecondary,
        borderColor: tokens.colors.border,
        color: tokens.colors.textPrimary,
        placeholderTextColor: tokens.colors.placeholder,
      },
      focused: {
        borderColor: tokens.colors.primary,
        backgroundColor: tokens.colors.white,
        shadowColor: tokens.colors.primary,
        shadowOpacity: 0.1,
      },
      error: {
        borderColor: tokens.colors.errorDark,
        backgroundColor: '#FEF2F2',
        color: tokens.colors.errorDark,
      },
    },
  },

  // Layout Constants (mobile-specific)
  layout: {
    screenPadding: tokens.spacing[4],
    cardPadding: tokens.spacing[4],
    sectionSpacing: tokens.spacing[6],
    buttonHeight: 44,
    buttonHeightLarge: 48,
    inputHeight: 44,
    inputHeightLarge: 48,
    headerHeight: 56,
    tabBarHeight: {
      ios: 83,
      android: 56,
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
  return (tokens.colors as any)[categoryKey] || tokens.colors.textSecondary;
};

export default theme;
