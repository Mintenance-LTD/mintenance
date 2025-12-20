/**
 * Theme extension for new UI components
 * Matches the existing Mintenance theme system
 */

import { theme } from './index';

export const newComponentsTheme = {
  colors: {
    // Use existing primary colors
    primary: theme.colors.primary, // #0F172A - Dark blue/slate
    primaryLight: theme.colors.primaryLight, // #1E293B
    primaryDark: theme.colors.primaryDark, // #020617
    
    // Use existing secondary colors
    secondary: theme.colors.secondary, // #10B981 - Emerald green
    secondaryLight: theme.colors.secondaryLight, // #34D399
    secondaryDark: theme.colors.secondaryDark, // #059669
    
    // Use existing accent
    accent: theme.colors.accent, // #F59E0B - Warm amber
    accentLight: theme.colors.accentLight, // #FCD34D
    
    // Background colors
    background: theme.colors.background, // #FFFFFF
    surface: theme.colors.surface, // #FFFFFF
    surfaceSecondary: theme.colors.surfaceSecondary, // #F8FAFC
    
    // Text colors
    textPrimary: theme.colors.textPrimary, // #1F2937
    textSecondary: theme.colors.textSecondary, // #4B5563
    textTertiary: theme.colors.textTertiary, // #6B7280
    textInverse: theme.colors.textInverse, // #FFFFFF
    
    // Border colors
    border: theme.colors.border, // #E5E7EB
    borderLight: theme.colors.borderLight, // #F3F4F6
    borderDark: theme.colors.borderDark, // #D1D5DB
    borderFocus: theme.colors.borderFocus, // #0F172A
    
    // State colors
    success: theme.colors.success, // #34C759
    error: theme.colors.error, // #FF3B30
    warning: theme.colors.warning, // #FF9500
    info: theme.colors.info, // #007AFF
    
    // Rating
    rating: theme.colors.ratingGold, // #FFD700
    
    // Special cards
    cardBackground: theme.colors.primary, // #0F172A for offer cards
  },
  
  spacing: theme.spacing,
  borderRadius: theme.borderRadius,
  typography: theme.typography,
  shadows: theme.shadows,
};

export default newComponentsTheme;
