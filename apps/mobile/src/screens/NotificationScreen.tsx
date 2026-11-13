/**
 * NotificationScreen Component
 *
 * Thin orchestrator that composes notification sub-components.
 * Manages state and delegates rendering to extracted components.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LoadingSpinner, ErrorView } from '../components/shared';
import { goBackSafe } from '../navigation/hooks';
import {
  NotificationService,
  NotificationData,
} from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { me } from '../design-system/mint-editorial';
import { supabase } from '../config/supabase';
import {
  NotificationHeader,
  NotificationTabs,
  CompactNotification,
  NotificationEmpty,
  navigateForNotification,
  filterNotifications,
  FilterTab,
} from './notifications';

export const NotificationScreen: React.FC = () => {
  const { user } = useAuth();
  return <NotificationInbox key={user?.id || 'signed-out'} userId={user?.id} />;
};

const NotificationInbox: React.FC<{ userId?: string }> = ({ userId }) => {
  const requests = useRef({ id: 0 });
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

  const loadNotifications = useCallback(async () => {
    const request = ++requests.current.id;
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [notificationsData, count] = await Promise.all([
        NotificationService.getUserNotifications(userId),
        NotificationService.getUnreadCount(userId),
      ]);
      if (request !== requests.current.id) return;
      setNotifications(notificationsData);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      if (request !== requests.current.id) return;
      setError('Failed to load notifications');
      logger.error('Failed to load notifications', err);
    } finally {
      if (request === requests.current.id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    navigateForNotification(navigation, notification);
  };

  const handleMarkRead = (notification: NotificationData) => {
    NotificationService.markAsRead(notification.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    if (!userId) return;
    Alert.alert('Mark All as Read', 'Mark all notifications as read?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark All',
        onPress: async () => {
          await NotificationService.markAllAsRead(userId);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          setUnreadCount(0);
        },
      },
    ]);
  };

  useEffect(() => {
    const pending = requests.current;
    void loadNotifications();
    return () => {
      pending.id++;
    };
  }, [loadNotifications]);

  // Supabase Realtime — live updates for the inbox. New rows prepend,
  // read-state updates from other devices reflect in place.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!active) return;
          try {
            if (payload.eventType === 'INSERT') {
              const row = payload.new as Record<string, unknown>;
              // 2026-05-27 audit-80 P1: live data has 66 notifications
              // with no metadata but 69 carrying action_url. Previously
              // we passed the raw action_url STRING through to
              // notification.data, but the router's normalizePayload
              // does `(data ?? {}) as Record<…>` — a string is not an
              // object, so `pick('actionUrl', 'action_url', ...)`
              // returned undefined and realtime taps fell through to
              // the inbox. Wrap into the canonical { actionUrl } shape
              // (matching the REST feed's wire format) so the router
              // can deep-link.
              const rawData = row.metadata ?? row.data;
              const actionUrl = row.action_url;
              const data =
                rawData != null
                  ? rawData
                  : typeof actionUrl === 'string' && actionUrl.length > 0
                    ? { actionUrl }
                    : undefined;
              const next = {
                id: String(row.id),
                title: (row.title as string) || 'Notification',
                body: (row.message as string) || '',
                data,
                type: (row.type as NotificationData['type']) || 'system',
                priority: 'normal' as const,
                userId: String(row.user_id ?? userId),
                createdAt:
                  (row.created_at as string) || new Date().toISOString(),
                read: Boolean(row.read ?? false),
              };
              setNotifications((prev) =>
                prev.some((n) => n.id === next.id) ? prev : [next, ...prev]
              );
              if (!next.read) setUnreadCount((c) => c + 1);
            } else if (payload.eventType === 'UPDATE') {
              const row = payload.new as Record<string, unknown>;
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === String(row.id)
                    ? { ...n, read: Boolean(row.read ?? n.read) }
                    : n
                )
              );
            } else if (payload.eventType === 'DELETE') {
              const row = payload.old as Record<string, unknown>;
              setNotifications((prev) =>
                prev.filter((n) => n.id !== String(row.id))
              );
            }
          } catch (err) {
            logger.warn('Realtime notification handler failed', { err });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      channel.unsubscribe();
    };
  }, [userId]);

  if (loading) {
    return <LoadingSpinner message='Loading notifications...' />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadNotifications} />;
  }

  return (
    <View style={styles.container}>
      <NotificationHeader
        unreadCount={unreadCount}
        paddingTop={insets.top}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClose={() => goBackSafe(navigation, 'Main')}
      />
      <NotificationTabs
        activeTab={activeTab}
        unreadCount={unreadCount}
        onTabChange={setActiveTab}
      />
      {filteredNotifications.length === 0 ? (
        <NotificationEmpty activeTab={activeTab} />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CompactNotification
              notification={item}
              onPress={() => handleNotificationPress(item)}
              onMarkRead={() => handleMarkRead(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={me.brand}
              colors={[me.brand]}
            />
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
    backgroundColor: me.bg2,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
