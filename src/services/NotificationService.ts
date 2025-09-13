import * as Notifications from 'expo-notifications';
// Use runtime require so tests can toggle isDevice dynamically
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Device: any = require('expo-device');
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'job' | 'message' | 'payment' | 'reminder' | 'system';
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  jobUpdates: boolean;
  messages: boolean;
  payments: boolean;
  reminders: boolean;
  marketing: boolean;
}

export class NotificationService {
  private static pushToken: string | null = null;

  /**
   * Initialize push notifications
   */
  static async initialize(): Promise<string | null> {
    try {
      if (!Device?.isDevice) {
        return null;
      }
      // Configure notification behavior (safe-guard for tests)
      if (typeof (Notifications as any).setNotificationHandler === 'function') {
        Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
        });
      }

      // Register for push notifications
      const token = await this.registerForPushNotifications();
      this.pushToken = token;

      return token;
    } catch (error) {
      logger.error('Error initializing notifications:', error);
      return null;
    }
  }

  /**
   * Register device for push notifications
   */
  private static async registerForPushNotifications(): Promise<string | null> {
    if (!Device?.isDevice) {
      logger.warn('Push notifications only work on physical devices');
      return null;
    }

    // Check existing permissions
    const getPerms = Notifications.getPermissionsAsync;
    if (typeof getPerms !== 'function') return null;
    const { status: existingStatus } = await getPerms();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const requestPerms = Notifications.requestPermissionsAsync;
      if (typeof requestPerms !== 'function') return null;
      const { status } = await requestPerms();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permission not granted');
      return null;
    }

    // Get the push token (resolve projectId from Expo config)
    const projectId =
      (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId ||
      process.env.EXPO_PROJECT_ID; // fallback

    let tokenData: { data: string };
    const getToken = Notifications.getExpoPushTokenAsync as any;
    if (typeof getToken !== 'function') return null;
    tokenData = projectId ? await getToken({ projectId }) : await getToken();

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });

      // Create specific channels
      await Promise.all([
        Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        }),
        Notifications.setNotificationChannelAsync('jobs', {
          name: 'Job Updates',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        }),
        Notifications.setNotificationChannelAsync('payments', {
          name: 'Payments',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        }),
      ]);
    }

    return tokenData.data;
  }

  /**
   * Save push token to user profile
   */
  static async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error saving push token:', error);
    }
  }

  /**
   * Send push notification to specific user
   */
  static async sendNotificationToUser(
    userId: string,
    title: string,
    message: string,
    type: PushNotification['type'] = 'system',
    actionUrl?: string
  ): Promise<void> {
    try {
      // Get user's push token
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('push_token, notification_settings')
        .eq('id', userId)
        .single();

      if (userError || !user?.push_token) {
        logger.warn('No push token found for user:', { data: userId });
        return;
      }

      // Check notification settings
      const settings = user.notification_settings || {};
      if (!this.shouldSendNotification(type, settings)) {
        logger.debug('Notification blocked by user settings:', { data: type });
        return;
      }

      // Send via Expo push service
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.push_token,
          title,
          body: message,
          data: {
            type,
            actionUrl,
            userId,
          },
          sound: 'default',
          channelId: this.getChannelForType(type),
          priority:
            type === 'message' || type === 'payment' ? 'high' : 'normal',
        }),
      });

      const result = await response.json();

      if (result.data?.[0]?.status === 'error') {
        logger.error('Push notification error:', result.data[0].message);

        // If token is invalid, remove it from user
        if (result.data[0].details?.error === 'DeviceNotRegistered') {
          await this.removePushToken(userId);
        }
      }

      // Save notification to database
      await this.saveNotificationToDatabase(
        userId,
        title,
        message,
        type,
        actionUrl
      );
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendNotificationToUsers(
    userIds: string[],
    title: string,
    message: string,
    type: PushNotification['type'] = 'system',
    actionUrl?: string
  ): Promise<void> {
    try {
      // Get push tokens for all users
      const { data: users, error } = await supabase
        .from('users')
        .select('id, push_token, notification_settings')
        .in('id', userIds)
        .not('push_token', 'is', null);

      if (error || !users?.length) return;

      const notifications = users
        .filter((user: any) =>
          this.shouldSendNotification(type, user.notification_settings || {})
        )
        .map((user: any) => ({
          to: user.push_token,
          title,
          body: message,
          data: {
            type,
            actionUrl,
            userId: user.id,
          },
          sound: 'default',
          channelId: this.getChannelForType(type),
          priority:
            type === 'message' || type === 'payment' ? 'high' : 'normal',
        }));

      if (notifications.length === 0) return;

      // Send batch notification
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });

      const results = await response.json();

      // Handle any errors
      if (results.data) {
        results.data.forEach((result: any, index: number) => {
          if (
            result.status === 'error' &&
            result.details?.error === 'DeviceNotRegistered'
          ) {
            // Remove invalid token
            const userId = users[index].id;
            this.removePushToken(userId);
          }
        });
      }

      // Save notifications to database
      await Promise.all(
        userIds.map((userId) =>
          this.saveNotificationToDatabase(
            userId,
            title,
            message,
            type,
            actionUrl
          )
        )
      );
    } catch (error) {
      logger.error('Error sending batch push notifications:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  static async scheduleLocalNotification(
    title: string,
    message: string,
    trigger: Date | number,
    data?: any
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data,
          sound: 'default',
        },
        trigger: (typeof trigger === 'number'
          ? { seconds: trigger }
          : (trigger as any)) as any,
      });

      return identifier;
    } catch (error) {
      logger.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      logger.error('Error canceling notification:', error);
    }
  }

  /**
   * Get user's notifications from database
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PushNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map((notification: any) => ({
        id: notification.id,
        userId: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        actionUrl: notification.action_url,
        read: notification.read,
        createdAt: notification.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Update notification settings for user
   */
  static async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_settings: settings })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating notification settings:', error);
    }
  }

  /**
   * Handle notification received while app is running
   */
  static setupNotificationListener(
    onNotificationReceived: (notification: Notifications.Notification) => void
  ): () => void {
    const subscription = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );
    return () => subscription.remove();
  }

  /**
   * Handle notification tapped
   */
  static setupNotificationResponseListener(
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        onNotificationTapped
      );
    return () => subscription.remove();
  }

  /**
   * Set badge count on app icon
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logger.error('Error setting badge count:', error);
    }
  }

  /**
   * Private helper methods
   */
  private static shouldSendNotification(type: string, settings: any): boolean {
    const settingsMap = {
      job: settings.jobUpdates !== false,
      message: settings.messages !== false,
      payment: settings.payments !== false,
      reminder: settings.reminders !== false,
      system: true, // Always send system notifications
    };

    return settingsMap[type as keyof typeof settingsMap] !== false;
  }

  private static getChannelForType(type: string): string {
    const channelMap = {
      message: 'messages',
      job: 'jobs',
      payment: 'payments',
      reminder: 'default',
      system: 'default',
    };

    return channelMap[type as keyof typeof channelMap] || 'default';
  }

  private static async removePushToken(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ push_token: null })
        .eq('id', userId);
    } catch (error) {
      logger.error('Error removing push token:', error);
    }
  }

  private static async saveNotificationToDatabase(
    userId: string,
    title: string,
    message: string,
    type: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert([
        {
          user_id: userId,
          title,
          message,
          type,
          action_url: actionUrl,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      logger.error('Error saving notification to database:', error);
    }
  }

  /**
   * Quick notification methods for common use cases
   */
  static async notifyJobUpdate(
    contractorId: string,
    jobTitle: string,
    status: string
  ): Promise<void> {
    await this.sendNotificationToUser(
      contractorId,
      'Job Update',
      `Job "${jobTitle}" status changed to ${status}`,
      'job'
    );
  }

  static async notifyNewMessage(
    receiverId: string,
    senderName: string,
    jobTitle: string
  ): Promise<void> {
    await this.sendNotificationToUser(
      receiverId,
      'New Message',
      `${senderName} sent you a message about "${jobTitle}"`,
      'message'
    );
  }

  static async notifyPaymentReceived(
    contractorId: string,
    amount: number
  ): Promise<void> {
    await this.sendNotificationToUser(
      contractorId,
      'Payment Received',
      `You received $${amount.toFixed(2)} payment`,
      'payment'
    );
  }
}
