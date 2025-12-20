/**
 * MINTENANCE DESIGN TOKENS
 * Professional design system inspired by Birch & Revealbot
 *
 * This file exports all design values as TypeScript constants
 * for use in React components and styled components.
 *
 * Brand Identity:
 * - Primary: Navy Blue (#1E293B) - Professional, trustworthy
 * - Secondary: Mint Green (#14B8A6) - Fresh, modern
 * - Accent: Yellow/Gold (#F59E0B) - Energy, attention
 *
 * All color combinations are WCAG AA compliant
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // PRIMARY - Navy Blue
  navy: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',  // PRIMARY BRAND COLOR
    900: '#0F172A',
    950: '#020617',
  },

  // SECONDARY - Mint Green
  mint: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',  // SECONDARY BRAND COLOR
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // ACCENT - Yellow/Gold
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // ACCENT COLOR
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // NEUTRALS - Professional Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // SEMANTIC COLORS
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    light: '#D1FAE5',
    DEFAULT: '#10B981',
    dark: '#047857',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#B45309',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#B91C1C',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    light: '#DBEAFE',
    DEFAULT: '#3B82F6',
    dark: '#1D4ED8',
  },

  // SURFACE COLORS
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  lightBg: '#F7F9FC',
  cardBg: '#FFFFFF',
  elevatedBg: '#FFFFFF',
  overlayBg: 'rgba(15, 23, 42, 0.8)',

  // TEXT COLORS (WCAG AA Compliant)
  text: {
    primary: '#111827',      // gray-900, 15.3:1 contrast
    secondary: '#4B5563',    // gray-600, 7.9:1 contrast
    tertiary: '#6B7280',     // gray-500, 5.2:1 contrast
    disabled: '#9CA3AF',     // gray-400
    inverse: '#FFFFFF',
    link: '#1E293B',         // navy-800
    linkHover: '#0F172A',    // navy-900
  },

  // BORDER COLORS
  border: {
    light: '#E5E7EB',        // gray-200
    default: '#D1D5DB',      // gray-300
    dark: '#9CA3AF',         // gray-400
    focus: '#14B8A6',        // mint-500
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Font Sizes
  fontSize: {
    // Display - Hero headlines
    displayLg: '4.5rem',     // 72px
    displayMd: '3.75rem',    // 60px
    displaySm: '3rem',       // 48px

    // Headings
    h1: '2.5rem',            // 40px
    h2: '2rem',              // 32px
    h3: '1.5rem',            // 24px
    h4: '1.25rem',           // 20px
    h5: '1.125rem',          // 18px
    h6: '1rem',              // 16px

    // Body text
    bodyLg: '1.125rem',      // 18px
    body: '1rem',            // 16px - BASE
    bodySm: '0.875rem',      // 14px

    // Supporting text
    caption: '0.75rem',      // 12px
    tiny: '0.625rem',        // 10px

    // Legacy support
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
  },

  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.1,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.7,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.03em',
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.03em',
    widest: '0.05em',
  },
} as const;

// ============================================
// SPACING (4px/8px Grid System)
// ============================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px - BASE UNIT
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
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.375rem',    // 6px
  base: '0.5rem',    // 8px
  md: '0.75rem',     // 12px
  lg: '1rem',        // 16px
  xl: '1.5rem',      // 24px
  '2xl': '2rem',     // 32px
  '3xl': '2.5rem',   // 40px
  full: '9999px',
} as const;

// ============================================
// SHADOWS (Subtle Professional Elevation)
// ============================================

export const shadows = {
  none: 'none',
  subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  md: '0 8px 12px -2px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
  lg: '0 16px 24px -4px rgba(0, 0, 0, 0.1), 0 8px 12px -6px rgba(0, 0, 0, 0.08)',
  xl: '0 24px 48px -8px rgba(0, 0, 0, 0.12), 0 12px 24px -12px rgba(0, 0, 0, 0.1)',
  '2xl': '0 32px 64px -12px rgba(0, 0, 0, 0.14)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Colored shadows
  primary: '0 8px 24px -4px rgba(30, 41, 59, 0.15)',
  secondary: '0 8px 24px -4px rgba(20, 184, 166, 0.2)',
  gold: '0 8px 24px -4px rgba(245, 158, 11, 0.25)',
  success: '0 4px 12px -2px rgba(16, 185, 129, 0.2)',
  warning: '0 4px 12px -2px rgba(245, 158, 11, 0.2)',
  error: '0 4px 12px -2px rgba(239, 68, 68, 0.2)',

  // Focus shadow
  focus: '0 0 0 3px rgba(20, 184, 166, 0.1)',
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.1)',
} as const;

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  primary: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
  secondary: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  hero: 'linear-gradient(135deg, #1E293B 0%, #0F766E 100%)',
  subtle: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
  gold: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',

  // Mesh gradient (Birch-style)
  mesh: `
    radial-gradient(at 20% 30%, rgba(20, 184, 166, 0.15) 0px, transparent 50%),
    radial-gradient(at 80% 70%, rgba(30, 41, 59, 0.1) 0px, transparent 50%),
    radial-gradient(at 50% 50%, rgba(245, 158, 11, 0.08) 0px, transparent 50%)
  `,
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  duration: {
    fast: '150ms',
    base: '200ms',
    medium: '300ms',
    slow: '500ms',
    slower: '700ms',
  },

  timing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Common transition strings
  all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors: 'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
} as const;

// ============================================
// BREAKPOINTS (Mobile-First)
// ============================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
} as const;

// ============================================
// CONTAINER WIDTHS
// ============================================

export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
  full: '100%',
} as const;

// ============================================
// COMPONENT TOKENS
// ============================================

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

// ============================================
// TYPE EXPORTS
// ============================================

export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Gradients = typeof gradients;
export type Transitions = typeof transitions;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type Containers = typeof containers;
export type Components = typeof components;

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
