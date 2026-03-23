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
  // Font Sizes (in pixels - aligned with web Tailwind scale)
  fontSize: {
    xs: 11,    // Web: text-xs (11px)
    sm: 13,    // Web: text-sm (13px)
    base: 15,  // Web: text-base (15px)
    md: 16,    // Web: text-base+ (16px) — card titles
    lg: 18,    // Web: text-lg (18px) — section headers
    xl: 20,    // Web: text-xl (20px)
    '2xl': 24, // Web: text-2xl (24px) — page subtitles
    '3xl': 30, // Web: text-3xl (30px) — hero titles
    '4xl': 36, // Web: text-4xl (36px)
    '5xl': 48, // Web: text-5xl (48px)
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
