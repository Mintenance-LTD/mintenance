// ============================================================================
// DESIGN TOKENS SYSTEM
// Mintenance App - Comprehensive Design Foundation
// ============================================================================

import { PixelRatio, Dimensions } from 'react-native';

// ============================================================================
// BASE MEASUREMENTS & SCALING
// ============================================================================

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width for iPhone 11

// Normalize with accessibility scaling limits
const normalize = (size: number, maxScale: number = 1.3): number => {
  const newSize = size * scale;
  const fontScale = PixelRatio.getFontScale();
  const scaledSize = newSize * Math.min(fontScale, maxScale);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Main primary
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },

  // Secondary Brand Colors (Emerald)
  secondary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Main secondary
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },

  // Neutral Colors
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
  },
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,

  // Semantic aliases
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'System',
    mono: 'Menlo',
  },

  // Font sizes with responsive scaling
  fontSize: {
    xs: normalize(12),
    sm: normalize(14),
    base: normalize(16),
    lg: normalize(18),
    xl: normalize(20),
    '2xl': normalize(24),
    '3xl': normalize(30),
    '4xl': normalize(36),
    '5xl': normalize(48),
    '6xl': normalize(60),
    '7xl': normalize(72),
    '8xl': normalize(96),
    '9xl': normalize(128),
  },

  // Font weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.05,
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
} as const;

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================

export const borderRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
  '2xl': {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
} as const;

// ============================================================================
// OPACITY SYSTEM
// ============================================================================

export const opacity = {
  0: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  75: 0.75,
  80: 0.8,
  90: 0.9,
  95: 0.95,
  100: 1,
} as const;

// ============================================================================
// Z-INDEX SYSTEM
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ============================================================================
// BREAKPOINTS SYSTEM
// ============================================================================

export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 992,
  xl: 1280,
  '2xl': 1536,
} as const;

// ============================================================================
// ANIMATION SYSTEM
// ============================================================================

export const animation = {
  // Duration
  duration: {
    fastest: 150,
    faster: 200,
    fast: 250,
    normal: 300,
    slow: 500,
    slower: 700,
    slowest: 1000,
  },

  // Timing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// ============================================================================
// SEMANTIC TOKEN MAPPINGS
// ============================================================================

export const semanticColors = {
  // Background colors
  background: {
    primary: colors.neutral[0],
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    overlay: `rgba(0, 0, 0, ${opacity[50]})`,
  },

  // Text colors
  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[500],
    quaternary: colors.neutral[400],
    inverse: colors.neutral[0],
    disabled: colors.neutral[300],

    // Semantic text colors
    success: colors.success[600],
    error: colors.error[600],
    warning: colors.warning[600],
    info: colors.info[600],
  },

  // Border colors
  border: {
    primary: colors.neutral[200],
    secondary: colors.neutral[300],
    focus: colors.primary[500],
    error: colors.error[500],
    success: colors.success[500],
  },

  // Interactive colors
  interactive: {
    primary: colors.primary[500],
    primaryHover: colors.primary[600],
    primaryPressed: colors.primary[700],
    primaryDisabled: colors.neutral[200],

    secondary: colors.secondary[500],
    secondaryHover: colors.secondary[600],
    secondaryPressed: colors.secondary[700],
    secondaryDisabled: colors.neutral[200],
  },
} as const;

// ============================================================================
// COMPONENT SIZES
// ============================================================================

export const componentSizes = {
  // Button sizes
  button: {
    sm: {
      height: 32,
      paddingHorizontal: spacing[3],
      fontSize: typography.fontSize.sm,
    },
    md: {
      height: 40,
      paddingHorizontal: spacing[4],
      fontSize: typography.fontSize.base,
    },
    lg: {
      height: 48,
      paddingHorizontal: spacing[6],
      fontSize: typography.fontSize.lg,
    },
    xl: {
      height: 56,
      paddingHorizontal: spacing[8],
      fontSize: typography.fontSize.xl,
    },
  },

  // Input sizes
  input: {
    sm: {
      height: 32,
      paddingHorizontal: spacing[3],
      fontSize: typography.fontSize.sm,
    },
    md: {
      height: 40,
      paddingHorizontal: spacing[4],
      fontSize: typography.fontSize.base,
    },
    lg: {
      height: 48,
      paddingHorizontal: spacing[4],
      fontSize: typography.fontSize.lg,
    },
  },

  // Icon sizes
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
  },

  // Avatar sizes
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
  },
} as const;

// ============================================================================
// ACCESSIBILITY STANDARDS
// ============================================================================

export const accessibility = {
  // Minimum touch target sizes (WCAG AA)
  minTouchTarget: {
    width: 44,
    height: 44,
  },

  // Color contrast ratios
  colorContrast: {
    aa: 4.5,
    aaa: 7,
  },

  // Focus ring
  focusRing: {
    width: 2,
    color: colors.primary[500],
    offset: 2,
  },
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export const designTokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  opacity,
  zIndex,
  breakpoints,
  animation,
  semanticColors,
  componentSizes,
  accessibility,

  // Utility functions
  normalize,
  screenWidth,
  screenHeight,
} as const;

export default designTokens;