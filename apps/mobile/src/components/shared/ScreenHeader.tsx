/**
 * ScreenHeader Component
 *
 * Reusable header component for all screens.
 * Provides consistent navigation and actions across the app.
 *
 * @filesize Target: <100 lines
 * @compliance Single Responsibility - Header UI only
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  onBackPress?: () => void;
  /** @deprecated Use onBackPress */
  onBack?: () => void;
  showBackButton?: boolean;
  /** @deprecated Use showBackButton */
  showBack?: boolean;
  rightAction?: React.ReactNode;
  /** @deprecated Use rightAction */
  rightComponent?: React.ReactNode;
  leftAction?: React.ReactNode;
  subtitle?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBackPress,
  onBack,
  showBackButton,
  showBack,
  rightAction,
  rightComponent,
  leftAction,
  subtitle,
}) => {
  const shouldShowBack = showBackButton ?? showBack ?? true;
  const resolvedOnBack = onBackPress ?? onBack;
  const resolvedRightAction = rightAction ?? rightComponent;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {shouldShowBack && resolvedOnBack && (
          <TouchableOpacity
            onPress={resolvedOnBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
        {leftAction}
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole='header'>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>{resolvedRightAction}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
  },
});
