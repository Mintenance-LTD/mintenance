// ============================================================================
// THEME SYSTEM
// Dark/Light Mode Support with Theme Provider
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './tokens';

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
  };

  // Theme-specific properties
  isDark: boolean;
  elevation: {
    sm: any;
    md: any;
    lg: any;
    xl: any;
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
      secondary: '#F8FAFC',
      tertiary: '#F1F5F9',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },

    // Surfaces
    surface: {
      primary: '#FFFFFF',
      secondary: '#F8FAFC',
      tertiary: '#E2E8F0',
      elevated: '#FFFFFF',
      disabled: '#F1F5F9',
    },

    // Text
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#64748B',
      inverse: '#FFFFFF',
      disabled: '#94A3B8',
      link: colors.primary[600],
      success: colors.success[700],
      warning: colors.warning[700],
      error: colors.error[700],
    },

    // Borders
    border: {
      primary: '#E2E8F0',
      secondary: '#CBD5E1',
      focus: colors.primary[500],
      error: colors.error[500],
      success: colors.success[500],
      warning: colors.warning[500],
    },

    // Status colors
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },

  elevation: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
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

    // Backgrounds (dark variants)
    background: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      elevated: '#1E293B',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },

    // Surfaces
    surface: {
      primary: '#1E293B',
      secondary: '#334155',
      tertiary: '#475569',
      elevated: '#334155',
      disabled: '#475569',
    },

    // Text (inverted for readability)
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      inverse: '#0F172A',
      disabled: '#64748B',
      link: colors.primary[400],
      success: colors.success[400],
      warning: colors.warning[400],
      error: colors.error[400],
    },

    // Borders (subtle in dark mode)
    border: {
      primary: '#334155',
      secondary: '#475569',
      focus: colors.primary[400],
      error: colors.error[500],
      success: colors.success[500],
      warning: colors.warning[500],
    },

    // Status colors (adjusted for dark backgrounds)
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },

  elevation: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 10,
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
        console.warn('Failed to load theme preference:', error);
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
      console.warn('Failed to save theme preference:', error);
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
  let current: any = theme.colors;

  for (const path of paths) {
    current = current?.[path];
    if (current === undefined) {
      console.warn(`Theme color not found: ${colorPath}`);
      return theme.colors.text.primary;
    }
  }

  return current;
};

export const createThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T
) => {
  return (theme: Theme) => styleCreator(theme);
};

// Export themes for direct access if needed
export { lightTheme, darkTheme };