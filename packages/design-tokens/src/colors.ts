/**
 * Color Tokens
 * 
 * Single source of truth for all color values used across web and mobile apps.
 * These values are extracted from the existing web app theme to ensure
 * visual consistency is maintained.
 */

export const colors = {
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

  // Neutral Colors - Gray Scale
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

  // Background Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  backgroundDark: '#1F2937',
  backgroundSubtle: '#FCFCFD',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceTertiary: '#F1F5F9',

  // Common utility colors
  white: '#FFFFFF',
  black: '#000000',

  // Text Colors (WCAG AA Compliant)
  textPrimary: '#1F2937', // 4.5:1 contrast on white
  textSecondary: '#4B5563', // 4.5:1 contrast on white
  textTertiary: '#6B7280', // 4.5:1 contrast on white
  textQuaternary: '#9CA3AF', // For less important text
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255, 255, 255, 0.8)',
  // Legacy aliases
  text: '#1F2937',

  // Placeholder Text
  placeholder: '#6B7280', // Meets WCAG AA standard

  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  borderFocus: '#0F172A', // Very dark blue for focused states

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
} as const;

export type Colors = typeof colors;

