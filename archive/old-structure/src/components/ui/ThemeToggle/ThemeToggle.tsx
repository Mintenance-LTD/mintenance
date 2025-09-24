import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design-system/theme';
import { designTokens } from '../../../design-system/tokens';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'switch';
  showLabel?: boolean;
  style?: ViewStyle;
  testID?: string;
}

// ============================================================================
// THEME TOGGLE COMPONENT
// ============================================================================

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  variant = 'icon',
  showLabel = false,
  style,
  testID,
}) => {
  const { theme, colorScheme, toggleTheme } = useTheme();

  const iconSize = getIconSize(size);
  const buttonStyles = getButtonStyles(theme, variant, size);
  const textStyles = getTextStyles(theme, size);

  const renderIcon = () => {
    const iconName = colorScheme === 'light' ? 'moon' : 'sunny';
    return (
      <Ionicons
        name={iconName}
        size={iconSize}
        color={theme.colors.text.primary}
      />
    );
  };

  const renderContent = () => {
    switch (variant) {
      case 'button':
        return (
          <View style={styles.buttonContent}>
            {renderIcon()}
            {showLabel && (
              <Text style={textStyles}>
                {colorScheme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </Text>
            )}
          </View>
        );

      case 'switch':
        return (
          <View style={[styles.switchContainer, getSwitchStyles(theme)]}>
            <View style={[
              styles.switchThumb,
              getSwitchThumbStyles(theme, colorScheme),
            ]}>
              <Ionicons
                name={colorScheme === 'light' ? 'sunny' : 'moon'}
                size={12}
                color={colorScheme === 'light' ? '#FFA500' : '#4A90E2'}
              />
            </View>
            <Ionicons
              name="sunny"
              size={14}
              color={colorScheme === 'light' ? theme.colors.primary[500] : theme.colors.text.tertiary}
              style={styles.switchIconLeft}
            />
            <Ionicons
              name="moon"
              size={14}
              color={colorScheme === 'dark' ? theme.colors.primary[500] : theme.colors.text.tertiary}
              style={styles.switchIconRight}
            />
          </View>
        );

      case 'icon':
      default:
        return renderIcon();
    }
  };

  return (
    <TouchableOpacity
      style={[buttonStyles, style]}
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${colorScheme === 'light' ? 'dark' : 'light'} mode`}
      accessibilityHint="Toggles between light and dark theme"
      testID={testID}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

// ============================================================================
// THEME MODE SELECTOR
// ============================================================================

export interface ThemeModeSelectorProps {
  style?: ViewStyle;
  testID?: string;
}

export const ThemeModeSelector: React.FC<ThemeModeSelectorProps> = ({
  style,
  testID,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();

  const modes: { key: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: 'sunny' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
    { key: 'system', label: 'System', icon: 'phone-portrait' },
  ];

  return (
    <View style={[styles.selectorContainer, style]} testID={testID}>
      <Text style={[styles.selectorTitle, { color: theme.colors.text.primary }]}>
        Theme
      </Text>
      <View style={styles.selectorOptions}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.selectorOption,
              {
                backgroundColor: themeMode === mode.key
                  ? theme.colors.primary[500]
                  : theme.colors.surface.secondary,
                borderColor: theme.colors.border.primary,
              },
            ]}
            onPress={() => setThemeMode(mode.key)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${mode.label.toLowerCase()} theme`}
            accessibilityState={{ selected: themeMode === mode.key }}
          >
            <Ionicons
              name={mode.icon as any}
              size={20}
              color={
                themeMode === mode.key
                  ? theme.colors.text.inverse
                  : theme.colors.text.primary
              }
            />
            <Text
              style={[
                styles.selectorOptionText,
                {
                  color: themeMode === mode.key
                    ? theme.colors.text.inverse
                    : theme.colors.text.primary,
                },
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// STYLE FUNCTIONS
// ============================================================================

const getIconSize = (size: 'sm' | 'md' | 'lg'): number => {
  switch (size) {
    case 'sm':
      return 18;
    case 'lg':
      return 28;
    case 'md':
    default:
      return 24;
  }
};

const getButtonStyles = (theme: any, variant: string, size: string) => {
  const baseSize = size === 'sm' ? 36 : size === 'lg' ? 48 : 42;

  const baseStyle = {
    width: variant === 'icon' ? baseSize : undefined,
    height: baseSize,
    borderRadius: baseSize / 2,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  switch (variant) {
    case 'button':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        paddingHorizontal: designTokens.spacing[4],
        width: undefined,
      };

    case 'switch':
      return {
        width: 80,
        height: 36,
        borderRadius: 18,
        position: 'relative' as const,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      };

    case 'icon':
    default:
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
      };
  }
};

const getTextStyles = (theme: any, size: string) => ({
  fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
  fontWeight: '500' as const,
  color: theme.colors.text.primary,
  marginLeft: designTokens.spacing[2],
});

const getSwitchStyles = (theme: any) => ({
  backgroundColor: theme.colors.surface.secondary,
  borderWidth: 2,
  borderColor: theme.colors.border.primary,
});

const getSwitchThumbStyles = (theme: any, colorScheme: string) => ({
  position: 'absolute' as const,
  left: colorScheme === 'light' ? 4 : 44,
  backgroundColor: theme.colors.background.primary,
  borderWidth: 1,
  borderColor: theme.colors.border.secondary,
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  switchContainer: {
    width: 80,
    height: 36,
    borderRadius: 18,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...designTokens.shadows.sm,
  },

  switchIconLeft: {
    position: 'absolute',
    left: 8,
  },

  switchIconRight: {
    position: 'absolute',
    right: 8,
  },

  selectorContainer: {
    padding: designTokens.spacing[4],
  },

  selectorTitle: {
    fontSize: designTokens.typography.fontSize.lg,
    fontWeight: designTokens.typography.fontWeight.semibold,
    marginBottom: designTokens.spacing[3],
  },

  selectorOptions: {
    flexDirection: 'row',
    gap: designTokens.spacing[2],
  },

  selectorOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing[3],
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    gap: designTokens.spacing[1],
  },

  selectorOptionText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: designTokens.typography.fontWeight.medium,
  },
});

export default ThemeToggle;