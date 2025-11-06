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

    // Neutral Colors - Enhanced with expanded gray scale
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    backgroundTertiary: '#F1F5F9',
    backgroundDark: '#1F2937',
    backgroundSubtle: '#FCFCFD', // New - very subtle background
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#F1F5F9',

    // Common utility colors
    white: '#FFFFFF',
    black: '#000000',

    // Gray Scale - Expanded
    gray25: '#FCFCFD',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Text Colors (WCAG AA Compliant)
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textTertiary: '#6B7280',
    textQuaternary: '#9CA3AF',
    textInverse: '#FFFFFF',
    textInverseMuted: 'rgba(255, 255, 255, 0.8)',
    // Legacy aliases
    text: '#1F2937',

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
      normal: '400',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    // Font Sizes (web pixel values) - Enhanced for better hierarchy
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      md: '16px',
      lg: '17px',
      xl: '19px',
      '2xl': '22px',
      '3xl': '28px',
      '4xl': '36px',
      '5xl': '48px',
    },

    // Line Heights
    lineHeight: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.6',
      loose: '1.8',
    },

    // Letter Spacing - New for enhanced typography
    letterSpacing: {
      tighter: '-0.02em',
      tight: '-0.01em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
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
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
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

  // Shadows (CSS box-shadow) - Enhanced with more depth and colored shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    // Hover shadows for interactive elements
    hover: '0 10px 20px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.08)',
    // Colored shadows for emphasis
    primaryGlow: '0 8px 16px rgba(15, 23, 42, 0.15)',
    successGlow: '0 8px 16px rgba(16, 185, 129, 0.2)',
    warningGlow: '0 8px 16px rgba(245, 158, 11, 0.2)',
    errorGlow: '0 8px 16px rgba(239, 68, 68, 0.2)',
  },
  
  // Gradients - Professional, subtle gradients
  gradients: {
    primary: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    primaryLight: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    successLight: 'linear-gradient(135deg, #34D399 0%, #6EE7B7 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
    error: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    info: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
    // Subtle background gradients
    backgroundSubtle: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
    backgroundWarm: 'linear-gradient(180deg, #FFFFFF 0%, #FEF3C7 100%)',
    backgroundCool: 'linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)',
    // Card gradients
    cardPrimary: 'linear-gradient(135deg, rgba(15, 23, 42, 0.05) 0%, rgba(30, 41, 59, 0.02) 100%)',
    cardSuccess: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.05) 100%)',
    cardWarning: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(252, 211, 77, 0.05) 100%)',
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
      outline: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: '#E5E7EB',
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
        color: '#1F2937',
        placeholderColor: '#6B7280',
        boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.1)',
      },
      error: {
        borderColor: '#DC2626',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        placeholderColor: '#DC2626',
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
  
  // Visual effects
  effects: {
    // Glassmorphism
    glass: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
    // Hover lift
    lift: {
      transform: 'translateY(-2px)',
      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    // Scale on hover
    scale: {
      transform: 'scale(1.02)',
      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export type Theme = typeof theme;

// Utility functions for web
export const getColor = (colorPath: string): string => {
  const keys = colorPath.split('.');
  let value: unknown = theme.colors;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
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
