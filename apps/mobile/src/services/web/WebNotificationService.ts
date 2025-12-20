import { logger } from '../../utils/logger';
import { addBreadcrumb, trackUserAction } from '../../config/sentry';

export interface WebPushNotificationContent {
  title: string;
  body: string;
  data?: any;
  badge?: string;
  icon?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface NotificationPermissionStatus {
  status: 'granted' | 'denied' | 'undetermined';
}

export class WebNotificationService {
  private static serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  // Request notification permissions
  static async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      if (!('Notification' in window)) {
        logger.warn('Web notifications not supported in this browser');
        return { status: 'denied' };
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      const status = permission === 'granted' ? 'granted' : 'denied';

      addBreadcrumb(
        `Web notification permission: ${status}`,
        'notification',
        'info'
      );

      trackUserAction('web_notification_permission_requested', {
        status,
        timestamp: new Date().toISOString(),
      });

      return { status };
    } catch (error) {
      logger.error('Error requesting web notification permissions:', error);
      return { status: 'denied' };
    }
  }

  // Get current permission status
  static async getPermissionsAsync(): Promise<NotificationPermissionStatus> {
    try {
      if (!('Notification' in window)) {
        return { status: 'denied' };
      }

      const permission = Notification.permission;
      const status = permission === 'granted' ? 'granted' :
                    permission === 'denied' ? 'denied' : 'undetermined';

      return { status };
    } catch (error) {
      logger.error('Error getting web notification permissions:', error);
      return { status: 'denied' };
    }
  }

  // Show local notification
  static async presentNotificationAsync(content: WebPushNotificationContent): Promise<string> {
    try {
      const permission = await this.getPermissionsAsync();

      if (permission.status !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      // Generate unique notification ID
      const notificationId = `web-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const notification = new Notification(content.title, {
        body: content.body,
        icon: content.icon || '/assets/icon.png',
        badge: content.badge || '/assets/icon.png',
        image: content.image,
        tag: content.tag || notificationId,
        requireInteraction: content.requireInteraction || false,
        data: {
          ...content.data,
          notificationId,
        },
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();

        // Handle notification click data
        if (content.data?.screen) {
          // Navigate to specific screen if specified
          window.location.hash = `#${content.data.screen}`;
        }

        trackUserAction('web_notification_clicked', {
          notificationId,
          tag: content.tag,
          timestamp: new Date().toISOString(),
        });
      };

      // Auto-close notification after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      addBreadcrumb(
        `Web notification presented: ${content.title}`,
        'notification',
        'info'
      );

      trackUserAction('web_notification_presented', {
        title: content.title,
        notificationId,
        timestamp: new Date().toISOString(),
      });

      return notificationId;
    } catch (error) {
      logger.error('Error presenting web notification:', error);
      throw error;
    }
  }

  // Send notification to user (for web, this is same as present)
  static async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      await this.presentNotificationAsync({
        title,
        body,
        data: {
          ...data,
          userId,
        },
      });

      logger.info(`Web notification sent to user ${userId}: ${title}`);
    } catch (error) {
      logger.error(`Error sending web notification to user ${userId}:`, error);
      throw error;
    }
  }

  // Cancel notification
  static async cancelNotificationAsync(notificationId: string): Promise<void> {
    try {
      // For web notifications, we can't cancel by ID directly
      // But we can close all notifications with the same tag
      if (this.serviceWorkerRegistration) {
        const notifications = await this.serviceWorkerRegistration.getNotifications({
          tag: notificationId,
        });

        notifications.forEach(notification => {
          notification.close();
        });
      }

      addBreadcrumb(
        `Web notification cancelled: ${notificationId}`,
        'notification',
        'info'
      );
    } catch (error) {
      logger.error('Error cancelling web notification:', error);
    }
  }

  // Cancel all notifications
  static async cancelAllNotificationsAsync(): Promise<void> {
    try {
      if (this.serviceWorkerRegistration) {
        const notifications = await this.serviceWorkerRegistration.getNotifications();

        notifications.forEach(notification => {
          notification.close();
        });
      }

      addBreadcrumb(
        'All web notifications cancelled',
        'notification',
        'info'
      );
    } catch (error) {
      logger.error('Error cancelling all web notifications:', error);
    }
  }

  // Initialize service worker for push notifications
  static async initializePushNotifications(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator)) {
        logger.warn('Service workers not supported in this browser');
        return;
      }

      if (!('PushManager' in window)) {
        logger.warn('Push notifications not supported in this browser');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.serviceWorkerRegistration = registration;

      addBreadcrumb(
        'Web push notifications initialized',
        'notification',
        'info'
      );

      logger.info('Web push notifications initialized successfully');
    } catch (error) {
      logger.error('Error initializing web push notifications:', error);
    }
  }

  // Schedule local notification (web implementation using setTimeout)
  static async scheduleNotificationAsync(
    content: WebPushNotificationContent,
    trigger: { seconds?: number; date?: Date }
  ): Promise<string> {
    try {
      const notificationId = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let delay = 0;

      if (trigger.seconds) {
        delay = trigger.seconds * 1000;
      } else if (trigger.date) {
        delay = trigger.date.getTime() - Date.now();
      }

      if (delay <= 0) {
        // Schedule immediately
        return await this.presentNotificationAsync(content);
      }

      // Schedule for later
      setTimeout(async () => {
        try {
          await this.presentNotificationAsync({
            ...content,
            tag: notificationId,
          });
        } catch (error) {
          logger.error('Error presenting scheduled notification:', error);
        }
      }, delay);

      addBreadcrumb(
        `Web notification scheduled for ${delay}ms: ${content.title}`,
        'notification',
        'info'
      );

      return notificationId;
    } catch (error) {
      logger.error('Error scheduling web notification:', error);
      throw error;
    }
  }
}

// Export with compatible interface for your existing NotificationService calls
export const NotificationService = {
  requestPermissions: WebNotificationService.requestPermissions.bind(WebNotificationService),
  getPermissionsAsync: WebNotificationService.getPermissionsAsync.bind(WebNotificationService),
  presentNotificationAsync: WebNotificationService.presentNotificationAsync.bind(WebNotificationService),
  sendNotificationToUser: WebNotificationService.sendNotificationToUser.bind(WebNotificationService),
  cancelNotificationAsync: WebNotificationService.cancelNotificationAsync.bind(WebNotificationService),
  cancelAllNotificationsAsync: WebNotificationService.cancelAllNotificationsAsync.bind(WebNotificationService),
  scheduleNotificationAsync: WebNotificationService.scheduleNotificationAsync.bind(WebNotificationService),
};