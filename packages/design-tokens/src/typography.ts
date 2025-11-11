/**
 * Typography Tokens
 * 
 * Font sizes, weights, line heights, and letter spacing values.
 * These values ensure consistent typography across web and mobile platforms.
 */

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'JetBrains Mono, "Courier New", monospace',
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Font Sizes (in pixels - matching web theme exactly)
  fontSize: {
    xs: 11,    // Web: 11px
    sm: 13,    // Web: 13px
    base: 15,  // Web: 15px
    md: 16,    // Web: 16px
    lg: 17,    // Web: 17px
    xl: 19,    // Web: 19px
    '2xl': 22, // Web: 22px
    '3xl': 28, // Web: 28px
    '4xl': 36, // Web: 36px
    '5xl': 48, // Web: 48px
  },

  // Line Heights (as strings for CSS compatibility)
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.6',
    loose: '1.8',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export type Typography = typeof typography;

