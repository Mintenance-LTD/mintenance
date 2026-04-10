/**
 * MINTENANCE DESIGN TOKENS - Typography
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    display:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  // Font Sizes
  fontSize: {
    // Display - Hero headlines
    displayLg: '4.5rem', // 72px
    displayMd: '3.75rem', // 60px
    displaySm: '3rem', // 48px

    // Headings
    h1: '2.5rem', // 40px
    h2: '2rem', // 32px
    h3: '1.5rem', // 24px
    h4: '1.25rem', // 20px
    h5: '1.125rem', // 18px
    h6: '1rem', // 16px

    // Body text
    bodyLg: '1.125rem', // 18px
    body: '1rem', // 16px - BASE
    bodySm: '0.875rem', // 14px

    // Supporting text
    caption: '0.75rem', // 12px
    tiny: '0.625rem', // 10px

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

type Typography = typeof typography;
