// Web Theme System using Shared Design Tokens
// This provides consistent design tokens across platforms while maintaining
// web-specific functionality and visual appearance.

import { webTokens } from '@mintenance/design-tokens';

// Use design tokens as the base
const tokens = webTokens;

export const theme = {
  // Colors from design tokens (exact same values)
  colors: {
    ...tokens.colors,
    // New design system colors
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Primary teal accent
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    navy: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#0C1A33', // Admin sidebar
    },
    // Admin-specific brand color (indigo-blue used across admin UI)
    adminPrimary: '#4A67FF',
    adminPrimaryLight: '#EEF1FF',
    // Semantic status colors for admin badges
    status: {
      success: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
      error: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
      warning: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
      info: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
      neutral: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
    },
  },

  // Typography from design tokens
  typography: {
    fontFamily: {
      regular: tokens.typography.fontFamily.regular,
      medium: tokens.typography.fontFamily.regular,
      semibold: tokens.typography.fontFamily.regular,
      bold: tokens.typography.fontFamily.regular,
    },
    fontWeight: {
      ...tokens.typography.fontWeight,
    },
    fontSize: {
      ...tokens.typography.fontSize,
    },
    lineHeight: {
      ...tokens.typography.lineHeight,
    },
    letterSpacing: {
      ...tokens.typography.letterSpacing,
    },
  },

  // Spacing from design tokens
  spacing: {
    ...tokens.spacing,
  },

  // Border Radius from design tokens
  borderRadius: {
    ...tokens.borderRadius,
  },

  // Shadows from design tokens
  shadows: {
    ...tokens.shadows,
  },

  // Gradients from design tokens (web-specific)
  gradients: {
    ...tokens.gradients,
  },

  // Component Variants (using design tokens)
  components: {
    // Button Variants
    button: {
      primary: {
        backgroundColor: '#14b8a6', // Teal accent
        color: tokens.colors.white,
        borderColor: '#14b8a6',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: tokens.colors.primary,
        borderColor: tokens.colors.primary,
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: tokens.colors.info,
        borderColor: 'transparent',
      },
      success: {
        backgroundColor: tokens.colors.secondary,
        color: tokens.colors.white,
        borderColor: tokens.colors.secondary,
      },
      danger: {
        backgroundColor: tokens.colors.error,
        color: tokens.colors.white,
        borderColor: tokens.colors.error,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: tokens.colors.primary,
        borderColor: 'transparent',
      },
      outline: {
        backgroundColor: 'transparent',
        color: tokens.colors.primary,
        borderColor: tokens.colors.border,
      },
    },

    // Card Variants
    card: {
      default: {
        backgroundColor: tokens.colors.white,
        borderColor: tokens.colors.border,
        borderWidth: '1px',
        borderRadius: tokens.borderRadius.xl,
      },
      elevated: {
        backgroundColor: tokens.colors.white,
        borderColor: 'transparent',
        borderWidth: '0px',
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: tokens.colors.border,
        borderWidth: '1px',
        borderRadius: tokens.borderRadius.xl,
      },
    },

    // Input Variants
    input: {
      default: {
        backgroundColor: tokens.colors.white,
        borderColor: tokens.colors.border,
        color: tokens.colors.textPrimary,
        placeholderColor: tokens.colors.placeholder,
      },
      focused: {
        borderColor: tokens.colors.primary,
        backgroundColor: tokens.colors.white,
        color: tokens.colors.textPrimary,
        placeholderColor: tokens.colors.placeholder,
        boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.1)',
      },
      error: {
        borderColor: tokens.colors.errorDark,
        backgroundColor: '#FEF2F2',
        color: tokens.colors.errorDark,
        placeholderColor: tokens.colors.errorDark,
      },
    },
  },

  // Layout Constants (web-adapted)
  layout: {
    screenPadding: tokens.spacing[4],
    cardPadding: tokens.spacing[4],
    sectionSpacing: tokens.spacing[6],
    buttonHeight: '44px',
    buttonHeightLarge: '48px',
    inputHeight: '44px',
    inputHeightLarge: '48px',
    headerHeight: '56px',
    minTouchTarget: '44px',

    // Responsive breakpoints
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },

  // Animation (CSS-compatible)
  animation: {
    duration: {
      instant: '100ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Visual effects from design tokens
  effects: {
    ...tokens.effects,
  },
};

type Theme = typeof theme;

// Utility functions for web (using design tokens)
const getColor = tokens.getColor;

const getSpacing = (size: keyof typeof tokens.spacing): string => {
  const value = tokens.spacing[size];
  return typeof value === 'string' ? value : `${value}px`;
};

const getFontSize = (size: keyof typeof tokens.typography.fontSize): string => {
  return tokens.typography.fontSize[size];
};

const getShadow = (size: keyof typeof tokens.shadows): string => {
  return tokens.shadows[size];
};

// Status color helper
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'posted':
      return tokens.colors.statusPosted;
    case 'assigned':
      return tokens.colors.statusAssigned;
    case 'in_progress':
      return tokens.colors.statusInProgress;
    case 'completed':
      return tokens.colors.statusCompleted;
    case 'cancelled':
      return tokens.colors.statusCancelled;
    default:
      return tokens.colors.textSecondary;
  }
};

// Priority color helper
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return tokens.colors.priorityHigh;
    case 'medium':
      return tokens.colors.priorityMedium;
    case 'low':
      return tokens.colors.priorityLow;
    default:
      return tokens.colors.textSecondary;
  }
};
