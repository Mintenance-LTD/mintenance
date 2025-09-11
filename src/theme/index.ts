// Centralized Theme System for Mintenance App
import { PixelRatio, Dimensions } from 'react-native';

// Dynamic text scaling utilities
const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width for iPhone 11

// Normalize font sizes with maximum scaling limits for accessibility
const normalize = (size: number, maxScale: number = 1.3): number => {
  const newSize = size * scale;
  const fontScale = PixelRatio.getFontScale();
  const scaledSize = newSize * Math.min(fontScale, maxScale);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

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

export const theme = {
  // Color Palette
  colors: {
    // Primary Brand Colors (Updated to darker blues)
    primary: '#0F172A', // Very dark blue/slate - navy blue
    primaryLight: '#1E293B', // Lighter but still dark blue
    primaryDark: '#020617', // Darkest blue for pressed states

    // Secondary Colors (Updated to vibrant mint green)
    secondary: '#10B981', // Vibrant emerald green - modern and fresh
    secondaryLight: '#34D399', // Lighter emerald for secondary elements
    secondaryDark: '#059669', // Darker emerald for pressed states

    // Accent Colors for variety
    accent: '#F59E0B', // Warm amber
    accentLight: '#FCD34D', // Light amber
    accentDark: '#D97706', // Dark amber

    // Success/Error States
    success: '#34C759',
    successLight: '#5DD579',
    successDark: '#248A3D',

    error: '#FF3B30',
    errorLight: '#FF6B61',
    errorDark: '#D70015',

    warning: '#FF9500',
    warningLight: '#FFB143',
    warningDark: '#CC7700',

    info: '#007AFF',
    infoLight: '#339FFF',
    infoDark: '#0051D5',

    // Neutral Colors
    background: '#FFFFFF', // Pure white background as specified
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#F1F5F9',

    // Common utility colors
    white: '#FFFFFF',
    black: '#000000',

    // Text Colors (WCAG AA Compliant)
    textPrimary: '#1F2937', // 4.5:1 contrast on white
    textSecondary: '#4B5563', // 4.5:1 contrast on white
    textTertiary: '#6B7280', // 4.5:1 contrast on white (was #8E8E93 - failed)
    textQuaternary: '#9CA3AF', // For less important text, still passes AA
    textInverse: '#FFFFFF',
    textInverseMuted: 'rgba(255, 255, 255, 0.8)',

    // Placeholder Text (WCAG Compliant)
    placeholder: '#6B7280', // Meets WCAG AA standard (4.5:1)

    // Border Colors (Enhanced contrast)
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderDark: '#D1D5DB',
    borderFocus: '#0F172A', // Very dark blue for focused states

    // Priority Colors (Enhanced)
    priorityHigh: '#EF4444', // Vibrant red
    priorityMedium: '#F59E0B', // Warm amber
    priorityLow: '#10B981', // Vibrant green
    priorityUrgent: '#DC2626', // Dark red

    // Status Colors
    statusPosted: '#007AFF',
    statusAssigned: '#FF9500',
    statusInProgress: '#FF9500',
    statusCompleted: '#34C759',
    statusCancelled: '#8E8E93',

    // Special purpose colors
    ratingGold: '#FFD700',

    // Overlay helpers
    overlayWhite10: 'rgba(255, 255, 255, 0.10)',
    overlayWhite15: 'rgba(255, 255, 255, 0.15)',
    overlayWhite20: 'rgba(255, 255, 255, 0.20)',

    // Category Colors (More vibrant)
    plumbing: '#3B82F6', // Bright blue
    electrical: '#F59E0B', // Warm amber
    hvac: '#10B981', // Vibrant green
    handyman: '#8B5CF6', // Purple
    cleaning: '#EF4444', // Vibrant red
    landscaping: '#10B981', // Vibrant green
    appliance: '#EC4899', // Pink
    painting: '#F97316', // Orange
  },

  // Typography
  typography: {
    // Font Families
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },

    // Font Weights
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },

    // Font Sizes (with dynamic scaling support)
    fontSize: {
      xs: normalize(10),
      sm: normalize(12),
      base: normalize(14),
      lg: normalize(16),
      xl: normalize(18),
      '2xl': normalize(20),
      '3xl': normalize(24),
      '4xl': normalize(32),
      '5xl': normalize(48),
    },

    // Raw font sizes for custom scaling
    rawFontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20,
      '3xl': 24,
      '4xl': 32,
      '5xl': 48,
    },

    // Accessibility font sizes (larger scaling)
    accessibleFontSize: {
      xs: normalize(10, 1.5),
      sm: normalize(12, 1.5),
      base: normalize(14, 1.5),
      lg: normalize(16, 1.5),
      xl: normalize(18, 1.5),
      '2xl': normalize(20, 1.5),
      '3xl': normalize(24, 1.5),
      '4xl': normalize(32, 1.5),
      '5xl': normalize(48, 1.5),
    },

    // Line Heights
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },
  },

  // Spacing System (4px base unit)
  spacing: {
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
    // Aliases for convenience
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
  },

  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    xxl: 20,
    full: 9999,
  } as BorderRadiusMap,

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 8.3,
      elevation: 12,
    },
  },

  // Component Variants
  components: {
    // Button Variants
    button: {
      primary: {
        backgroundColor: '#0F172A', // Very dark blue primary
        color: '#FFFFFF',
        borderColor: '#0F172A',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: '#0F172A',
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: '#007AFF',
        borderColor: 'transparent',
      },
      success: {
        backgroundColor: '#4ECDC4', // Mint green accent
        color: '#FFFFFF',
        borderColor: '#4ECDC4',
      },
      danger: {
        backgroundColor: '#FF3B30',
        color: '#FFFFFF',
        borderColor: '#FF3B30',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: 'transparent',
      },
    },

    // Card Variants (Rounded cards)
    card: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 16, // Rounded cards
      },
      elevated: {
        backgroundColor: '#FFFFFF',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 16,
      },
    },

    // Input Variants (WCAG Compliant)
    input: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        color: '#1F2937', // High contrast text
        placeholderTextColor: '#6B7280', // WCAG AA compliant placeholder
      },
      focused: {
        borderColor: '#0F172A', // Very dark blue focus
        backgroundColor: '#FFFFFF',
        shadowColor: '#0F172A',
        shadowOpacity: 0.1,
      },
      error: {
        borderColor: '#DC2626', // Higher contrast red
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
      },
    },
  },

  // Layout Constants
  layout: {
    // Screen Padding
    screenPadding: 16,
    cardPadding: 16,
    sectionSpacing: 24,

    // Common Dimensions (Platform-specific and accessible)
    buttonHeight: 44, // Minimum touch target
    buttonHeightLarge: 48, // Preferred touch target
    inputHeight: 44, // Minimum touch target
    inputHeightLarge: 48, // Preferred touch target
    headerHeight: 56,
    tabBarHeight: {
      ios: 83, // iOS specific (49px + 34px safe area)
      android: 56, // Android specific
    },
    minTouchTarget: 44, // WCAG minimum touch target

    // Breakpoints (for responsive design)
    breakpoints: {
      sm: 375,
      md: 768,
      lg: 1024,
    },
  },

  // Animation Timings & Micro-interactions
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
    // Micro-interaction configs
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

// Utility functions for theme usage
export const getColor = (colorPath: string) => {
  const keys = colorPath.split('.');
  let value: any = theme.colors;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
};

export const getSpacing = (size: keyof typeof theme.spacing) => {
  return theme.spacing[size];
};

export const getFontSize = (size: keyof typeof theme.typography.fontSize) => {
  return theme.typography.fontSize[size];
};

// Dynamic font size with accessibility scaling
export const getAccessibleFontSize = (
  size: keyof typeof theme.typography.rawFontSize,
  maxScale: number = 1.3
) => {
  return normalize(theme.typography.rawFontSize[size], maxScale);
};

// Responsive font scaling utility
export const scaledFontSize = (
  size: number,
  maxScale: number = 1.3
): number => {
  return normalize(size, maxScale);
};

export const getShadow = (size: keyof typeof theme.shadows) => {
  return theme.shadows[size];
};

// Status color helper
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'posted':
      return theme.colors.statusPosted;
    case 'assigned':
      return theme.colors.statusAssigned;
    case 'in_progress':
      return theme.colors.statusInProgress;
    case 'completed':
      return theme.colors.statusCompleted;
    case 'cancelled':
      return theme.colors.statusCancelled;
    default:
      return theme.colors.textSecondary;
  }
};

// Priority color helper
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return theme.colors.priorityHigh;
    case 'medium':
      return theme.colors.priorityMedium;
    case 'low':
      return theme.colors.priorityLow;
    default:
      return theme.colors.textSecondary;
  }
};

// Category color helper
export const getCategoryColor = (category: string) => {
  const categoryKey = category
    .toLowerCase()
    .replace(/\s+/g, '') as keyof typeof theme.colors;
  return (theme.colors as any)[categoryKey] || theme.colors.textSecondary;
};

export default theme;
