/**
 * Tailwind Config Generator
 *
 * Generates Tailwind config from design tokens.
 * This ensures Tailwind uses the same values as our design tokens.
 *
 * 2025 UI/UX Revamp: Enhanced with Checkatrade-inspired professional design
 */

const { webTokens } = require('@mintenance/design-tokens');
const { tokens } = require('./lib/design-tokens/index.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors from unified design tokens
      colors: {
        // Checkatrade-Inspired Professional Blue (NEW PRIMARY)
        // Primary brand color: #0066CC
        'ck-blue': tokens.colors.primary,

        // Alias for primary (for easier usage)
        blue: tokens.colors.primary,

        // Mintenance Mint Green Accent (NEW SECONDARY)
        // Secondary brand color: #10B981
        'ck-mint': tokens.colors.secondary,

        // Alias for secondary (for easier usage)
        mint: tokens.colors.secondary,

        // Professional Neutrals (NEW)
        // Main background: #F7F9FC
        neutral: tokens.colors.neutral,

        // Gray alias (many components use 'gray')
        gray: tokens.colors.neutral,

        // Semantic Colors (NEW - WCAG AA Compliant)
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,

        // Aliases for semantic colors
        green: tokens.colors.success,
        red: tokens.colors.error,
        amber: tokens.colors.warning,

        // Brand Teal (Primary) - 2025 Enhanced (LEGACY PRESERVED)
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488', // Brand Primary
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Brand Navy (Secondary) - 2025 Enhanced
        navy: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B', // Brand Secondary - Sidebar
          900: '#0F172A',
        },
        // Brand Emerald (Accent) - 2025 Enhanced - WCAG AA Compliant
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#059669', // Brand Accent (4.92:1 contrast - WCAG AA compliant)
          600: '#047857',
          700: '#065F46',
          800: '#064E3B',
          900: '#022C22',
        },
        // Primary Brand Colors (Deep Navy) - Legacy Support
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
        // Secondary Brand Colors (Mint Green) - Legacy Support
        secondary: {
          50: '#F0FDF9',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: webTokens.colors.secondary,
          600: webTokens.colors.secondaryDark,
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: webTokens.colors.secondary,
          light: webTokens.colors.secondaryLight,
          dark: webTokens.colors.secondaryDark,
        },
        // Accent Colors (Premium Gold) - Legacy Support
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
        // Error Colors - 2025 Enhanced
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          DEFAULT: webTokens.colors.error,
          light: webTokens.colors.errorLight,
          dark: webTokens.colors.errorDark,
        },
        // Success Colors - 2025 Enhanced
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          DEFAULT: webTokens.colors.success,
          light: webTokens.colors.successLight,
          dark: webTokens.colors.successDark,
        },
        // Warning Colors - 2025 Enhanced
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          DEFAULT: webTokens.colors.warning,
        },
        // Info Colors - 2025 Enhanced
        info: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          DEFAULT: webTokens.colors.info,
        },
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

      // Shadows from design tokens - 2025 Enhanced
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
        // 2025 Enhanced Shadows
        'glow': '0 0 20px rgba(13, 148, 136, 0.3)',
        'glow-hover': '0 0 25px rgba(13, 148, 136, 0.4)',
        none: 'none',
      },

      // Gradients - 2025 Enhanced
      backgroundImage: {
        'gradient-teal-emerald': 'linear-gradient(135deg, #0D9488 0%, #10B981 100%)',
        'gradient-navy-teal': 'linear-gradient(135deg, #1E293B 0%, #0D9488 100%)',
        'gradient-subtle': 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0D9488 0%, #10B981 50%, #14B8A6 100%)',
        'gradient-card-hover': 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
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

      // Skeleton Shimmer Animation
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
};
