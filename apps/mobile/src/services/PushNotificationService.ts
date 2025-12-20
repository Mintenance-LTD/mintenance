/**
 * Push Notification Service - Lightweight Implementation
 *
 * Handles push notifications with proper fallbacks for test environments
 */

import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import { NotificationBehavior } from '../types';

// Conditional imports for Expo modules
let Notifications: any;
let Device: any;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch (error) {
  // Mock for test environment
  Notifications = {
    getPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
    requestPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
    scheduleNotificationAsync: () => Promise.resolve({ identifier: 'mock-id' }),
    setNotificationHandler: () => {},
    getExpoPushTokenAsync: () => Promise.resolve({ data: 'mock-token' }),
  };
  Device = { isDevice: true };
}

interface NotificationData {
  type: 'job_created' | 'job_updated' | 'bid_received' | 'bid_accepted' | 'message_received' | 'payment_received';
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface NotificationPermission {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

export class PushNotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      logger.info('Initializing push notification service');

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      this.isInitialized = true;
      logger.info('Push notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize push notification service', error);
    }
  }

  async requestPermissions(): Promise<NotificationPermission> {
    try {
      logger.info('Requesting notification permissions');

      if (!Device.isDevice) {
        logger.warn('Push notifications only work on physical devices');
        return {
          status: 'denied',
          canAskAgain: false,
        };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        return {
          status: status as 'granted' | 'denied' | 'undetermined',
          canAskAgain: status !== 'denied',
        };
      }

      return {
        status: 'granted',
        canAskAgain: true,
      };
    } catch (error) {
      logger.error('Failed to request notification permissions', error);
      return {
        status: 'denied',
        canAskAgain: false,
      };
    }
  }

  async getPushToken(): Promise<string | null> {
    try {
      if (this.pushToken) return this.pushToken;

      if (!Device.isDevice) {
        logger.warn('Push tokens only available on physical devices');
        return null;
      }

      const { status } = await this.requestPermissions();
      if (status !== 'granted') {
        logger.warn('Push notification permissions not granted');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync();
      this.pushToken = token.data;

      logger.info('Push token obtained successfully');
      return this.pushToken;
    } catch (error) {
      logger.error('Failed to get push token', error);
      return null;
    }
  }

  async sendLocalNotification(notification: NotificationData): Promise<void> {
    try {
      logger.info('Sending local notification', { type: notification.type, title: notification.title });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
        },
        trigger: null, // Send immediately
      });

      logger.info('Local notification sent successfully');
    } catch (error) {
      logger.error('Failed to send local notification', error);
    }
  }

  async scheduleNotification(
    notification: NotificationData,
    trigger: { seconds?: number; date?: Date }
  ): Promise<void> {
    try {
      logger.info('Scheduling notification', {
        type: notification.type,
        title: notification.title,
        trigger
      });

      let notificationTrigger = null;

      if (trigger.seconds) {
        notificationTrigger = { seconds: trigger.seconds };
      } else if (trigger.date) {
        notificationTrigger = { date: trigger.date };
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
        },
        trigger: notificationTrigger,
      });

      logger.info('Notification scheduled successfully');
    } catch (error) {
      logger.error('Failed to schedule notification', error);
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      logger.info('Notification cancelled', { identifier });
    } catch (error) {
      logger.error('Failed to cancel notification', error, { identifier });
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('All notifications cancelled');
    } catch (error) {
      logger.error('Failed to cancel all notifications', error);
    }
  }

  // Convenience methods for specific notification types
  async notifyJobCreated(jobTitle: string, data?: Record<string, any>): Promise<void> {
    await this.sendLocalNotification({
      type: 'job_created',
      title: 'New Job Posted',
      body: `Job "${jobTitle}" has been posted`,
      data,
    });
  }

  async notifyBidReceived(jobTitle: string, bidAmount: number, data?: Record<string, any>): Promise<void> {
    await this.sendLocalNotification({
      type: 'bid_received',
      title: 'New Bid Received',
      body: `£${bidAmount} bid received for "${jobTitle}"`,
      data,
    });
  }

  async notifyBidAccepted(jobTitle: string, data?: Record<string, any>): Promise<void> {
    await this.sendLocalNotification({
      type: 'bid_accepted',
      title: 'Bid Accepted!',
      body: `Your bid for "${jobTitle}" has been accepted`,
      data,
    });
  }

  async notifyNewMessage(senderName: string, jobTitle: string, data?: Record<string, any>): Promise<void> {
    await this.sendLocalNotification({
      type: 'message_received',
      title: `New message from ${senderName}`,
      body: `Regarding job: ${jobTitle}`,
      data,
    });
  }

  async notifyPaymentReceived(amount: number, jobTitle: string, data?: Record<string, any>): Promise<void> {
    await this.sendLocalNotification({
      type: 'payment_received',
      title: 'Payment Received',
      body: `£${amount} received for "${jobTitle}"`,
      data,
    });
  }

  // Check if notifications are enabled
  async isEnabled(): Promise<boolean> {
    try {
      const permissions = await this.requestPermissions();
      return permissions.status === 'granted';
    } catch (error) {
      logger.error('Failed to check notification permissions', error);
      return false;
    }
  }

  // Get current notification settings
  async getSettings(): Promise<{
    enabled: boolean;
    pushToken: string | null;
    permissions: NotificationPermission;
  }> {
    try {
      const permissions = await this.requestPermissions();
      const pushToken = await this.getPushToken();

      return {
        enabled: permissions.status === 'granted',
        pushToken,
        permissions,
      };
    } catch (error) {
      logger.error('Failed to get notification settings', error);
      return {
        enabled: false,
        pushToken: null,
        permissions: {
          status: 'denied',
          canAskAgain: false,
        },
      };
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;