// ============================================================================
// THEME SYSTEM
// Dark/Light Mode Support with Theme Provider
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  semanticColors,
  componentSizes,
} from './tokens';
import { logger } from '../utils/logger';

// ============================================================================
// THEME TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

export interface Theme {
  mode: ColorScheme;
  colors: {
    // Brand colors (consistent across themes)
    primary: typeof colors.primary;
    secondary: typeof colors.secondary;

    // Semantic colors (change with theme)
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
      overlay: string;
    };

    surface: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
      disabled: string;
    };

    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      disabled: string;
      link: string;
      success: string;
      warning: string;
      error: string;
    };

    border: {
      primary: string;
      secondary: string;
      focus: string;
      error: string;
      success: string;
      warning: string;
    };

    // Status colors (slightly adjusted for theme)
    success: typeof colors.success;
    warning: typeof colors.warning;
    error: typeof colors.error;
    info: typeof colors.info;
    // Booking status semantic colors used in UI
    status?: {
      upcoming: string;
      completed: string;
      cancelled: string;
    };
  };

  // Theme-specific properties
  isDark: boolean;
  elevation: {
    sm: ViewStyle;
    md: ViewStyle;
    lg: ViewStyle;
    xl: ViewStyle;
  };
}

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

const lightTheme: Theme = {
  mode: 'light',
  isDark: false,
  colors: {
    // Brand colors
    primary: colors.primary,
    secondary: colors.secondary,

    // Backgrounds
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F8F8',
      tertiary: '#F0F0F0',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },

    // Surfaces
    surface: {
      primary: '#FFFFFF',
      secondary: '#F8F8F8',
      tertiary: '#D0D0D0',
      elevated: '#FFFFFF',
      disabled: '#F0F0F0',
    },

    // Text (pure black + neutral grays)
    text: {
      primary: '#000000',
      secondary: '#808080',
      tertiary: '#D0D0D0',
      inverse: '#FFFFFF',
      disabled: '#DDDDDD',
      link: '#10B981',
      success: colors.success[700],
      warning: colors.warning[700],
      error: colors.error[700],
    },

    // Borders
    border: {
      primary: '#D0D0D0',
      secondary: '#E0E0E0',
      focus: '#000000',
      error: colors.error[500],
      success: colors.success[500],
      warning: colors.warning[500],
    },

    // Status colors
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    status: {
      upcoming: '#E6F2FF',
      completed: '#D1FAE5',
      cancelled: '#FDECEA',
    },
  },

  elevation: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 6,
    },
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  isDark: true,
  colors: {
    // Brand colors (same as light)
    primary: colors.primary,
    secondary: colors.secondary,

    // Backgrounds (warm dark variants)
    background: {
      primary: '#181818',
      secondary: '#222222',
      tertiary: '#333333',
      elevated: '#2A2A2A',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },

    // Surfaces (warm dark)
    surface: {
      primary: '#222222',
      secondary: '#2A2A2A',
      tertiary: '#3A3A3A',
      elevated: '#333333',
      disabled: '#3A3A3A',
    },

    // Text (warm light for dark backgrounds)
    text: {
      primary: '#F5F5F5',
      secondary: '#B0B0B0',
      tertiary: '#717171',
      inverse: '#000000',
      disabled: '#555555',
      link: '#34D399',
      success: colors.success[400],
      warning: colors.warning[400],
      error: colors.error[400],
    },

    // Borders (subtle warm in dark mode)
    border: {
      primary: '#333333',
      secondary: '#444444',
      focus: '#34D399',
      error: colors.error[500],
      success: colors.success[500],
      warning: colors.warning[500],
    },

    // Status colors (adjusted for warm dark backgrounds)
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    status: {
      upcoming: '#1A2E40',
      completed: '#1A3A2A',
      cancelled: '#3A1A1A',
    },
  },

  elevation: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 6,
    },
  },
};

// ============================================================================
// THEME CONTEXT
// ============================================================================

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@mintenance_theme_mode';

// ============================================================================
// THEME PROVIDER
// ============================================================================

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorScheme>(
    Appearance.getColorScheme() || 'light'
  );

  // Calculate actual color scheme based on mode
  const colorScheme: ColorScheme = themeMode === 'system' ? systemColorScheme : themeMode;
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Load saved theme preference
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        logger.warn('Failed to load theme preference:', error);
      }
    };
    loadThemeMode();
  }, []);

  // Listen to system appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme || 'light');
    });
    return () => subscription?.remove();
  }, []);

  // Save theme preference
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      logger.warn('Failed to save theme preference:', error);
      setThemeModeState(mode); // Still update state even if save fails
    }
  };

  // Toggle between light and dark (ignores system)
  const toggleTheme = () => {
    const newMode = colorScheme === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const contextValue: ThemeContextValue = {
    theme,
    themeMode,
    colorScheme,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================================
// THEME HOOK
// ============================================================================

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================================================
// THEME UTILITIES
// ============================================================================

export const getThemeColor = (
  theme: Theme,
  colorPath: string
): string => {
  const paths = colorPath.split('.');
  let current: unknown = theme.colors;

  for (const path of paths) {
    if (current && typeof current === 'object' && path in current) {
      current = (current as Record<string, unknown>)[path];
    } else {
      logger.warn(`Theme color not found: ${colorPath}`);
      return theme.colors.text.primary;
    }
  }

  return current;
};

export const createThemedStyles = <T extends Record<string, unknown>>(
  styleCreator: (theme: Theme) => T
) => {
  return (theme: Theme) => styleCreator(theme);
};

// Export themes for direct access if needed
export { lightTheme, darkTheme };
