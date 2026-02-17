/**
 * Theme extension for new UI components
 * Matches the existing Mintenance theme system
 */

import { theme } from './index';

export const newComponentsTheme = {
  colors: {
    // Use existing primary colors
    primary: theme.colors.primary, // Emerald green
    primaryLight: theme.colors.primaryLight,
    primaryDark: theme.colors.primaryDark,

    // Use existing secondary colors
    secondary: theme.colors.secondary,
    secondaryLight: theme.colors.secondaryLight,
    secondaryDark: theme.colors.secondaryDark,

    // Use existing accent
    accent: theme.colors.accent,
    accentLight: theme.colors.accentLight,

    // Background colors
    background: theme.colors.background,
    surface: theme.colors.surface,
    surfaceSecondary: theme.colors.surfaceSecondary,

    // Text colors (warm gray scale)
    textPrimary: theme.colors.textPrimary,
    textSecondary: theme.colors.textSecondary,
    textTertiary: theme.colors.textTertiary,
    textInverse: theme.colors.textInverse,

    // Border colors (warm)
    border: theme.colors.border,
    borderLight: theme.colors.borderLight,
    borderDark: theme.colors.borderDark,
    borderFocus: theme.colors.borderFocus,

    // State colors
    success: theme.colors.success,
    error: theme.colors.error,
    warning: theme.colors.warning,
    info: theme.colors.info,

    // Rating
    rating: theme.colors.ratingGold,

    // Special cards
    cardBackground: theme.colors.primary,
  },
  
  spacing: theme.spacing,
  borderRadius: theme.borderRadius,
  typography: theme.typography,
  shadows: theme.shadows,
};

export default newComponentsTheme;
