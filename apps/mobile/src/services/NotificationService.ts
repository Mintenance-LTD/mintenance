import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import * as sentry from '../config/sentry';
import * as notificationCrud from './notifications/NotificationCRUD';

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
export type {
  NotificationData,
  NotificationPreferences,
  QueuedNotification,
  DeepLinkParams,
};

// Configure notification behavior for foreground, background, and killed states
Notifications.setNotificationHandler({
  handleNotification: async (
    notification
  ): Promise<Notifications.NotificationBehavior> => {
    const data = notification.request.content.data;
    const type = data?.type as NotificationData['type'] | undefined;
    const priority = data?.priority || 'normal';

    const shouldShowAlert = true;
    const shouldPlaySound = priority !== 'low';
    const shouldSetBadge = true;

    logger.info('Handling notification in foreground', {
      type,
      priority,
      shouldShowAlert,
      shouldPlaySound,
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

  static async initialize(): Promise<string | null> {
    try {
      const isDevice =
        NotificationService.deviceOverride !== null
          ? NotificationService.deviceOverride
          : (Device.isDevice as boolean);

      if (!isDevice) {
        logger.warn('Push notifications only work on physical devices');
        this.addBreadcrumb(
          'Push notifications only work on physical devices',
          'warning'
        );
        return null;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
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

      // On Android, attempt to get the native FCM device token first.
      // This confirms that google-services.json is loaded and Firebase is initialized.
      if (Platform.OS === 'android') {
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          logger.info('FCM device token obtained', { type: deviceToken.type });
          this.addBreadcrumb('FCM device token obtained', 'info', {
            type: deviceToken.type,
          });
        } catch (fcmError) {
          const fcmMsg =
            fcmError instanceof Error ? fcmError.message : String(fcmError);
          // Non-fatal: Expo Push still works via Expo's FCM sender key as fallback
          logger.warn(
            'FCM device token unavailable — using Expo push fallback',
            { error: fcmMsg }
          );
          this.addBreadcrumb(
            'FCM device token unavailable (Expo fallback)',
            'warning',
            { error: fcmMsg }
          );
        }
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logger.warn('EAS project ID not found in config, using fallback');
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || '671d1323-6979-465f-91db-e61471746ab3',
      });

      this.expoPushToken = token.data;
      logger.info('Expo push token obtained', { token: token.data });
      this.addBreadcrumb('Notification Service initialized', 'info', {
        token: token.data,
      });

      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return token.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isFirebaseError =
        errorMessage.includes('Firebase') ||
        errorMessage.includes('FCM') ||
        errorMessage.includes('FirebaseApp') ||
        errorMessage.includes('not initialized');

      if (isFirebaseError) {
        logger.warn(
          'Push notifications unavailable — Firebase/FCM not configured. ' +
            'Ensure google-services.json is provided via EAS Secrets for production builds.',
          { error: errorMessage }
        );
        this.addBreadcrumb(
          'Push notifications unavailable (no FCM config)',
          'warning',
          { error: errorMessage }
        );
      } else {
        logger.error('Failed to initialize push notifications', error);
        this.addBreadcrumb('Failed to initialize push notifications', 'error', {
          error: errorMessage,
        });
      }
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

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Direct messages between homeowners and contractors',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payments',
      description: 'Payment confirmations and escrow updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    this.addBreadcrumb('Android notification channels created', 'info', {
      channels: [
        'default',
        'job-updates',
        'bid-notifications',
        'meeting-reminders',
        'messages',
        'payments',
      ],
    });
  }

  static async savePushToken(userId: string, token: string): Promise<void> {
    try {
      await mobileApiClient.post('/api/notifications', {
        action: 'save_push_token',
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
      });

      logger.info('Push token saved successfully', { userId });
      this.addBreadcrumb('Push token saved', 'info', {
        userId,
        platform: Platform.OS,
      });
    } catch (error) {
      logger.error('Failed to save push token', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addBreadcrumb('Failed to save push token', 'error', {
        userId,
        error: errorMessage,
      });
      throw error;
    }
  }

  static async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: unknown,
    type: NotificationData['type'] = 'system'
  ): Promise<void> {
    try {
      let pushToken: string | null = null;
      try {
        const tokenResponse = await mobileApiClient.get<{ token?: string; push_token?: string }>(
          `/api/notifications?action=get_push_token&user_id=${encodeURIComponent(userId)}`
        );
        pushToken = tokenResponse.push_token ?? tokenResponse.token ?? null;
      } catch {
        // Token fetch failed
      }

      if (!pushToken) {
        logger.warn('No push token found for user', { userId });
        this.addBreadcrumb('No push token found for user', 'warning', {
          userId,
        });
        return;
      }

      const preferences = await getNotificationPreferences(userId);
      if (!shouldSendNotification(preferences, type)) {
        logger.info('Notification blocked by user preferences', {
          userId,
          type,
        });
        this.addBreadcrumb('Notification blocked by user preferences', 'info', {
          userId,
          type,
        });
        return;
      }

      const messageData =
        data && typeof data === 'object' && !Array.isArray(data)
          ? { ...(data as Record<string, unknown>), type, userId }
          : { type, userId };

      const message = {
        to: pushToken,
        sound: 'default' as const,
        title,
        body,
        data: messageData,
        channelId: getChannelId(type),
      };

      await this.sendToExpo(message, userId);

      await this.saveNotification({
        title,
        body,
        data,
        type,
        userId,
        priority: 'normal',
        read: false,
      });

      logger.info('Push notification sent successfully', { userId, type });
      this.addBreadcrumb('Push notification sent', 'info', {
        userId,
        type,
        title,
      });
    } catch (error) {
      logger.error('Failed to send push notification', error);
      throw error;
    }
  }

  private static async sendToExpo(
    message: unknown,
    userId: string
  ): Promise<void> {
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
      timeoutId = setTimeout(
        () => reject(new Error('Push notification request timed out')),
        timeoutMs
      );
    });

    try {
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      if (!response.ok)
        throw new Error(`Push notification failed: ${response.status}`);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(
        errorMessage.includes('timed out')
          ? 'Push notification timeout'
          : 'Failed to send push notification',
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
    const promises = userIds.map((userId) =>
      this.sendPushNotification(userId, title, body, data, type)
    );
    await Promise.allSettled(promises);
  }

  static async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: unknown
  ): Promise<string> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as Record<string, unknown> | undefined,
          sound: 'default',
        },
        trigger,
      });
      this.addBreadcrumb('Notification scheduled', 'info', { id, title });
      return id;
    } catch (error) {
      logger.error('Failed to schedule notification', error);
      throw error;
    }
  }

  /** Alias for scheduleNotification (backward compat). */
  static scheduleLocalNotification = this.scheduleNotification;

  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    this.addBreadcrumb('Notification cancelled', 'info', {
      id: notificationId,
    });
  }

  /** Alias for cancelNotification (backward compat). */
  static cancelScheduledNotification = this.cancelNotification;

  static getNotificationPreferences = getNotificationPreferences;
  static updateNotificationPreferences = updateNotificationPreferences;

  static getUserNotifications = notificationCrud.getUserNotifications;
  static markAsRead = notificationCrud.markAsRead;
  static markAllAsRead = notificationCrud.markAllAsRead;
  static getUnreadCount = notificationCrud.getUnreadCount;
  private static saveNotification = notificationCrud.saveNotification;

  static setNavigationRef(navRef: NavigationRef): void {
    this.navigationRef = navRef;
    processQueuedNotifications(async (response) => {
      await deepLinkHandleResponse(
        response,
        this.navigationRef,
        queueNotification,
        (id) => this.markAsRead(id)
      );
    }).catch((error) => {
      logger.error(
        'Failed to process queued notifications after navigation ready',
        error
      );
    });
  }

  static setupNotificationListeners(): void {
    if (this.isInitialized) return;
    loadNotificationQueue().catch((e) =>
      logger.error('Failed to load notification queue', e)
    );
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

    this.responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data as
            | NotificationDeepLinkData
            | undefined;
          logger.info('Notification response received', {
            actionIdentifier: response.actionIdentifier,
            type: data?.type,
            data,
          });

          if (data?.notificationId) {
            await this.markAsRead(data.notificationId).catch((error) => {
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

    deepLinkProcessLast(this.navigationRef, queueNotification, (id) =>
      this.markAsRead(id)
    ).catch((error) => {
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

  static queueNotification = queueNotification;
  static processNotificationQueue = processNotificationQueue;

  private static async updateBadgeCount(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
