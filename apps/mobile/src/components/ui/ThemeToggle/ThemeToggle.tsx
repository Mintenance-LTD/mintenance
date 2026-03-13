import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../design-system/theme';

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'switch';
  showLabel?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  variant = 'icon',
  showLabel = false,
  style,
  testID,
}) => {
  const { colorScheme, toggleTheme } = useTheme();

  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 24;
  const baseSize = size === 'sm' ? 36 : size === 'lg' ? 48 : 42;

  const getButtonStyles = (): ViewStyle => {
    const base: ViewStyle = { height: baseSize, borderRadius: baseSize / 2, justifyContent: 'center', alignItems: 'center' };
    switch (variant) {
      case 'button':
        return { ...base, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#EBEBEB', paddingHorizontal: 16 };
      case 'switch':
        return { width: 80, height: 36, borderRadius: 18, position: 'relative', justifyContent: 'center', alignItems: 'center' };
      default:
        return { ...base, width: baseSize, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#EBEBEB' };
    }
  };

  const renderContent = () => {
    const iconName = colorScheme === 'light' ? 'moon' : 'sunny';
    switch (variant) {
      case 'button':
        return (
          <View style={styles.buttonContent}>
            <Ionicons name={iconName} size={iconSize} color="#222222" />
            {showLabel && <Text style={styles.labelText}>{colorScheme === 'light' ? 'Dark Mode' : 'Light Mode'}</Text>}
          </View>
        );
      case 'switch':
        return (
          <View style={[styles.switchContainer, { backgroundColor: '#F7F7F7', borderWidth: 2, borderColor: '#EBEBEB' }]}>
            <View style={[styles.switchThumb, { left: colorScheme === 'light' ? 4 : 44, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#B0B0B0' }, styles.thumbShadow]}>
              <Ionicons name={colorScheme === 'light' ? 'sunny' : 'moon'} size={12} color={colorScheme === 'light' ? '#F59E0B' : '#3B82F6'} />
            </View>
            <Ionicons name="sunny" size={14} color={colorScheme === 'light' ? '#222222' : '#B0B0B0'} style={styles.switchIconLeft} />
            <Ionicons name="moon" size={14} color={colorScheme === 'dark' ? '#222222' : '#B0B0B0'} style={styles.switchIconRight} />
          </View>
        );
      default:
        return <Ionicons name={iconName} size={iconSize} color="#222222" />;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
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

export interface ThemeModeSelectorProps {
  style?: ViewStyle;
  testID?: string;
}

export const ThemeModeSelector: React.FC<ThemeModeSelectorProps> = ({ style, testID }) => {
  const { themeMode, setThemeMode } = useTheme();
  const modes: { key: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: 'sunny' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
    { key: 'system', label: 'System', icon: 'phone-portrait' },
  ];

  return (
    <View style={[styles.selectorContainer, style]} testID={testID}>
      <Text style={styles.selectorTitle}>Theme</Text>
      <View style={styles.selectorOptions}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[styles.selectorOption, { backgroundColor: themeMode === mode.key ? '#222222' : '#F7F7F7', borderColor: '#EBEBEB' }]}
            onPress={() => setThemeMode(mode.key)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${mode.label.toLowerCase()} theme`}
            accessibilityState={{ selected: themeMode === mode.key }}
          >
            <Ionicons name={mode.icon as keyof typeof Ionicons.glyphMap} size={20} color={themeMode === mode.key ? '#FFFFFF' : '#222222'} />
            <Text style={[styles.selectorOptionText, { color: themeMode === mode.key ? '#FFFFFF' : '#222222' }]}>{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  labelText: { fontSize: 14, fontWeight: '500', color: '#222222', marginLeft: 8 },
  switchContainer: { width: 80, height: 36, borderRadius: 18, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  switchThumb: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', position: 'absolute',
  },
  thumbShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  switchIconLeft: { position: 'absolute', left: 8 },
  switchIconRight: { position: 'absolute', right: 8 },
  selectorContainer: { padding: 16 },
  selectorTitle: { fontSize: 18, fontWeight: '600', color: '#222222', marginBottom: 12 },
  selectorOptions: { flexDirection: 'row', gap: 8 },
  selectorOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 4 },
  selectorOptionText: { fontSize: 13, fontWeight: '500' },
});

export default ThemeToggle;
