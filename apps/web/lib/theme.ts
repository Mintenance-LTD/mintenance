// Web Theme System adapted from Mobile Theme
// This provides consistent design tokens across platforms

export const theme = {
  // Color Palette (identical to mobile)
  colors: {
    // Primary Brand Colors
    primary: '#0F172A', // Very dark blue/slate - navy blue
    primaryLight: '#1E293B', // Lighter but still dark blue
    primaryDark: '#020617', // Darkest blue for pressed states

    // Secondary Colors
    secondary: '#10B981', // Vibrant emerald green
    secondaryLight: '#34D399', // Lighter emerald
    secondaryDark: '#059669', // Darker emerald

    // Accent Colors
    accent: '#F59E0B', // Warm amber
    accentLight: '#FCD34D', // Light amber
    accentDark: '#D97706', // Dark amber

    // Success/Error States
    success: '#34C759',
    successLight: '#5DD579',
    successDark: '#248A3D',

    error: '#FF3B30',
    errorLight: '#FF6B61',
    errorDark: '#D70015',

    warning: '#FF9500',
    warningLight: '#FFB143',
    warningDark: '#CC7700',

    info: '#007AFF',
    infoLight: '#339FFF',
    infoDark: '#0051D5',

    // Neutral Colors
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#F1F5F9',

    // Common utility colors
    white: '#FFFFFF',
    black: '#000000',

    // Text Colors (WCAG AA Compliant)
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textTertiary: '#6B7280',
    textQuaternary: '#9CA3AF',
    textInverse: '#FFFFFF',
    textInverseMuted: 'rgba(255, 255, 255, 0.8)',

    // Placeholder Text
    placeholder: '#6B7280',

    // Border Colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderDark: '#D1D5DB',
    borderFocus: '#0F172A',

    // Priority Colors
    priorityHigh: '#EF4444',
    priorityMedium: '#F59E0B',
    priorityLow: '#10B981',
    priorityUrgent: '#DC2626',

    // Status Colors
    statusPosted: '#007AFF',
    statusAssigned: '#FF9500',
    statusInProgress: '#FF9500',
    statusCompleted: '#34C759',
    statusCancelled: '#8E8E93',

    // Special purpose colors
    ratingGold: '#FFD700',

    // Category Colors
    plumbing: '#3B82F6',
    electrical: '#F59E0B',
    hvac: '#10B981',
    handyman: '#8B5CF6',
    cleaning: '#EF4444',
    landscaping: '#10B981',
    appliance: '#EC4899',
    painting: '#F97316',
  },

  // Typography (web-adapted font sizes)
  typography: {
    // Font Families (web-specific)
    fontFamily: {
      regular: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      medium: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      semibold: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      bold: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },

    // Font Weights
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    // Font Sizes (web pixel values)
    fontSize: {
      xs: '10px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '32px',
      '5xl': '48px',
    },

    // Line Heights
    lineHeight: {
      tight: '1.2',
      normal: '1.4',
      relaxed: '1.6',
      loose: '1.8',
    },
  },

  // Spacing System (same as mobile)
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    // Aliases
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },

  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '4px',
    base: '8px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  // Shadows (CSS box-shadow)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },

  // Component Variants
  components: {
    // Button Variants
    button: {
      primary: {
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        borderColor: '#0F172A',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: '#0F172A',
      },
      tertiary: {
        backgroundColor: 'transparent',
        color: '#007AFF',
        borderColor: 'transparent',
      },
      success: {
        backgroundColor: '#10B981',
        color: '#FFFFFF',
        borderColor: '#10B981',
      },
      danger: {
        backgroundColor: '#FF3B30',
        color: '#FFFFFF',
        borderColor: '#FF3B30',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: 'transparent',
      },
    },

    // Card Variants
    card: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: '1px',
        borderRadius: '16px',
      },
      elevated: {
        backgroundColor: '#FFFFFF',
        borderColor: 'transparent',
        borderWidth: '0px',
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#E5E7EB',
        borderWidth: '1px',
        borderRadius: '16px',
      },
    },

    // Input Variants
    input: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        color: '#1F2937',
        placeholderColor: '#6B7280',
      },
      focused: {
        borderColor: '#0F172A',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.1)',
      },
      error: {
        borderColor: '#DC2626',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
      },
    },
  },

  // Layout Constants (web-adapted)
  layout: {
    screenPadding: '16px',
    cardPadding: '16px',
    sectionSpacing: '24px',
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
      normal: '300ms',
      slow: '500ms',
      slower: '750ms',
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },
};

export type Theme = typeof theme;

// Utility functions for web
export const getColor = (colorPath: string): string => {
  const keys = colorPath.split('.');
  let value: any = theme.colors;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return theme.colors.textSecondary; // fallback
    }
  }

  return typeof value === 'string' ? value : theme.colors.textSecondary;
};

export const getSpacing = (size: keyof typeof theme.spacing): string => {
  return theme.spacing[size];
};

export const getFontSize = (size: keyof typeof theme.typography.fontSize): string => {
  return theme.typography.fontSize[size];
};

export const getShadow = (size: keyof typeof theme.shadows): string => {
  return theme.shadows[size];
};

// Status color helper
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'posted':
      return theme.colors.statusPosted;
    case 'assigned':
      return theme.colors.statusAssigned;
    case 'in_progress':
      return theme.colors.statusInProgress;
    case 'completed':
      return theme.colors.statusCompleted;
    case 'cancelled':
      return theme.colors.statusCancelled;
    default:
      return theme.colors.textSecondary;
  }
};

// Priority color helper
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return theme.colors.priorityHigh;
    case 'medium':
      return theme.colors.priorityMedium;
    case 'low':
      return theme.colors.priorityLow;
    default:
      return theme.colors.textSecondary;
  }
};

export default theme;