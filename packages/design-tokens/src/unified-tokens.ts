/**
 * Unified Design System Tokens
 *
 * Single source of truth for all design tokens across the application.
 * This file consolidates colors, typography, spacing, shadows, and components
 * to ensure consistency across all surfaces.
 *
 * Design Principles:
 * 1. Consistency: Same tokens used everywhere
 * 2. Accessibility: WCAG AA compliant colors and focus states
 * 3. Scalability: Semantic naming for easy maintenance
 * 4. Performance: Optimized for minimal repaints
 */

// ============================================
// COLOR SYSTEM
// ============================================

/**
 * Base Colors
 * Core color palette with semantic variations
 */
export const baseColors = {
  // Brand Teal (Primary)
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488', // Primary brand color
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
    950: '#042F2E',
  },

  // Brand Navy (Secondary)
  navy: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // Secondary brand color
    900: '#0F172A',
    950: '#020617',
  },

  // Brand Emerald (Accent)
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Accent brand color
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },

  // Semantic Colors
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral Gray
  gray: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },
} as const;

/**
 * Semantic Colors
 * Purpose-driven color mappings
 */
export const semanticColors = {
  // Primary Actions
  primary: {
    DEFAULT: baseColors.teal[600],
    hover: baseColors.teal[700],
    active: baseColors.teal[800],
    disabled: `${baseColors.teal[600]}33`, // 20% opacity
    subtle: baseColors.teal[50],
    subtleHover: baseColors.teal[100],
  },

  // Secondary Actions
  secondary: {
    DEFAULT: baseColors.navy[800],
    hover: baseColors.navy[900],
    active: baseColors.navy[950],
    disabled: `${baseColors.navy[800]}33`,
    subtle: baseColors.navy[50],
    subtleHover: baseColors.navy[100],
  },

  // Accent/Premium
  accent: {
    DEFAULT: baseColors.emerald[500],
    hover: baseColors.emerald[600],
    active: baseColors.emerald[700],
    disabled: `${baseColors.emerald[500]}33`,
    subtle: baseColors.emerald[50],
    subtleHover: baseColors.emerald[100],
  },

  // Status Colors
  success: {
    DEFAULT: baseColors.emerald[500],
    hover: baseColors.emerald[600],
    text: baseColors.emerald[700],
    background: baseColors.emerald[50],
    border: baseColors.emerald[200],
  },

  error: {
    DEFAULT: baseColors.red[500],
    hover: baseColors.red[600],
    text: baseColors.red[700],
    background: baseColors.red[50],
    border: baseColors.red[200],
  },

  warning: {
    DEFAULT: baseColors.amber[500],
    hover: baseColors.amber[600],
    text: baseColors.amber[700],
    background: baseColors.amber[50],
    border: baseColors.amber[200],
  },

  info: {
    DEFAULT: baseColors.blue[500],
    hover: baseColors.blue[600],
    text: baseColors.blue[700],
    background: baseColors.blue[50],
    border: baseColors.blue[200],
  },

  // Text Colors
  text: {
    primary: baseColors.navy[900],
    secondary: baseColors.navy[600],
    tertiary: baseColors.navy[500],
    disabled: baseColors.navy[400],
    inverse: '#FFFFFF',
    inverseSecondary: 'rgba(255, 255, 255, 0.7)',
    link: baseColors.teal[600],
    linkHover: baseColors.teal[700],
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: baseColors.gray[50],
    tertiary: baseColors.gray[100],
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    dark: baseColors.navy[900],
  },

  // Border Colors
  border: {
    DEFAULT: baseColors.gray[200],
    light: baseColors.gray[100],
    medium: baseColors.gray[300],
    dark: baseColors.gray[400],
    focus: baseColors.teal[600],
    error: baseColors.red[500],
  },
} as const;

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
  },

  // Font Sizes with Line Heights
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },

  // Text Styles (Composed)
  textStyles: {
    // Headings
    h1: {
      fontSize: '3rem',
      lineHeight: '1',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2.25rem',
      lineHeight: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.875rem',
      lineHeight: '2.25rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem',
      lineHeight: '2rem',
      fontWeight: 600,
      letterSpacing: '0',
    },
    h5: {
      fontSize: '1.25rem',
      lineHeight: '1.75rem',
      fontWeight: 600,
      letterSpacing: '0',
    },
    h6: {
      fontSize: '1.125rem',
      lineHeight: '1.75rem',
      fontWeight: 600,
      letterSpacing: '0',
    },

    // Body Text
    body: {
      fontSize: '1rem',
      lineHeight: '1.5rem',
      fontWeight: 400,
    },
    bodySmall: {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      fontWeight: 400,
    },

    // UI Text
    label: {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      fontWeight: 500,
      letterSpacing: '0.025em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: '1rem',
      fontWeight: 400,
      letterSpacing: '0.025em',
    },
    button: {
      fontSize: '1rem',
      lineHeight: '1.5rem',
      fontWeight: 600,
      letterSpacing: '0.025em',
    },
  },
} as const;

// ============================================
// SPACING SYSTEM
// ============================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem',       // 384px
} as const;

// ============================================
// BORDER RADIUS SYSTEM
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
} as const;

// ============================================
// SHADOW SYSTEM
// ============================================

export const shadows = {
  // Elevation Shadows
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Card Shadows (Consistent for all surfaces)
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  cardActive: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  // Inner Shadow
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Focus Glow
  focus: `0 0 0 3px ${baseColors.teal[600]}33`,
  focusError: `0 0 0 3px ${baseColors.red[500]}33`,

  // Button Shadows
  button: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  buttonHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  // Status Glows
  successGlow: `0 0 0 3px ${baseColors.emerald[500]}33`,
  errorGlow: `0 0 0 3px ${baseColors.red[500]}33`,
  warningGlow: `0 0 0 3px ${baseColors.amber[500]}33`,
  infoGlow: `0 0 0 3px ${baseColors.blue[500]}33`,

  none: 'none',
} as const;

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  // Brand Gradients
  primary: `linear-gradient(135deg, ${baseColors.teal[600]} 0%, ${baseColors.teal[700]} 100%)`,
  secondary: `linear-gradient(135deg, ${baseColors.navy[800]} 0%, ${baseColors.navy[900]} 100%)`,
  accent: `linear-gradient(135deg, ${baseColors.emerald[500]} 0%, ${baseColors.emerald[600]} 100%)`,

  // Hero Gradients
  hero: `linear-gradient(135deg, ${baseColors.teal[600]} 0%, ${baseColors.emerald[500]} 100%)`,
  heroSubtle: `linear-gradient(180deg, ${baseColors.teal[50]} 0%, rgba(255, 255, 255, 0) 100%)`,

  // Card Gradients
  cardHover: `linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)`,

  // Background Gradients
  backgroundSubtle: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
  backgroundDark: `linear-gradient(135deg, ${baseColors.navy[900]} 0%, ${baseColors.navy[950]} 100%)`,

  // Status Gradients
  success: `linear-gradient(135deg, ${baseColors.emerald[500]} 0%, ${baseColors.emerald[600]} 100%)`,
  error: `linear-gradient(135deg, ${baseColors.red[500]} 0%, ${baseColors.red[600]} 100%)`,
  warning: `linear-gradient(135deg, ${baseColors.amber[500]} 0%, ${baseColors.amber[600]} 100%)`,
  info: `linear-gradient(135deg, ${baseColors.blue[500]} 0%, ${baseColors.blue[600]} 100%)`,
} as const;

// ============================================
// ANIMATION & TRANSITIONS
// ============================================

export const transitions = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  // Easing Functions
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  },

  // Common Transitions
  all: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors: 'background-color, border-color, color, fill, stroke 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  shadow: 'box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================
// Z-INDEX SYSTEM
// ============================================

export const zIndex = {
  hide: -1,
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

// ============================================
// COMPONENT TOKENS
// ============================================

export const components = {
  // Button Styles
  button: {
    primary: {
      background: semanticColors.primary.DEFAULT,
      backgroundHover: semanticColors.primary.hover,
      backgroundActive: semanticColors.primary.active,
      text: '#FFFFFF',
      border: 'transparent',
      shadow: shadows.button,
      shadowHover: shadows.buttonHover,
      radius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.textStyles.button.fontSize,
      fontWeight: typography.textStyles.button.fontWeight,
      transition: transitions.all,
    },
    secondary: {
      background: 'transparent',
      backgroundHover: semanticColors.primary.subtle,
      backgroundActive: semanticColors.primary.subtleHover,
      text: semanticColors.primary.DEFAULT,
      border: semanticColors.border.DEFAULT,
      shadow: 'none',
      shadowHover: shadows.xs,
      radius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.textStyles.button.fontSize,
      fontWeight: typography.textStyles.button.fontWeight,
      transition: transitions.all,
    },
    ghost: {
      background: 'transparent',
      backgroundHover: semanticColors.primary.subtle,
      backgroundActive: semanticColors.primary.subtleHover,
      text: semanticColors.text.primary,
      border: 'transparent',
      shadow: 'none',
      shadowHover: 'none',
      radius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.textStyles.button.fontSize,
      fontWeight: typography.textStyles.button.fontWeight,
      transition: transitions.all,
    },
    danger: {
      background: semanticColors.error.DEFAULT,
      backgroundHover: semanticColors.error.hover,
      backgroundActive: baseColors.red[700],
      text: '#FFFFFF',
      border: 'transparent',
      shadow: shadows.button,
      shadowHover: shadows.buttonHover,
      radius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.textStyles.button.fontSize,
      fontWeight: typography.textStyles.button.fontWeight,
      transition: transitions.all,
    },
  },

  // Badge Styles
  badge: {
    default: {
      background: semanticColors.background.tertiary,
      text: semanticColors.text.primary,
      border: semanticColors.border.DEFAULT,
      radius: borderRadius.full,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs[0],
      fontWeight: typography.fontWeight.medium,
    },
    success: {
      background: semanticColors.success.background,
      text: semanticColors.success.text,
      border: semanticColors.success.border,
      radius: borderRadius.full,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs[0],
      fontWeight: typography.fontWeight.medium,
    },
    error: {
      background: semanticColors.error.background,
      text: semanticColors.error.text,
      border: semanticColors.error.border,
      radius: borderRadius.full,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs[0],
      fontWeight: typography.fontWeight.medium,
    },
    warning: {
      background: semanticColors.warning.background,
      text: semanticColors.warning.text,
      border: semanticColors.warning.border,
      radius: borderRadius.full,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs[0],
      fontWeight: typography.fontWeight.medium,
    },
    info: {
      background: semanticColors.info.background,
      text: semanticColors.info.text,
      border: semanticColors.info.border,
      radius: borderRadius.full,
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs[0],
      fontWeight: typography.fontWeight.medium,
    },
  },

  // Card Styles
  card: {
    default: {
      background: semanticColors.background.primary,
      border: semanticColors.border.DEFAULT,
      shadow: shadows.card,
      shadowHover: shadows.cardHover,
      radius: borderRadius.xl,
      padding: spacing[6],
      transition: transitions.all,
    },
    elevated: {
      background: semanticColors.background.elevated,
      border: 'transparent',
      shadow: shadows.lg,
      shadowHover: shadows.xl,
      radius: borderRadius.xl,
      padding: spacing[6],
      transition: transitions.all,
    },
    interactive: {
      background: semanticColors.background.primary,
      border: semanticColors.border.DEFAULT,
      shadow: shadows.card,
      shadowHover: shadows.cardHover,
      shadowActive: shadows.cardActive,
      radius: borderRadius.xl,
      padding: spacing[6],
      transition: transitions.all,
      cursor: 'pointer',
    },
  },

  // Input Styles
  input: {
    default: {
      background: semanticColors.background.primary,
      backgroundFocus: semanticColors.background.primary,
      text: semanticColors.text.primary,
      placeholder: semanticColors.text.tertiary,
      border: semanticColors.border.DEFAULT,
      borderFocus: semanticColors.border.focus,
      shadow: 'none',
      shadowFocus: shadows.focus,
      radius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: typography.fontSize.base[0],
      transition: transitions.all,
    },
    error: {
      background: semanticColors.background.primary,
      backgroundFocus: semanticColors.background.primary,
      text: semanticColors.text.primary,
      placeholder: semanticColors.text.tertiary,
      border: semanticColors.error.DEFAULT,
      borderFocus: semanticColors.error.DEFAULT,
      shadow: 'none',
      shadowFocus: shadows.focusError,
      radius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: typography.fontSize.base[0],
      transition: transitions.all,
    },
  },

  // Modal Styles
  modal: {
    overlay: {
      background: semanticColors.background.overlay,
      zIndex: zIndex.overlay,
    },
    content: {
      background: semanticColors.background.primary,
      border: semanticColors.border.DEFAULT,
      shadow: shadows['2xl'],
      radius: borderRadius['2xl'],
      padding: spacing[6],
      zIndex: zIndex.modal,
    },
    header: {
      fontSize: typography.textStyles.h4.fontSize,
      fontWeight: typography.textStyles.h4.fontWeight,
      color: semanticColors.text.primary,
      marginBottom: spacing[4],
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: spacing[3],
      marginTop: spacing[6],
    },
  },
} as const;

// ============================================
// EXPORT ALL TOKENS
// ============================================

export const unifiedTokens = {
  colors: {
    ...baseColors,
    ...semanticColors,
  },
  typography,
  spacing,
  borderRadius,
  shadows,
  gradients,
  transitions,
  zIndex,
  components,
} as const;

export type UnifiedTokens = typeof unifiedTokens;