/**
 * MINTENANCE DESIGN TOKENS - Colors
 * Navy / Mint / Gold brand palette with WCAG AA compliant text + border colors.
 */

export const colors = {
  // PRIMARY - Navy Blue
  navy: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // PRIMARY BRAND COLOR
    900: '#0F172A',
    950: '#020617',
  },

  // SECONDARY - Mint Green
  mint: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6', // SECONDARY BRAND COLOR
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // ACCENT - Yellow/Gold
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // ACCENT COLOR
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // NEUTRALS - Professional Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // SEMANTIC COLORS
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    light: '#D1FAE5',
    DEFAULT: '#10B981',
    dark: '#047857',
  },

  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#B45309',
  },

  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#B91C1C',
  },

  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    light: '#DBEAFE',
    DEFAULT: '#3B82F6',
    dark: '#1D4ED8',
  },

  // SURFACE COLORS
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  lightBg: '#F7F9FC',
  cardBg: '#FFFFFF',
  elevatedBg: '#FFFFFF',
  overlayBg: 'rgba(15, 23, 42, 0.8)',

  // TEXT COLORS (WCAG AA Compliant)
  text: {
    primary: '#111827', // gray-900, 15.3:1 contrast
    secondary: '#4B5563', // gray-600, 7.9:1 contrast
    tertiary: '#6B7280', // gray-500, 5.2:1 contrast
    disabled: '#9CA3AF', // gray-400
    inverse: '#FFFFFF',
    link: '#1E293B', // navy-800
    linkHover: '#0F172A', // navy-900
  },

  // BORDER COLORS
  border: {
    light: '#E5E7EB', // gray-200
    default: '#D1D5DB', // gray-300
    dark: '#9CA3AF', // gray-400
    focus: '#14B8A6', // mint-500
  },
} as const;

type Colors = typeof colors;
