import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

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
  const colorScheme = 'light'; // Static - dark mode not currently active
  const toggleTheme = () => {}; // No-op for now

  const iconSize = getIconSize(size);
  const buttonStyles = getButtonStyles(variant, size);
  const textStyles = getTextStyles(size);

  const renderIcon = () => {
    const iconName = colorScheme === 'light' ? 'moon' : 'sunny';
    return (
      <Ionicons
        name={iconName}
        size={iconSize}
        color={theme.colors.textPrimary}
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
          <View style={[styles.switchContainer, getSwitchStyles()]}>
            <View style={[
              styles.switchThumb,
              getSwitchThumbStyles(colorScheme),
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
              color={colorScheme === 'light' ? theme.colors.primary : theme.colors.textTertiary}
              style={styles.switchIconLeft}
            />
            <Ionicons
              name="moon"
              size={14}
              color={colorScheme === 'dark' ? theme.colors.primary : theme.colors.textTertiary}
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
  const themeMode = 'light'; // Static
  const setThemeMode = (_mode: 'light' | 'dark' | 'system') => {}; // No-op

  const modes: { key: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: 'sunny' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
    { key: 'system', label: 'System', icon: 'phone-portrait' },
  ];

  return (
    <View style={[styles.selectorContainer, style]} testID={testID}>
      <Text style={[styles.selectorTitle, { color: theme.colors.textPrimary }]}>
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
                  ? theme.colors.primary
                  : theme.colors.surfaceSecondary,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setThemeMode(mode.key)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${mode.label.toLowerCase()} theme`}
            accessibilityState={{ selected: themeMode === mode.key }}
          >
            <Ionicons
              name={mode.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={
                themeMode === mode.key
                  ? theme.colors.white
                  : theme.colors.textPrimary
              }
            />
            <Text
              style={[
                styles.selectorOptionText,
                {
                  color: themeMode === mode.key
                    ? theme.colors.white
                    : theme.colors.textPrimary,
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

const getButtonStyles = (variant: string, size: string) => {
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
        backgroundColor: theme.colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: theme.spacing[4],
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
        backgroundColor: theme.colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
  }
};

const getTextStyles = (size: string) => ({
  fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
  fontWeight: '500' as const,
  color: theme.colors.textPrimary,
  marginLeft: theme.spacing[2],
});

const getSwitchStyles = () => ({
  backgroundColor: theme.colors.surfaceSecondary,
  borderWidth: 2,
  borderColor: theme.colors.border,
});

const getSwitchThumbStyles = (colorScheme: string) => ({
  position: 'absolute' as const,
  left: colorScheme === 'light' ? 4 : 44,
  backgroundColor: theme.colors.background,
  borderWidth: 1,
  borderColor: theme.colors.borderDark,
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
    ...theme.shadows.sm,
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
    padding: theme.spacing[4],
  },

  selectorTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing[3],
  },

  selectorOptions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },

  selectorOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    gap: theme.spacing[1],
  },

  selectorOptionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default ThemeToggle;
