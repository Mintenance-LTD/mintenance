/**
 * Color Tokens
 * 
 * Single source of truth for all color values used across web and mobile apps.
 * These values are extracted from the existing web app theme to ensure
 * visual consistency is maintained.
 */

export const colors = {
  // Primary Brand Colors (Deep Navy)
  primary: '#0F172A', // Deep Navy - Main brand color
  primaryLight: '#1E293B', // Lighter Navy
  primaryDark: '#020617', // Darkest Navy

  // Secondary Colors (Emerald Green)
  secondary: '#10B981', // Emerald Green - Primary Action
  secondaryLight: '#34D399',
  secondaryDark: '#059669',

  // Accent Colors (Premium Gold)
  accent: '#F59E0B', // Premium Gold - Highlights/Ratings
  accentLight: '#FCD34D',
  accentDark: '#D97706',

  // Neutral Colors - Slate Gray Scale (Cooler grays for tech feel)
  gray25: '#F8FAFC',
  gray50: '#F1F5F9',
  gray100: '#E2E8F0',
  gray200: '#CBD5E1',
  gray300: '#94A3B8',
  gray400: '#64748B',
  gray500: '#475569',
  gray600: '#334155',
  gray700: '#1E293B',
  gray800: '#0F172A',
  gray900: '#020617',

  // Semantic Colors
  success: '#10B981', // Emerald
  successLight: '#34D399',
  successDark: '#059669',

  error: '#EF4444', // Red
  errorLight: '#F87171',
  errorDark: '#DC2626',

  warning: '#F59E0B', // Amber
  warningLight: '#FBBF24',
  warningDark: '#D97706',

  info: '#3B82F6', // Blue
  infoLight: '#60A5FA',
  infoDark: '#2563EB',

  // Background Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC', // Slate 50
  backgroundTertiary: '#F1F5F9', // Slate 100
  backgroundDark: '#0F172A', // Primary Navy
  backgroundSubtle: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceTertiary: '#F1F5F9',

  // Common utility colors
  white: '#FFFFFF',
  black: '#000000',

  // Text Colors
  textPrimary: '#0F172A', // Navy 900
  textSecondary: '#475569', // Slate 500
  textTertiary: '#64748B', // Slate 400
  textQuaternary: '#94A3B8', // Slate 300
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255, 255, 255, 0.8)',

  // Legacy aliases (mapped to new values)
  text: '#0F172A',

  // Placeholder Text
  placeholder: '#94A3B8', // Slate 400

  // Border Colors
  border: '#E2E8F0', // Slate 200
  borderLight: '#F1F5F9', // Slate 100
  borderDark: '#CBD5E1', // Slate 300
  borderFocus: '#0F172A', // Primary Navy

  // Priority Colors
  priorityHigh: '#EF4444',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',
  priorityUrgent: '#DC2626',

  // Status Colors
  statusPosted: '#3B82F6', // Blue
  statusAssigned: '#F59E0B', // Amber
  statusInProgress: '#8B5CF6', // Purple
  statusCompleted: '#10B981', // Emerald
  statusCancelled: '#64748B', // Slate

  // Special purpose colors
  ratingGold: '#F59E0B', // Matches Accent

  // Category Colors (Vibrant but professional)
  plumbing: '#0EA5E9', // Sky
  electrical: '#F59E0B', // Amber
  hvac: '#10B981', // Emerald
  handyman: '#8B5CF6', // Violet
  cleaning: '#F43F5E', // Rose
  landscaping: '#22C55E', // Green
  appliance: '#EC4899', // Pink
  painting: '#F97316', // Orange
} as const;

export type Colors = typeof colors;

