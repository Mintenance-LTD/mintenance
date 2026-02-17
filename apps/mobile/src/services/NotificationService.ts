/**
 * Notification Service
 *
 * Handles push notifications, in-app notifications, and notification preferences.
 * Integrates with Expo Notifications and Firebase for cross-platform support.
 * Includes background notification handling and deep linking support.
 *
 * Sub-modules:
 * - notifications/types.ts — Type definitions
 * - notifications/NotificationPreferencesManager.ts — Preference CRUD + filtering
 * - notifications/NotificationDeepLink.ts — Deep link routing + navigation
 * - notifications/NotificationQueue.ts — Queue persistence + processing
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import * as sentry from '../config/sentry';

import type {
  NotificationData,
  NotificationPreferences,
  QueuedNotification,
  DeepLinkParams,
  NavigationRef,
  DatabaseNotificationRow,
  NotificationDeepLinkData,
} from './notifications/types';

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldSendNotification,
  getChannelId,
} from './notifications/NotificationPreferencesManager';

import {
  handleNotificationResponse as deepLinkHandleResponse,
  processLastNotificationResponse as deepLinkProcessLast,
} from './notifications/NotificationDeepLink';

import {
  queueNotification,
  processNotificationQueue,
  loadNotificationQueue,
  processQueuedNotifications,
  clearAll as clearNotificationQueue,
} from './notifications/NotificationQueue';

// Re-export types for backwards compatibility
export type { NotificationData, NotificationPreferences, QueuedNotification, DeepLinkParams };

// Configure notification behavior for foreground, background, and killed states
Notifications.setNotificationHandler({
  handleNotification: async (notification): Promise<Notifications.NotificationBehavior> => {
    const data = notification.request.content.data;
    const type = data?.type as NotificationData['type'] | undefined;
    const priority = data?.priority || 'normal';

    const shouldShowAlert = true;
    const shouldPlaySound = priority !== 'low';
    const shouldSetBadge = true;

    logger.info('Handling notification in foreground', {
      type, priority, shouldShowAlert, shouldPlaySound,
    });

    return {
      shouldShowAlert,
      shouldPlaySound,
      shouldSetBadge,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export class NotificationService {
  private static expoPushToken: string | null = null;
  private static navigationRef: NavigationRef = null;
  private static receivedListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;
  private static isInitialized: boolean = false;
  private static deviceOverride: boolean | null = null;

  private static addBreadcrumb(
    message: string,
    level: 'info' | 'warning' | 'error' | 'debug',
    data?: Record<string, unknown>
  ): void {
    const breadcrumbData = data ? { ...data, level } : { level };
    sentry.addBreadcrumb(message, 'notification', breadcrumbData);
  }

  // ─── Initialization ──────────────────────────────────────────

  static async initialize(): Promise<string | null> {
    try {
      const isDevice =
        NotificationService.deviceOverride !== null
          ? NotificationService.deviceOverride
          : Device.isDevice as boolean;

      if (!isDevice) {
        logger.warn('Push notifications only work on physical devices');
        this.addBreadcrumb('Push notifications only work on physical devices', 'warning');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Push notification permission not granted');
        this.addBreadcrumb('Push notification permission denied', 'warning');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logger.warn('EAS project ID not found in config, using fallback');
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || '671d1323-6979-465f-91db-e61471746ab3',
      });

      this.expoPushToken = token.data;
      logger.info('Push notification token obtained', { token: token.data });
      this.addBreadcrumb('Notification Service initialized', 'info', { token: token.data });

      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return token.data;
    } catch (error) {
      logger.error('Failed to initialize push notifications', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb('Failed to initialize push notifications', 'error', { error: errorMessage });
      return null;
    }
  }

  private static async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    await Notifications.setNotificationChannelAsync('job-updates', {
      name: 'Job Updates',
      description: 'Notifications about job status changes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F172A',
    });

    await Notifications.setNotificationChannelAsync('bid-notifications', {
      name: 'Bid Notifications',
      description: 'Notifications about new bids and bid updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    await Notifications.setNotificationChannelAsync('meeting-reminders', {
      name: 'Meeting Reminders',
      description: 'Reminders about upcoming meetings',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });

    this.addBreadcrumb('Android notification channels created', 'info', {
      channels: ['default', 'job-updates', 'bid-notifications', 'meeting-reminders'],
    });
  }

  // ─── Token Management ────────────────────────────────────────

  static async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      logger.info('Push token saved successfully', { userId });
      this.addBreadcrumb('Push token saved', 'info', { userId, platform: Platform.OS });
    } catch (error) {
      logger.error('Failed to save push token', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb('Failed to save push token', 'error', { userId, error: errorMessage });
      throw error;
    }
  }

  // ─── Send Notifications ──────────────────────────────────────

  static async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: unknown,
    type: NotificationData['type'] = 'system'
  ): Promise<void> {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', userId)
        .single();

      if (tokenError || !tokenData?.push_token) {
        logger.warn('No push token found for user', { userId });
        this.addBreadcrumb('No push token found for user', 'warning', { userId });
        return;
      }

      const preferences = await getNotificationPreferences(userId);
      if (!shouldSendNotification(preferences, type)) {
        logger.info('Notification blocked by user preferences', { userId, type });
        this.addBreadcrumb('Notification blocked by user preferences', 'info', { userId, type });
        return;
      }

      const messageData = data && typeof data === 'object' && !Array.isArray(data)
        ? { ...(data as Record<string, unknown>), type, userId }
        : { type, userId };

      const message = {
        to: tokenData.push_token,
        sound: 'default' as const,
        title,
        body,
        data: messageData,
        channelId: getChannelId(type),
      };

      await this.sendToExpo(message, userId);

      await this.saveNotification({ title, body, data, type, userId, priority: 'normal', read: false });

      logger.info('Push notification sent successfully', { userId, type });
      this.addBreadcrumb('Push notification sent', 'info', { userId, type, title });
    } catch (error) {
      logger.error('Failed to send push notification', error);
      throw error;
    }
  }

  private static async sendToExpo(message: unknown, userId: string): Promise<void> {
    const timeoutMs = 10000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const fetchPromise = fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Push notification request timed out')), timeoutMs);
    });

    try {
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Push notification failed: ${response.status}`);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(
        errorMessage.includes('timed out') ? 'Push notification timeout' : 'Failed to send push notification',
        'error',
        { userId, error: errorMessage }
      );
      throw error;
    }
  }

  static async sendBulkNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: unknown,
    type: NotificationData['type'] = 'system'
  ): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendPushNotification(userId, title, body, data, type)
    );
    await Promise.allSettled(promises);
  }

  // ─── Scheduling ──────────────────────────────────────────────

  static async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: unknown
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: { title, body, data: data as Record<string, unknown> | undefined, sound: 'default' },
        trigger,
      });
      logger.info('Notification scheduled', { notificationId });
      return notificationId;
    } catch (error) {
      logger.error('Failed to schedule notification', error);
      throw error;
    }
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: unknown
  ): Promise<string> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, data: data as Record<string, unknown> | undefined, sound: 'default' },
        trigger,
      });
      const triggerSeconds = (trigger as { seconds?: number }).seconds;
      this.addBreadcrumb('Local notification scheduled', 'info', {
        id, title, ...(triggerSeconds !== undefined && { triggerSeconds }),
      });
      return id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb('Failed to schedule notification', 'error', { error: errorMessage });
      throw error;
    }
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.info('Notification cancelled', { notificationId });
    } catch (error) {
      logger.error('Failed to cancel notification', error);
      throw error;
    }
  }

  static async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    this.addBreadcrumb('Scheduled notification cancelled', 'info', { id: notificationId });
  }

  // ─── Preferences (delegates to NotificationPreferencesManager) ─

  static getNotificationPreferences = getNotificationPreferences;
  static updateNotificationPreferences = updateNotificationPreferences;

  // ─── Notification CRUD ───────────────────────────────────────

  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<NotificationData[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).map((row: DatabaseNotificationRow) => ({
        id: row.id,
        title: row.title,
        body: row.message || '',
        data: row.data,
        type: row.type,
        priority: row.priority || 'normal',
        userId: row.user_id,
        createdAt: row.created_at,
        read: row.read,
      }));
    } catch (error) {
      logger.error('Failed to get user notifications', error);
      throw error;
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Failed to get unread count', error);
      return 0;
    }
  }

  private static async saveNotification(notification: Omit<NotificationData, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: notification.title,
          message: notification.body,
          data: notification.data,
          type: notification.type,
          priority: notification.priority,
          user_id: notification.userId,
          read: notification.read,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
    } catch (error) {
      logger.error('Failed to save notification', error);
      throw error;
    }
  }

  // ─── Navigation & Deep Linking ───────────────────────────────

  static setNavigationRef(navRef: NavigationRef): void {
    this.navigationRef = navRef;
    logger.info('Navigation reference set for notifications');

    processQueuedNotifications(async (response) => {
      await deepLinkHandleResponse(
        response,
        this.navigationRef,
        queueNotification,
        (id) => this.markAsRead(id)
      );
    }).catch(error => {
      logger.error('Failed to process queued notifications after navigation ready', error);
    });
  }

  // ─── Listeners ───────────────────────────────────────────────

  static setupNotificationListeners(): void {
    if (this.isInitialized) {
      logger.warn('Notification listeners already initialized');
      return;
    }

    loadNotificationQueue().catch(error => {
      logger.error('Failed to load notification queue', error);
    });

    this.receivedListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        logger.info('Notification received in foreground', {
          title: notification.request.content.title,
          type: notification.request.content.data?.type,
        });
        await queueNotification(notification);
        await this.updateBadgeCount();
      }
    );

    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data as NotificationDeepLinkData | undefined;
        logger.info('Notification response received', {
          actionIdentifier: response.actionIdentifier,
          type: data?.type,
          data,
        });

        if (data?.notificationId) {
          await this.markAsRead(data.notificationId).catch(error => {
            logger.error('Failed to mark notification as read', error);
          });
        }

        await deepLinkHandleResponse(
          response,
          this.navigationRef,
          queueNotification,
          (id) => this.markAsRead(id)
        );
        await this.updateBadgeCount();
      }
    );

    deepLinkProcessLast(
      this.navigationRef,
      queueNotification,
      (id) => this.markAsRead(id)
    ).catch(error => {
      logger.error('Failed to process last notification', error);
    });

    this.isInitialized = true;
    logger.info('Notification listeners initialized successfully');
  }

  static registerListeners(navRef: NavigationRef): void {
    this.setNavigationRef(navRef);
    this.setupNotificationListeners();
    this.addBreadcrumb('Notification listeners registered', 'info');
  }

  static cleanup(): void {
    if (this.receivedListener) {
      this.receivedListener.remove();
      this.receivedListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    this.isInitialized = false;
    logger.info('Notification listeners cleaned up');
    this.addBreadcrumb('Notification listeners cleaned up', 'info');
  }

  // ─── Queue (delegates to NotificationQueue) ──────────────────

  static queueNotification = queueNotification;
  static processNotificationQueue = processNotificationQueue;

  // ─── Badge & Cleanup ─────────────────────────────────────────

  private static async updateBadgeCount(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        await Notifications.setBadgeCountAsync(0);
        return;
      }
      const unreadCount = await this.getUnreadCount(user.id);
      await Notifications.setBadgeCountAsync(unreadCount);
      logger.info('Badge count updated', { count: unreadCount });
    } catch (error) {
      logger.error('Failed to update badge count', error);
    }
  }

  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
    this.addBreadcrumb('Badge count updated', 'debug', { count });
  }

  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
    this.addBreadcrumb('Badge cleared', 'debug');
  }

  static async clearAllNotifications(): Promise<void> {
    await clearNotificationQueue();
  }

  private static handleNotificationTap(data: unknown): void {
    logger.info('Legacy handleNotificationTap called', { data });
  }
}
