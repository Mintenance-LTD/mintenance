// Centralized Theme System for Mintenance App
import { PixelRatio, Dimensions } from 'react-native';

// Dynamic text scaling utilities
const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Base width for iPhone 11

// Normalize font sizes with maximum scaling limits for accessibility
const normalize = (size: number, maxScale: number = 1.3): number => {
  const newSize = size * scale;
  const fontScale = PixelRatio.getFontScale();
  const scaledSize = newSize * Math.min(fontScale, maxScale);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

// Text scaling hook for dynamic accessibility
export const useAccessibleFontSize = (baseFontSize: number, maxScale: number = 1.3) => {
  return normalize(baseFontSize, maxScale);
};

export const theme = {
  // Color Palette
  colors: {
    // Primary Brand Colors (Updated to darker blues)
    primary: '#0F172A',        // Very dark blue/slate - navy blue
    primaryLight: '#1E293B',   // Lighter but still dark blue
    primaryDark: '#020617',    // Darkest blue for pressed states
    
    // Secondary Colors (Updated to mint green)
    secondary: '#4ECDC4',      // Mint green - fresh and modern
    secondaryLight: '#7FDDD4', // Lighter mint for secondary elements
    secondaryDark: '#26A69A',  // Darker mint for pressed states
    
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
    background: '#FFFFFF',     // Pure white background as specified
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#F1F5F9',
    
    // Text Colors (WCAG AA Compliant)
    textPrimary: '#1F2937',    // 4.5:1 contrast on white
    textSecondary: '#4B5563',  // 4.5:1 contrast on white
    textTertiary: '#6B7280',   // 4.5:1 contrast on white (was #8E8E93 - failed)
    textQuaternary: '#9CA3AF', // For less important text, still passes AA
    textInverse: '#FFFFFF',
    
    // Placeholder Text (WCAG Compliant)
    placeholder: '#6B7280',    // Meets WCAG AA standard (4.5:1)
    
    // Border Colors (Enhanced contrast)
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderDark: '#D1D5DB',
    borderFocus: '#0F172A',   // Very dark blue for focused states
    
    // Priority Colors
    priorityHigh: '#FF3B30',
    priorityMedium: '#FF9500',
    priorityLow: '#34C759',
    
    // Status Colors
    statusPosted: '#007AFF',
    statusAssigned: '#FF9500', 
    statusInProgress: '#FF9500',
    statusCompleted: '#34C759',
    statusCancelled: '#8E8E93',
    
    // Category Colors
    plumbing: '#007AFF',
    electrical: '#FF9500',
    hvac: '#34C759',
    handyman: '#8E8E93',
    cleaning: '#FF3B30',
    landscaping: '#34C759',
  },

  // Typography
  typography: {
    // Font Families
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    
    // Font Weights
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    
    // Font Sizes (with dynamic scaling support)
    fontSize: {
      xs: normalize(10),
      sm: normalize(12),
      base: normalize(14),
      lg: normalize(16),
      xl: normalize(18),
      '2xl': normalize(20),
      '3xl': normalize(24),
      '4xl': normalize(32),
      '5xl': normalize(48),
    },
    
    // Raw font sizes for custom scaling
    rawFontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      '2xl': 20,
      '3xl': 24,
      '4xl': 32,
      '5xl': 48,
    },
    
    // Accessibility font sizes (larger scaling)
    accessibleFontSize: {
      xs: normalize(10, 1.5),
      sm: normalize(12, 1.5),
      base: normalize(14, 1.5),
      lg: normalize(16, 1.5),
      xl: normalize(18, 1.5),
      '2xl': normalize(20, 1.5),
      '3xl': normalize(24, 1.5),
      '4xl': normalize(32, 1.5),
      '5xl': normalize(48, 1.5),
    },
    
    // Line Heights
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },
  },

  // Spacing System (4px base unit)
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },

  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    base: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 8.3,
      elevation: 12,
    },
  },

  // Component Variants
  components: {
    // Button Variants
    button: {
      primary: {
        backgroundColor: '#0F172A',  // Very dark blue primary
        color: '#FFFFFF',
        borderColor: '#0F172A',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: '#0F172A',
      },
      success: {
        backgroundColor: '#4ECDC4',  // Mint green accent
        color: '#FFFFFF',
        borderColor: '#4ECDC4',
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
    
    // Card Variants (Rounded cards)
    card: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 16,          // Rounded cards
      },
      elevated: {
        backgroundColor: '#FFFFFF',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        borderRadius: 16,
      },
    },
    
    // Input Variants (WCAG Compliant)
    input: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        color: '#1F2937',           // High contrast text
        placeholderTextColor: '#6B7280', // WCAG AA compliant placeholder
      },
      focused: {
        borderColor: '#0F172A',    // Very dark blue focus
        backgroundColor: '#FFFFFF',
        shadowColor: '#0F172A',
        shadowOpacity: 0.1,
      },
      error: {
        borderColor: '#DC2626',    // Higher contrast red
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
      },
    },
  },

  // Layout Constants
  layout: {
    // Screen Padding
    screenPadding: 16,
    cardPadding: 16,
    sectionSpacing: 24,
    
    // Common Dimensions (Platform-specific and accessible)
    buttonHeight: 44,          // Minimum touch target
    buttonHeightLarge: 48,     // Preferred touch target
    inputHeight: 44,           // Minimum touch target
    inputHeightLarge: 48,      // Preferred touch target
    headerHeight: 56,
    tabBarHeight: {
      ios: 83,                 // iOS specific (49px + 34px safe area)
      android: 56,             // Android specific
    },
    minTouchTarget: 44,        // WCAG minimum touch target
    
    // Breakpoints (for responsive design)
    breakpoints: {
      sm: 375,
      md: 768,
      lg: 1024,
    },
  },

  // Animation Timings
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      linear: 'linear' as const,
      ease: 'ease' as const,
      easeIn: 'ease-in' as const,
      easeOut: 'ease-out' as const,
      easeInOut: 'ease-in-out' as const,
    },
  },
};

// Theme Type for TypeScript
export type Theme = typeof theme;

// Utility functions for theme usage
export const getColor = (colorPath: string) => {
  const keys = colorPath.split('.');
  let value: any = theme.colors;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return typeof value === 'string' ? value : undefined;
};

export const getSpacing = (size: keyof typeof theme.spacing) => {
  return theme.spacing[size];
};

export const getFontSize = (size: keyof typeof theme.typography.fontSize) => {
  return theme.typography.fontSize[size];
};

// Dynamic font size with accessibility scaling
export const getAccessibleFontSize = (size: keyof typeof theme.typography.rawFontSize, maxScale: number = 1.3) => {
  return normalize(theme.typography.rawFontSize[size], maxScale);
};

// Responsive font scaling utility
export const scaledFontSize = (size: number, maxScale: number = 1.3): number => {
  return normalize(size, maxScale);
};

export const getShadow = (size: keyof typeof theme.shadows) => {
  return theme.shadows[size];
};

// Status color helper
export const getStatusColor = (status: string) => {
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
export const getPriorityColor = (priority: string) => {
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

// Category color helper
export const getCategoryColor = (category: string) => {
  const categoryKey = category.toLowerCase().replace(/\s+/g, '') as keyof typeof theme.colors;
  return (theme.colors as any)[categoryKey] || theme.colors.textSecondary;
};

export default theme;