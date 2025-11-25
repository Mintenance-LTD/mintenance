/**
 * Tailwind Config Generator
 * 
 * Generates Tailwind config from design tokens.
 * This ensures Tailwind uses the same values as our design tokens.
 */

const { webTokens } = require('@mintenance/design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors from design tokens
      // Colors from design tokens
      colors: {
        // Primary Brand Colors (Deep Navy)
        primary: {
          50: webTokens.colors.gray25,
          100: webTokens.colors.gray50,
          200: webTokens.colors.gray100,
          300: webTokens.colors.gray200,
          400: webTokens.colors.gray300,
          500: webTokens.colors.gray400,
          600: webTokens.colors.gray500,
          700: webTokens.colors.gray600,
          800: webTokens.colors.gray700,
          900: webTokens.colors.gray800,
          950: webTokens.colors.gray900,
          DEFAULT: webTokens.colors.primary,
          light: webTokens.colors.primaryLight,
          dark: webTokens.colors.primaryDark,
        },
        // Secondary Brand Colors (Emerald Green)
        secondary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: webTokens.colors.secondary,
          600: webTokens.colors.secondaryDark,
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: webTokens.colors.secondary,
          light: webTokens.colors.secondaryLight,
          dark: webTokens.colors.secondaryDark,
        },
        // Accent Colors (Premium Gold)
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: webTokens.colors.accent,
          600: webTokens.colors.accentDark,
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          DEFAULT: webTokens.colors.accent,
          light: webTokens.colors.accentLight,
          dark: webTokens.colors.accentDark,
        },
        // Error Colors
        error: {
          DEFAULT: webTokens.colors.error,
          light: webTokens.colors.errorLight,
          dark: webTokens.colors.errorDark,
        },
        // Success Colors
        success: {
          DEFAULT: webTokens.colors.success,
          light: webTokens.colors.successLight,
          dark: webTokens.colors.successDark,
        },
        // Additional colors from design tokens
        warning: webTokens.colors.warning,
        info: webTokens.colors.info,
        // Text colors
        text: {
          primary: webTokens.colors.textPrimary,
          secondary: webTokens.colors.textSecondary,
          tertiary: webTokens.colors.textTertiary,
          quaternary: webTokens.colors.textQuaternary,
          inverse: webTokens.colors.textInverse,
        },
        // Border colors
        border: {
          DEFAULT: webTokens.colors.border,
          light: webTokens.colors.borderLight,
          dark: webTokens.colors.borderDark,
          focus: webTokens.colors.borderFocus,
        },
      },

      // Typography from design tokens
      fontSize: {
        xs: [webTokens.typography.fontSize.xs, { lineHeight: webTokens.typography.lineHeight.tight }],
        sm: [webTokens.typography.fontSize.sm, { lineHeight: webTokens.typography.lineHeight.normal }],
        base: [webTokens.typography.fontSize.base, { lineHeight: webTokens.typography.lineHeight.normal }],
        lg: [webTokens.typography.fontSize.lg, { lineHeight: webTokens.typography.lineHeight.relaxed }],
        xl: [webTokens.typography.fontSize.xl, { lineHeight: webTokens.typography.lineHeight.relaxed }],
        '2xl': [webTokens.typography.fontSize['2xl'], { lineHeight: webTokens.typography.lineHeight.relaxed }],
        '3xl': [webTokens.typography.fontSize['3xl'], { lineHeight: webTokens.typography.lineHeight.tight }],
        '4xl': [webTokens.typography.fontSize['4xl'], { lineHeight: webTokens.typography.lineHeight.tight }],
        '5xl': [webTokens.typography.fontSize['5xl'], { lineHeight: webTokens.typography.lineHeight.tight }],
        // Custom typography scale (preserved for compatibility)
        'heading-lg': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.06em' }],
        'heading-md': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.06em' }],
        'subheading-lg': ['2.25rem', { lineHeight: '1.2', letterSpacing: '0' }],
        'subheading-md': ['1.75rem', { lineHeight: '1.2', letterSpacing: '0' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: webTokens.typography.fontWeight.normal,
        medium: webTokens.typography.fontWeight.medium,
        semibold: webTokens.typography.fontWeight.semibold,
        bold: webTokens.typography.fontWeight.bold,
        extrabold: '800',
        black: '900',
        // Custom font weights (preserved for compatibility)
        '460': '460',
        '560': '560',
        '640': '640',
      },
      letterSpacing: {
        tighter: webTokens.typography.letterSpacing.tighter,
        tight: webTokens.typography.letterSpacing.tight,
        normal: webTokens.typography.letterSpacing.normal,
        wide: webTokens.typography.letterSpacing.wide,
        wider: webTokens.typography.letterSpacing.wider,
        widest: webTokens.typography.letterSpacing.widest,
      },

      // Spacing from design tokens
      spacing: {
        '0.5': '0.125rem',   // 2px
        '1': webTokens.spacing.xs,      // 4px
        '1.5': '0.375rem',   // 6px
        '2': webTokens.spacing.sm,      // 8px
        '2.5': '0.625rem',   // 10px
        '3': '0.75rem',      // 12px
        '3.5': '0.875rem',   // 14px
        '4': webTokens.spacing.md,      // 16px
        '5': '1.25rem',      // 20px
        '6': webTokens.spacing.lg,      // 24px
        '7': '1.75rem',      // 28px
        '8': webTokens.spacing.xl,      // 32px
        '9': '2.25rem',      // 36px
        '10': '2.5rem',      // 40px
        '11': '2.75rem',     // 44px
        '12': webTokens.spacing['2xl'], // 48px
        '14': '3.5rem',      // 56px
        '16': '4rem',        // 64px
        '20': '5rem',        // 80px
        '24': '6rem',        // 96px
        // Additional spacing values preserved for compatibility
        '28': '7rem',
        '32': '8rem',
        '36': '9rem',
        '40': '10rem',
        '44': '11rem',
        '48': '12rem',
        '52': '13rem',
        '56': '14rem',
        '60': '15rem',
        '64': '16rem',
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
      },

      // Border Radius from design tokens
      borderRadius: {
        none: webTokens.borderRadius.none,
        sm: webTokens.borderRadius.sm,
        DEFAULT: webTokens.borderRadius.base,
        md: webTokens.borderRadius.md,
        lg: webTokens.borderRadius.lg,
        xl: webTokens.borderRadius.xl,
        '2xl': webTokens.borderRadius['2xl'],
        '3xl': '1.5rem',   // 24px (same as 2xl)
        full: webTokens.borderRadius.full,
      },

      // Shadows from design tokens
      boxShadow: {
        sm: webTokens.shadows.sm,
        DEFAULT: webTokens.shadows.base,
        md: webTokens.shadows.md,
        lg: webTokens.shadows.lg,
        xl: webTokens.shadows.xl,
        '2xl': webTokens.shadows['2xl'],
        '3xl': webTokens.shadows['3xl'],
        inner: webTokens.shadows.inner,
        hover: webTokens.shadows.hover,
        'primary-glow': webTokens.shadows.primaryGlow,
        'success-glow': webTokens.shadows.successGlow,
        'warning-glow': webTokens.shadows.warningGlow,
        'error-glow': webTokens.shadows.errorGlow,
        none: 'none',
      },

      // Animation System (preserved)
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        250: '250ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },

      // Z-Index System (preserved)
      zIndex: {
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        dropdown: '1000',
        sticky: '1100',
        fixed: '1200',
        overlay: '1300',
        modal: '1400',
        popover: '1500',
        tooltip: '1600',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
};
