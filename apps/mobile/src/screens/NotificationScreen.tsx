/**
 * NotificationScreen Component
 *
 * Displays user notifications with filter tabs and compact card layout.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { NotificationService, NotificationData } from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

type FilterTab = 'all' | 'unread' | 'jobs' | 'payments' | 'messages';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'payments', label: 'Payments' },
  { key: 'messages', label: 'Messages' },
];

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

const getIconName = (type: NotificationData['type']): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'job_update':
      return 'briefcase-outline';
    case 'bid_received':
      return 'cash-outline';
    case 'meeting_scheduled':
      return 'calendar-outline';
    case 'payment_received':
      return 'card-outline';
    case 'message_received':
      return 'chatbubble-outline';
    case 'quote_sent':
      return 'document-text-outline';
    case 'system':
      return 'information-circle-outline';
    default:
      return 'notifications-outline';
  }
};

const getIconColor = (type: NotificationData['type']): string => {
  switch (type) {
    case 'job_update':
    case 'bid_received':
    case 'quote_sent':
      return theme.colors.primary;
    case 'payment_received':
      return '#F59E0B';
    case 'message_received':
      return '#3B82F6';
    case 'meeting_scheduled':
      return '#8B5CF6';
    case 'system':
      return theme.colors.textSecondary;
    default:
      return theme.colors.textSecondary;
  }
};

const filterNotifications = (notifications: NotificationData[], tab: FilterTab): NotificationData[] => {
  switch (tab) {
    case 'unread':
      return notifications.filter(n => !n.read);
    case 'jobs':
      return notifications.filter(n =>
        ['job_update', 'bid_received', 'quote_sent'].includes(n.type)
      );
    case 'payments':
      return notifications.filter(n => n.type === 'payment_received');
    case 'messages':
      return notifications.filter(n =>
        ['message_received', 'meeting_scheduled'].includes(n.type)
      );
    default:
      return notifications;
  }
};

interface CompactNotificationProps {
  notification: NotificationData;
  onPress: () => void;
}

const CompactNotification: React.FC<CompactNotificationProps> = ({ notification, onPress }) => (
  <TouchableOpacity
    style={[styles.notifRow, !notification.read && styles.notifRowUnread]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${notification.read ? '' : 'Unread: '}${notification.title}`}
  >
    <View style={[styles.iconCircle, { backgroundColor: getIconColor(notification.type) + '14' }]}>
      <Ionicons name={getIconName(notification.type)} size={18} color={getIconColor(notification.type)} />
      {!notification.read && <View style={styles.unreadDot} />}
    </View>
    <View style={styles.notifContent}>
      <Text style={styles.notifTitle} numberOfLines={1}>{notification.title}</Text>
      <Text style={styles.notifBody} numberOfLines={1}>{notification.body}</Text>
    </View>
    <Text style={styles.notifTime}>{formatRelativeTime(notification.createdAt)}</Text>
  </TouchableOpacity>
);

export const NotificationScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, activeTab),
    [notifications, activeTab]
  );

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const [notificationsData, count] = await Promise.all([
        NotificationService.getUserNotifications(user.id),
        NotificationService.getUnreadCount(user.id),
      ]);
      setNotifications(notificationsData);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      logger.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    const data = notification.data as Record<string, string> | undefined;
    switch (notification.type) {
      case 'job_update':
      case 'payment_received':
      case 'quote_sent':
      case 'bid_accepted' as NotificationData['type']:
        if (data?.jobId) {
          navigation.navigate('Main', {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId: data.jobId } },
          });
        }
        break;
      case 'bid_received':
        if (data?.jobId) {
          navigation.navigate('Main', {
            screen: 'JobsTab',
            params: { screen: 'BidReview', params: { jobId: data.jobId } },
          });
        }
        break;
      case 'message_received':
        if (data?.conversationId) {
          navigation.navigate('Main', {
            screen: 'MessagingTab',
            params: {
              screen: 'Messaging',
              params: {
                conversationId: data.conversationId,
                jobTitle: data.jobTitle,
                recipientId: data.senderId,
                recipientName: data.senderName,
              },
            },
          });
        }
        break;
      case 'meeting_scheduled':
        if (data?.meetingId) {
          navigation.navigate('Modal', {
            screen: 'MeetingDetails',
            params: { meetingId: data.meetingId },
          });
        }
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    Alert.alert(
      'Mark All as Read',
      'Mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            await NotificationService.markAllAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Loading notifications..." />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadNotifications} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Notifications"
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllAsRead} accessibilityRole="button" accessibilityLabel="Mark all as read">
              <Text style={styles.markAllText}>Mark All</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'unread' ? unreadCount : undefined;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
                {count != null && count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textTertiary} accessible={false} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'unread' ? 'All caught up!' : 'No notifications'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'unread'
              ? 'You have no unread notifications.'
              : 'New notifications will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CompactNotification
              notification={item}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  // Filter tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  // Compact notification row
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    marginBottom: 6,
  },
  notifRowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.error,
  },
  notifContent: {
    flex: 1,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 1,
  },
  notifBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    minWidth: 40,
    textAlign: 'right',
  },
  // Header actions
  markAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
