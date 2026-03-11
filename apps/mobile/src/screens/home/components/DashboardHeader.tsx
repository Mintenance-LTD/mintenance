/**
 * Dashboard Header Component
 *
 * Displays user greeting, profile info, and quick access buttons.
 * Focused component with single responsibility.
 *
 * @filesize Target: <100 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface DashboardHeaderProps {
  userName: string;
  userRole: 'homeowner' | 'contractor';
  onProfilePress: () => void;
  onNotificationPress: () => void;
  onSettingsPress: () => void;
  unreadNotifications?: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  userRole,
  onProfilePress,
  onNotificationPress,
  onSettingsPress,
  unreadNotifications = 0,
}) => {
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDisplayText = (): string => {
    return userRole === 'contractor' ? 'Contractor' : 'Homeowner';
  };

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onProfilePress}
          accessibilityRole='button'
          accessibilityLabel='View profile'
          accessibilityHint='Double tap to open your profile'
        >
          <View style={styles.avatarPlaceholder}>
            <Ionicons
              name="person"
              size={24}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.roleText}>{getRoleDisplayText()}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          accessibilityRole='button'
          accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
          accessibilityHint='Double tap to view notifications'
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.colors.textPrimary}
          />
          {unreadNotifications > 0 && (
            <View style={styles.badge} accessible={false}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onSettingsPress}
          accessibilityRole='button'
          accessibilityLabel='Settings'
          accessibilityHint='Double tap to open settings'
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileButton: {
    marginRight: theme.spacing[3],
  },
  avatarPlaceholder: {
    width: theme.spacing['2xl'],
    height: theme.spacing['2xl'],
    borderRadius: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: theme.typography.briefSizes.body,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.regular,
  },
  userName: {
    fontSize: theme.typography.briefSizes.title,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: theme.layout.minTouchTarget,
    height: theme.layout.minTouchTarget,
    borderRadius: 22,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: theme.spacing[5],
    height: theme.spacing[5],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});