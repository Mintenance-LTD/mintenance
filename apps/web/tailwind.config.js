/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ========================================
      // COLOR SYSTEM
      // ========================================
      colors: {
        // Primary Brand Colors (Navy Blue)
        primary: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
          DEFAULT: '#0F172A',
          light: '#1E293B',
          dark: '#020617',
        },
        // Secondary Brand Colors (Emerald Green)
        secondary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        // Accent Colors (Amber)
        accent: {
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
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dark: '#D97706',
        },
        // Error Colors (Red)
        error: {
          DEFAULT: '#FF3B30',
          light: '#FF6B61',
          dark: '#D70015',
        },
        // Success Colors (Green)
        success: {
          DEFAULT: '#34C759',
          light: '#5DD579',
          dark: '#248A3D',
        },
      },

      // ========================================
      // TYPOGRAPHY SYSTEM
      // ========================================
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
        // Custom typography scale
        'heading-lg': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.06em' }], // 60px
        'heading-md': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.06em' }], // 40px
        'subheading-lg': ['2.25rem', { lineHeight: '1.2', letterSpacing: '0' }], // 36px
        'subheading-md': ['1.75rem', { lineHeight: '1.2', letterSpacing: '0' }], // 28px
      },
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
        // Custom font weights
        '460': '460',
        '560': '560',
        '640': '640',
      },
      letterSpacing: {
        tighter: '-0.06em',
        tight: '-0.03em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },

      // ========================================
      // SPACING SYSTEM
      // ========================================
      spacing: {
        '0.5': '0.125rem',   // 2px
        '1': '0.25rem',      // 4px
        '1.5': '0.375rem',   // 6px
        '2': '0.5rem',       // 8px
        '2.5': '0.625rem',   // 10px
        '3': '0.75rem',      // 12px
        '3.5': '0.875rem',   // 14px
        '4': '1rem',         // 16px
        '5': '1.25rem',      // 20px
        '6': '1.5rem',       // 24px
        '7': '1.75rem',      // 28px
        '8': '2rem',         // 32px
        '9': '2.25rem',      // 36px
        '10': '2.5rem',      // 40px
        '11': '2.75rem',     // 44px
        '12': '3rem',        // 48px
        '14': '3.5rem',      // 56px
        '16': '4rem',        // 64px
        '20': '5rem',        // 80px
        '24': '6rem',        // 96px
        '28': '7rem',        // 112px
        '32': '8rem',        // 128px
        '36': '9rem',        // 144px
        '40': '10rem',       // 160px
        '44': '11rem',       // 176px
        '48': '12rem',       // 192px
        '52': '13rem',       // 208px
        '56': '14rem',       // 224px
        '60': '15rem',       // 240px
        '64': '16rem',       // 256px
        '72': '18rem',       // 288px
        '80': '20rem',       // 320px
        '96': '24rem',       // 384px
      },

      // ========================================
      // BORDER RADIUS SYSTEM
      // ========================================
      borderRadius: {
        none: '0',
        sm: '0.25rem',      // 4px
        DEFAULT: '0.375rem', // 6px
        md: '0.5rem',       // 8px
        lg: '0.75rem',      // 12px
        xl: '1rem',         // 16px
        '2xl': '1.25rem',   // 20px
        '3xl': '1.5rem',    // 24px
        full: '9999px',
      },

      // ========================================
      // SHADOW/ELEVATION SYSTEM
      // ========================================
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
      },

      // ========================================
      // ANIMATION SYSTEM
      // ========================================
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        250: '250ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },

      // ========================================
      // Z-INDEX SYSTEM
      // ========================================
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
}
