/**
 * Gradients Tokens
 * 
 * CSS gradient definitions for web platform.
 * These are web-specific and not applicable to mobile.
 */

export const gradients = {
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
} as const;

export type Gradients = typeof gradients;

