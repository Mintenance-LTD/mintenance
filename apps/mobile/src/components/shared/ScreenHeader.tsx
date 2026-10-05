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
import { me } from '../../design-system/mint-editorial';

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: me.bg2,
          borderBottomColor: me.line,
        },
      ]}
    >
      <View style={styles.leftSection}>
        {shouldShowBack && resolvedOnBack && (
          <TouchableOpacity
            onPress={resolvedOnBack}
            style={[styles.backButton, { backgroundColor: me.bg3 }]}
            accessibilityRole='button'
            accessibilityLabel='Go back'
          >
            <Ionicons name='arrow-back' size={24} color={me.ink} />
          </TouchableOpacity>
        )}
        {leftAction}
      </View>

      <View style={styles.centerSection}>
        <Text
          style={[styles.title, { color: me.ink }]}
          numberOfLines={1}
          accessibilityRole='header'
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: me.ink2 }]} numberOfLines={1}>
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
    backgroundColor: me.bg2,
    borderBottomWidth: 0,
    borderBottomColor: me.line,
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
    backgroundColor: me.bg3,
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
    color: me.ink,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
  },
});
