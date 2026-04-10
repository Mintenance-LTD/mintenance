/**
 * MINTENANCE DESIGN TOKENS - Shadows & gradients
 */

// ============================================
// SHADOWS (Subtle Professional Elevation)
// ============================================

export const shadows = {
  none: 'none',
  subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  md: '0 8px 12px -2px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
  lg: '0 16px 24px -4px rgba(0, 0, 0, 0.1), 0 8px 12px -6px rgba(0, 0, 0, 0.08)',
  xl: '0 24px 48px -8px rgba(0, 0, 0, 0.12), 0 12px 24px -12px rgba(0, 0, 0, 0.1)',
  '2xl': '0 32px 64px -12px rgba(0, 0, 0, 0.14)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Colored shadows
  primary: '0 8px 24px -4px rgba(30, 41, 59, 0.15)',
  secondary: '0 8px 24px -4px rgba(20, 184, 166, 0.2)',
  gold: '0 8px 24px -4px rgba(245, 158, 11, 0.25)',
  success: '0 4px 12px -2px rgba(16, 185, 129, 0.2)',
  warning: '0 4px 12px -2px rgba(245, 158, 11, 0.2)',
  error: '0 4px 12px -2px rgba(239, 68, 68, 0.2)',

  // Focus shadow
  focus: '0 0 0 3px rgba(20, 184, 166, 0.1)',
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.1)',
} as const;

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  primary: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
  secondary: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  hero: 'linear-gradient(135deg, #1E293B 0%, #0F766E 100%)',
  subtle: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
  gold: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',

  // Mesh gradient (Birch-style)
  mesh: `
    radial-gradient(at 20% 30%, rgba(20, 184, 166, 0.15) 0px, transparent 50%),
    radial-gradient(at 80% 70%, rgba(30, 41, 59, 0.1) 0px, transparent 50%),
    radial-gradient(at 50% 50%, rgba(245, 158, 11, 0.08) 0px, transparent 50%)
  `,
} as const;

type Shadows = typeof shadows;
type Gradients = typeof gradients;
