export const designTokens = {
  colors: {
    primary: {
      500: '#0EA5E9',
    },
    secondary: {
      50: '#ECFDF5',
      500: '#10B981',
    },
    neutral: {
      0: '#FFFFFF',
      100: '#F5F5F5',
      200: '#E5E5E5',
      900: '#171717',
    },
    success: {
      500: '#22C55E',
      600: '#16A34A',
    },
    error: {
      500: '#EF4444',
      600: '#DC2626',
    },
    warning: {
      500: '#F59E0B',
      600: '#D97706',
    },
    info: {
      500: '#3B82F6',
      600: '#2563EB',
    },
  },
  spacing: {
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
    },
    fontWeight: {
      medium: '500',
      semibold: '600',
    },
  },
  borderRadius: {
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#171717',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#171717',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
  },
  componentSizes: {
    button: {
      sm: {
        height: 32,
        paddingHorizontal: 12,
        fontSize: 14,
      },
      md: {
        height: 40,
        paddingHorizontal: 16,
        fontSize: 16,
      },
      lg: {
        height: 48,
        paddingHorizontal: 24,
        fontSize: 18,
      },
      xl: {
        height: 56,
        paddingHorizontal: 32,
        fontSize: 20,
      },
    },
    icon: {
      sm: 16,
      md: 20,
    },
  },
  accessibility: {
    minTouchTarget: {
      width: 44,
      height: 44,
    },
  },
  semanticColors: {
    interactive: {
      primary: '#0EA5E9',
      primaryDisabled: '#E5E5E5',
      secondary: '#10B981',
      secondaryDisabled: '#E5E5E5',
    },
    text: {
      primary: '#171717',
      inverse: '#FFFFFF',
      disabled: '#D4D4D4',
    },
    border: {
      primary: '#E5E5E5',
    },
  },
  zIndex: {
    toast: 1700,
  },
};