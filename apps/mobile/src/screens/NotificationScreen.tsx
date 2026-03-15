/**
 * NotificationScreen Component
 *
 * Displays user notifications with filter tabs and compact card layout.
 * Airbnb-style: borderless cards, soft shadows, clean typography.
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
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { LoadingSpinner, ErrorView } from '../components/shared';
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

const ICON_COLORS: Record<string, { icon: string; bg: string }> = {
  job_update:        { icon: '#3B82F6', bg: '#DBEAFE' },
  bid_received:      { icon: '#10B981', bg: '#D1FAE5' },
  meeting_scheduled: { icon: '#8B5CF6', bg: '#EDE9FE' },
  payment_received:  { icon: '#F59E0B', bg: '#FEF3C7' },
  message_received:  { icon: '#06B6D4', bg: '#CFFAFE' },
  quote_sent:        { icon: '#EC4899', bg: '#FCE7F3' },
  system:            { icon: '#717171', bg: '#F7F7F7' },
};

const getIconName = (type: NotificationData['type']): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'job_update': return 'briefcase-outline';
    case 'bid_received': return 'cash-outline';
    case 'meeting_scheduled': return 'calendar-outline';
    case 'payment_received': return 'card-outline';
    case 'message_received': return 'chatbubble-outline';
    case 'quote_sent': return 'document-text-outline';
    case 'system': return 'information-circle-outline';
    default: return 'notifications-outline';
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

const CompactNotification: React.FC<CompactNotificationProps> = ({ notification, onPress }) => {
  const colors = ICON_COLORS[notification.type] || ICON_COLORS.system;
  return (
    <TouchableOpacity
      style={[styles.notifCard, !notification.read && styles.notifCardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${notification.read ? '' : 'Unread: '}${notification.title}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
        <Ionicons name={getIconName(notification.type)} size={20} color={colors.icon} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={[styles.notifTitle, !notification.read && styles.notifTitleUnread]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.notifTime}>{formatRelativeTime(notification.createdAt)}</Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>{notification.body}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const NotificationScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    // Support both camelCase and snake_case keys from notification payload
    const jobId = data?.jobId || data?.job_id;
    const conversationId = data?.conversationId || data?.conversation_id;
    const meetingId = data?.meetingId || data?.meeting_id;
    const senderId = data?.senderId || data?.sender_id;
    const senderName = data?.senderName || data?.sender_name;
    const jobTitle = data?.jobTitle || data?.job_title;

    switch (notification.type) {
      case 'job_update':
      case 'bid_accepted' as NotificationData['type']:
        if (jobId) {
          (navigation as any).navigate('Main', {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId } },
          });
        }
        break;
      case 'payment_received':
        if (jobId) {
          (navigation as any).navigate('Main', {
            screen: 'ProfileTab',
            params: { screen: 'PaymentHistory' },
          });
        } else {
          (navigation as any).navigate('Main', {
            screen: 'ProfileTab',
            params: { screen: 'PaymentHistory' },
          });
        }
        break;
      case 'quote_sent':
        if (jobId) {
          (navigation as any).navigate('Main', {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId } },
          });
        }
        break;
      case 'bid_received':
        if (jobId) {
          (navigation as any).navigate('Main', {
            screen: 'JobsTab',
            params: { screen: 'BidReview', params: { jobId } },
          });
        }
        break;
      case 'message_received':
        if (conversationId) {
          (navigation as any).navigate('Main', {
            screen: 'MessagingTab',
            params: {
              screen: 'Messaging',
              params: {
                conversationId,
                jobTitle: jobTitle || '',
                recipientId: senderId || '',
                recipientName: senderName || '',
              },
            },
          });
        }
        break;
      case 'meeting_scheduled':
        if (meetingId) {
          (navigation as any).navigate('Modal', {
            screen: 'MeetingDetails',
            params: { meetingId },
          });
        } else {
          (navigation as any).navigate('Main', {
            screen: 'ProfileTab',
            params: { screen: 'Calendar' },
          });
        }
        break;
      default:
        // Navigate to home for unhandled notification types
        (navigation as any).navigate('Main', { screen: 'HomeTab' });
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
    <View style={styles.container}>
      {/* Hero Header */}
      <LinearGradient
        colors={['#064E3B', '#059669', '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#10B981" />
              <Text style={styles.markAllText}>Mark All</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'unread' ? unreadCount : undefined;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={`Filter ${tab.label}${count != null && count > 0 ? `, ${count} notifications` : ''}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
                {count != null && count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={32} color="#717171" accessible={false} />
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" colors={['#10B981']} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  heroHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  heroDecor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
  },
  tabActive: {
    backgroundColor: '#222222',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#717171',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  notifCardUnread: {
    backgroundColor: '#F0FDF9',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 13,
    color: '#717171',
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 12,
    color: '#B0B0B0',
    flexShrink: 0,
  },
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
    backgroundColor: '#FFFFFF',
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
    color: '#222222',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    lineHeight: 20,
  },
});
