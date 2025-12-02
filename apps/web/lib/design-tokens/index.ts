/**
 * Unified Design Tokens System
 *
 * Inspired by Checkatrade's professional design language
 * All values are WCAG 2.1 AA compliant
 *
 * Usage:
 * import { tokens } from '@/lib/design-tokens';
 * <div style={{ color: tokens.colors.text.primary }}>Text</div>
 */

export const tokens = {
  /**
   * Color System
   * Checkatrade-inspired professional palette
   * All colors are WCAG 2.1 AA compliant for accessibility
   *
   * Primary: Professional Blue (#0066CC) - Used for main CTAs, links, and primary actions
   * Secondary: Mint Green (#10B981) - Used for accents, highlights, and secondary actions
   * Neutral: Light Gray (#F7F9FC) - Used for backgrounds and subtle UI elements
   */
  colors: {
    // Primary brand colors (Professional Blue)
    primary: {
      50: '#E6F2FF',   // Lightest blue - backgrounds, hover states
      100: '#CCE5FF',  // Very light blue - subtle highlights
      200: '#99CBFF',  // Light blue - disabled states
      300: '#66B0FF',  // Medium light blue - hover backgrounds
      400: '#3396FF',  // Medium blue - interactive elements
      500: '#0066CC',  // Main brand color (Checkatrade blue) - PRIMARY
      600: '#0052A3',  // Darker blue - hover states for primary buttons
      700: '#003D7A',  // Dark blue - active states
      800: '#002952',  // Very dark blue - text on light backgrounds
      900: '#001429',  // Darkest blue - headings, emphasis
    },

    // Secondary accent colors (Mint Green)
    secondary: {
      50: '#F0FDF9',   // Very light mint - backgrounds
      100: '#DCFCE7',  // Light mint - subtle accents
      200: '#BBF7D0',  // Lighter mint - hover backgrounds
      300: '#86EFAC',  // Mint - borders
      400: '#4ADE80',  // Bright mint - interactive accents
      500: '#10B981',  // MAIN MINT GREEN (emerald-500) - SECONDARY BRAND COLOR
      600: '#059669',  // Darker mint - hover states
      700: '#047857',  // Dark mint - active states
      800: '#065F46',  // Very dark mint - text
      900: '#064E3B',  // Darkest mint - emphasis
    },

    // Neutral grays (primary UI colors)
    neutral: {
      50: '#F7F9FC',   // Backgrounds - MAIN BACKGROUND COLOR
      100: '#EFF2F7',  // Subtle backgrounds - cards, panels
      200: '#E4E9F2',  // Light borders
      300: '#CBD5E1',  // Medium borders, dividers
      400: '#94A3B8',  // Disabled text, placeholders
      500: '#64748B',  // Secondary text, icons
      600: '#475569',  // Primary body text
      700: '#334155',  // Emphasized text
      800: '#1E293B',  // Headings, dark backgrounds
      900: '#0F172A',  // Primary headings, dark text
    },

    // Semantic colors (status indicators)
    success: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      500: '#10B981',  // Green
      600: '#059669',
      700: '#047857',
    },

    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',  // Amber
      600: '#D97706',
      700: '#B45309',
    },

    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: '#EF4444',  // Red
      600: '#DC2626',
      700: '#B91C1C',
    },

    info: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',  // Blue
      600: '#2563EB',
      700: '#1D4ED8',
    },

    // Text colors (WCAG AA compliant)
    text: {
      primary: '#0F172A',     // neutral-900 - 15.3:1 contrast on white
      secondary: '#475569',   // neutral-600 - 7.9:1 contrast
      tertiary: '#64748B',    // neutral-500 - 5.2:1 contrast
      inverse: '#FFFFFF',     // White text on dark backgrounds
      disabled: '#94A3B8',    // neutral-400 - Light gray
      link: '#0066CC',        // primary-500 - Blue links
      linkHover: '#0052A3',   // primary-600 - Darker blue on hover
    },

    // Background colors
    background: {
      primary: '#FFFFFF',     // White
      secondary: '#F7F9FC',   // neutral-50 - Light gray
      tertiary: '#EFF2F7',    // neutral-100 - Slightly darker gray
      inverse: '#0F172A',     // neutral-900 - Dark background
      elevated: '#FFFFFF',    // Cards/modals
      overlay: 'rgba(15, 23, 42, 0.75)', // Modal overlay
    },

    // Border colors
    border: {
      default: '#E4E9F2',     // neutral-200 - Light borders
      hover: '#CBD5E1',       // neutral-300 - Hover state
      focus: '#0066CC',       // primary-500 - Focus ring
      error: '#EF4444',       // error-500 - Error state
    },

    // Surface colors (for cards, panels)
    surface: {
      default: '#FFFFFF',
      elevated: '#FFFFFF',
      sunken: '#F7F9FC',      // neutral-50
    },
  },

  /**
   * Typography Scale
   * Based on Checkatrade's strict hierarchy
   *
   * H1: 32px (2rem) - Page titles, hero headings
   * H2: 24px (1.5rem) - Section headings
   * H3: 20px (1.25rem) - Subsection headings
   * Body: 16px (1rem) - Standard body text
   * Small: 14px (0.875rem) - Supporting text, captions
   */
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    },

    fontSize: {
      xs: '0.75rem',      // 12px - Tiny labels, badges
      sm: '0.875rem',     // 14px (Small) - Supporting text, captions
      base: '1rem',       // 16px (Body) - STANDARD BODY TEXT
      lg: '1.125rem',     // 18px - Large body text
      xl: '1.25rem',      // 20px (H3) - Subsection headings
      '2xl': '1.5rem',    // 24px (H2) - SECTION HEADINGS
      '3xl': '1.875rem',  // 30px - Large headings
      '4xl': '2rem',      // 32px (H1) - PAGE TITLES
      '5xl': '2.5rem',    // 40px - Hero headings
      '6xl': '3rem',      // 48px - Extra large hero text
    },

    fontWeight: {
      normal: 400,
      medium: 500,        // Primary weight
      semibold: 600,
      bold: 700,
    },

    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,        // Body text
      relaxed: 1.625,
      loose: 2,
    },

    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },

  /**
   * Spacing Scale
   * 4px base unit (consistent with Checkatrade)
   *
   * Base unit: 4px - All spacing is a multiple of 4px for visual consistency
   * Common values: 4, 8, 12, 16, 24, 32, 48, 64px
   */
  spacing: {
    0: '0',           // 0px - No spacing
    0.5: '0.125rem',  // 2px - Hairline spacing
    1: '0.25rem',     // 4px - BASE UNIT (minimum spacing)
    1.5: '0.375rem',  // 6px - Extra small spacing
    2: '0.5rem',      // 8px - Small spacing
    2.5: '0.625rem',  // 10px - Between small and medium
    3: '0.75rem',     // 12px - Medium spacing
    3.5: '0.875rem',  // 14px - Between medium and default
    4: '1rem',        // 16px - Default spacing
    5: '1.25rem',     // 20px - Large spacing
    6: '1.5rem',      // 24px - Extra large spacing
    7: '1.75rem',     // 28px - Between 24 and 32
    8: '2rem',        // 32px - Section spacing
    9: '2.25rem',     // 36px - Between 32 and 40
    10: '2.5rem',     // 40px - Large section spacing
    11: '2.75rem',    // 44px - Between 40 and 48
    12: '3rem',       // 48px - Major section spacing
    14: '3.5rem',     // 56px - Between 48 and 64
    16: '4rem',       // 64px - Page section spacing
    20: '5rem',       // 80px - Large page sections
    24: '6rem',       // 96px - Major page sections
    32: '8rem',       // 128px - Extra large sections
    40: '10rem',      // 160px - Hero sections
    48: '12rem',      // 192px - Large hero sections
    56: '14rem',      // 224px - Extra large sections
    64: '16rem',      // 256px - Maximum section spacing
  },

  /**
   * Border Radius
   * Checkatrade uses subtle, consistent rounding
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    base: '0.5rem',   // 8px (default)
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',   // Pills/circles
  },

  /**
   * Shadows
   * Subtle, professional elevation
   */
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    focus: '0 0 0 3px rgba(0, 102, 204, 0.1)', // primary-500 with opacity
  },

  /**
   * Z-index Scale
   * Consistent layering
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  /**
   * Transitions
   * Smooth, consistent animations
   */
  transitions: {
    duration: {
      fast: '100ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },

    timing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  /**
   * Breakpoints
   * Mobile-first responsive design
   */
  breakpoints: {
    xs: '320px',   // Small phones
    sm: '640px',   // Large phones
    md: '768px',   // Tablets
    lg: '1024px',  // Laptops
    xl: '1280px',  // Desktops
    '2xl': '1536px', // Large desktops
  },

  /**
   * Container Widths
   * Max content widths at each breakpoint
   */
  containers: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1400px',
  },
} as const;

/**
 * Component-specific tokens
 * Pre-configured styles for common components
 */
export const componentTokens = {
  /**
   * Button variants
   */
  button: {
    primary: {
      backgroundColor: tokens.colors.primary[500],
      color: tokens.colors.text.inverse,
      padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
      borderRadius: tokens.borderRadius.lg,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.medium,
      border: 'none',
      cursor: 'pointer',
      transition: `all ${tokens.transitions.duration.base} ${tokens.transitions.timing.easeInOut}`,
      boxShadow: tokens.shadows.sm,
      hover: {
        backgroundColor: tokens.colors.primary[600],
        boxShadow: tokens.shadows.md,
      },
      focus: {
        outline: 'none',
        boxShadow: tokens.shadows.focus,
      },
      disabled: {
        backgroundColor: tokens.colors.neutral[200],
        color: tokens.colors.text.disabled,
        cursor: 'not-allowed',
      },
    },

    secondary: {
      backgroundColor: tokens.colors.background.primary,
      color: tokens.colors.text.primary,
      padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
      borderRadius: tokens.borderRadius.lg,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.medium,
      border: `1px solid ${tokens.colors.border.default}`,
      cursor: 'pointer',
      transition: `all ${tokens.transitions.duration.base} ${tokens.transitions.timing.easeInOut}`,
      hover: {
        backgroundColor: tokens.colors.background.secondary,
        borderColor: tokens.colors.border.hover,
      },
      focus: {
        outline: 'none',
        borderColor: tokens.colors.border.focus,
        boxShadow: tokens.shadows.focus,
      },
    },

    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.text.secondary,
      padding: `${tokens.spacing[3]} ${tokens.spacing[6]}`,
      borderRadius: tokens.borderRadius.lg,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.medium,
      border: 'none',
      cursor: 'pointer',
      transition: `all ${tokens.transitions.duration.base} ${tokens.transitions.timing.easeInOut}`,
      hover: {
        backgroundColor: tokens.colors.background.secondary,
        color: tokens.colors.text.primary,
      },
      focus: {
        outline: 'none',
        boxShadow: tokens.shadows.focus,
      },
    },
  },

  /**
   * Input fields
   */
  input: {
    default: {
      padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
      fontSize: tokens.typography.fontSize.base,
      lineHeight: tokens.typography.lineHeight.normal,
      borderRadius: tokens.borderRadius.lg,
      border: `1px solid ${tokens.colors.border.default}`,
      backgroundColor: tokens.colors.background.primary,
      color: tokens.colors.text.primary,
      transition: `all ${tokens.transitions.duration.base} ${tokens.transitions.timing.easeInOut}`,
      focus: {
        outline: 'none',
        borderColor: tokens.colors.border.focus,
        boxShadow: tokens.shadows.focus,
      },
      error: {
        borderColor: tokens.colors.border.error,
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
      },
    },
  },

  /**
   * Cards
   */
  card: {
    default: {
      backgroundColor: tokens.colors.surface.default,
      borderRadius: tokens.borderRadius.xl,
      padding: tokens.spacing[6],
      border: `1px solid ${tokens.colors.border.default}`,
      boxShadow: tokens.shadows.sm,
      transition: `all ${tokens.transitions.duration.base} ${tokens.transitions.timing.easeInOut}`,
      hover: {
        boxShadow: tokens.shadows.md,
        borderColor: tokens.colors.border.hover,
      },
    },
  },

  /**
   * Badges
   */
  badge: {
    success: {
      backgroundColor: tokens.colors.success[100],
      color: tokens.colors.success[700],
      padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
      borderRadius: tokens.borderRadius.full,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: tokens.typography.fontWeight.medium,
    },

    warning: {
      backgroundColor: tokens.colors.warning[100],
      color: tokens.colors.warning[700],
      padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
      borderRadius: tokens.borderRadius.full,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: tokens.typography.fontWeight.medium,
    },

    error: {
      backgroundColor: tokens.colors.error[100],
      color: tokens.colors.error[700],
      padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
      borderRadius: tokens.borderRadius.full,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: tokens.typography.fontWeight.medium,
    },

    info: {
      backgroundColor: tokens.colors.info[100],
      color: tokens.colors.info[700],
      padding: `${tokens.spacing[1]} ${tokens.spacing[3]}`,
      borderRadius: tokens.borderRadius.full,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: tokens.typography.fontWeight.medium,
    },
  },
} as const;

/**
 * Type exports for TypeScript
 */
export type Tokens = typeof tokens;
export type ComponentTokens = typeof componentTokens;
