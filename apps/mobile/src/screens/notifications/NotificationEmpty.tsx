/**
 * NotificationEmpty Component
 *
 * Empty state displayed when no notifications match the current filter.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { FilterTab } from './notificationConfig';

interface NotificationEmptyProps {
  activeTab: FilterTab;
}

export const NotificationEmpty: React.FC<NotificationEmptyProps> = ({
  activeTab,
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name='notifications-off-outline'
          size={32}
          color={theme.colors.textSecondary}
          accessible={false}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'unread' ? 'All caught up!' : 'No notifications'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'unread'
          ? 'You have no unread notifications.'
          : 'New notifications will appear here.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
