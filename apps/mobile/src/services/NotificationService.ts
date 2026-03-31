import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import * as sentry from '../config/sentry';
import * as notificationCrud from './notifications/NotificationCRUD';

import type {
  NotificationData,
  NotificationPreferences,
  QueuedNotification,
  DeepLinkParams,
  NavigationRef,
  NotificationDeepLinkData,
} from './notifications/types';

import {
  getNotificationPreferences,
  updateNotificationPreferences,
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

import {
  initializePushNotifications,
  savePushToken,
  sendPushNotification,
  sendBulkNotification,
} from './notifications/NotificationPushSender';

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
    const token = await initializePushNotifications(this.deviceOverride);
    if (token) this.expoPushToken = token;
    return token;
  }

  static savePushToken = savePushToken;
  static sendPushNotification = sendPushNotification;
  static sendBulkNotification = sendBulkNotification;

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
