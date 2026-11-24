/**
 * NotificationEmpty Component
 *
 * Empty state displayed when no notifications match the current filter.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import { FilterTab } from './notificationConfig';

interface NotificationEmptyProps {
  activeTab: FilterTab;
  hasOlder?: boolean;
}

export const NotificationEmpty: React.FC<NotificationEmptyProps> = ({
  activeTab,
  hasOlder = false,
}) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name='notifications-off-outline'
          size={32}
          color={me.ink2}
          accessible={false}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {hasOlder
          ? 'No matches in loaded notifications'
          : activeTab === 'unread'
            ? 'All caught up!'
            : 'No notifications'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasOlder
          ? 'Load older notifications to see more.'
          : activeTab === 'unread'
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
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...me.shadow.card,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 20,
  },
});
