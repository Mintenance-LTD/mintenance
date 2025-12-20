/**
 * Professional Design System for Contractor App
 * Based on enterprise-grade UI patterns and Figma design principles
 */

export const designSystem = {
  // Color Palette - Professional Enterprise Colors
  colors: {
    // Primary Colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    
    // Status Colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    // Neutral Colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    
    // Background Colors
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      accent: '#f0f9ff',
    },
  },

  // Typography Scale
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // Spacing Scale (8px base unit)
  spacing: {
    0: '0px',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },

  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },

  // Layout Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component Styles
  components: {
    // Card Styles
    card: {
      base: {
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        padding: '1.5rem',
      },
      elevated: {
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        padding: '1.5rem',
      },
    },

    // Button Styles
    button: {
      primary: {
        backgroundColor: '#0ea5e9',
        color: 'white',
        borderRadius: '0.5rem',
        padding: '0.75rem 1.5rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#0284c7',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)',
        },
      },
      secondary: {
        backgroundColor: 'white',
        color: '#374151',
        borderRadius: '0.5rem',
        padding: '0.75rem 1.5rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        border: '1px solid #d1d5db',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#f9fafb',
          borderColor: '#9ca3af',
        },
      },
    },

    // Badge Styles
    badge: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: '600',
        borderRadius: '9999px',
      },
      success: {
        backgroundColor: '#dcfce7',
        color: '#166534',
      },
      warning: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
      },
      error: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
      },
      info: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
      },
    },

    // Input Styles
    input: {
      base: {
        width: '100%',
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        border: '1px solid #d1d5db',
        borderRadius: '0.5rem',
        backgroundColor: 'white',
        transition: 'all 0.2s ease',
        '&:focus': {
          outline: 'none',
          borderColor: '#0ea5e9',
          boxShadow: '0 0 0 3px rgb(14, 165, 233, 0.1)',
        },
      },
    },
  },

  // Layout Patterns
  layouts: {
    // Three-Panel Master-Detail Layout
    threePanel: {
      container: {
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f8fafc',
      },
      sidebar: {
        width: '280px',
        backgroundColor: 'white',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column' as const,
      },
      mainContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        minWidth: 0,
      },
      contentArea: {
        flex: 1,
        padding: '1.5rem',
        overflow: 'auto',
      },
      detailPanel: {
        width: '400px',
        backgroundColor: 'white',
        borderLeft: '1px solid #e2e8f0',
        padding: '1.5rem',
        overflow: 'auto',
      },
    },

    // Dashboard Grid Layout
    dashboard: {
      container: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        padding: '1.5rem',
      },
      card: {
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
      },
    },
  },
} as const;

export type DesignSystem = typeof designSystem;
