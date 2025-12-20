/**
 * Notification Service
 * 
 * Handles push notifications, in-app notifications, and notification preferences.
 * Integrates with Expo Notifications and Firebase for cross-platform support.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  type: 'job_update' | 'bid_received' | 'meeting_scheduled' | 'payment_received' | 'message_received' | 'quote_sent' | 'system';
  priority: 'low' | 'normal' | 'high';
  userId: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  jobUpdates: boolean;
  bidNotifications: boolean;
  meetingReminders: boolean;
  paymentAlerts: boolean;
  messages: boolean;
  quotes: boolean;
  systemAnnouncements: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export class NotificationService {
  private static expoPushToken: string | null = null;

  /**
   * Initialize push notifications and request permissions
   */
  static async initialize(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        logger.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permission not granted');
      return null;
    }

      // Get push token using project ID from config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logger.warn('EAS project ID not found in config, using fallback');
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || '671d1323-6979-465f-91db-e61471746ab3',
      });

      this.expoPushToken = token.data;
      logger.info('Push notification token obtained', { token: token.data });

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        // Job updates channel
        await Notifications.setNotificationChannelAsync('job-updates', {
          name: 'Job Updates',
          description: 'Notifications about job status changes',
          importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0F172A',
        });

        // Bid notifications channel
        await Notifications.setNotificationChannelAsync('bid-notifications', {
          name: 'Bid Notifications',
          description: 'Notifications about new bids and bid updates',
          importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        // Meeting reminders channel
        await Notifications.setNotificationChannelAsync('meeting-reminders', {
          name: 'Meeting Reminders',
          description: 'Reminders about upcoming meetings',
          importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F59E0B',
        });
      }

      return token.data;
    } catch (error) {
      logger.error('Failed to initialize push notifications', error);
      return null;
    }
  }

  /**
   * Save push token to user profile
   */
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
    } catch (error) {
      logger.error('Failed to save push token', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific user
   */
  static async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any,
    type: NotificationData['type'] = 'system'
  ): Promise<void> {
    try {
      // Get user's push token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', userId)
        .single();

      if (tokenError || !tokenData?.push_token) {
        logger.warn('No push token found for user', { userId });
        return;
      }

      // Check user preferences
      const preferences = await this.getNotificationPreferences(userId);
      if (!this.shouldSendNotification(preferences, type)) {
        logger.info('Notification blocked by user preferences', { userId, type });
        return;
      }

      // Send notification via Expo
      const message = {
        to: tokenData.push_token,
        sound: 'default',
        title,
        body,
        data: {
          ...data,
          type,
          userId,
        },
        channelId: this.getChannelId(type),
      };

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Push notification failed: ${response.status}`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Push notification request timed out after 10 seconds');
        }
        throw error;
      }

      // Save notification to database
      await this.saveNotification({
        title,
        body,
        data,
        type,
        userId,
        priority: 'normal',
      });

      logger.info('Push notification sent successfully', { userId, type });
    } catch (error) {
      logger.error('Failed to send push notification', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBulkNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: any,
    type: NotificationData['type'] = 'system'
  ): Promise<void> {
    const promises = userIds.map(userId => 
      this.sendPushNotification(userId, title, body, data, type)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Schedule a notification for later
   */
  static async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });

      logger.info('Notification scheduled', { notificationId });
      return notificationId;
    } catch (error) {
      logger.error('Failed to schedule notification', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.info('Notification cancelled', { notificationId });
    } catch (error) {
      logger.error('Failed to cancel notification', error);
      throw error;
    }
  }

  /**
   * Get user's notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Return default preferences if none exist
      if (!data) {
        return {
          jobUpdates: true,
          bidNotifications: true,
          meetingReminders: true,
          paymentAlerts: true,
          messages: true,
          quotes: true,
          systemAnnouncements: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
        };
      }

      return data.preferences as NotificationPreferences;
    } catch (error) {
      logger.error('Failed to get notification preferences', error);
      throw error;
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      logger.info('Notification preferences updated', { userId });
    } catch (error) {
      logger.error('Failed to update notification preferences', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   */
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
      return data || [];
    } catch (error) {
      logger.error('Failed to get user notifications', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
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

  /**
   * Mark all notifications as read
   */
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

  /**
   * Get unread notification count
   */
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

  /**
   * Save notification to database
   */
  private static async saveNotification(notification: Omit<NotificationData, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: notification.title,
          body: notification.body,
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

  /**
   * Check if notification should be sent based on preferences
   */
  private static shouldSendNotification(
    preferences: NotificationPreferences,
    type: NotificationData['type']
  ): boolean {
    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = this.parseTime(preferences.quietHours.start);
      const endTime = this.parseTime(preferences.quietHours.end);

      if (startTime <= endTime) {
        // Same day quiet hours
        if (currentTime >= startTime && currentTime <= endTime) {
          return false;
        }
      } else {
        // Overnight quiet hours
        if (currentTime >= startTime || currentTime <= endTime) {
          return false;
        }
      }
    }

    // Check type-specific preferences
    switch (type) {
      case 'job_update':
        return preferences.jobUpdates;
      case 'bid_received':
        return preferences.bidNotifications;
      case 'meeting_scheduled':
        return preferences.meetingReminders;
      case 'payment_received':
        return preferences.paymentAlerts;
      case 'message_received':
        return preferences.messages;
      case 'quote_sent':
        return preferences.quotes;
      case 'system':
        return preferences.systemAnnouncements;
      default:
        return true;
    }
  }

  /**
   * Get Android channel ID for notification type
   */
  private static getChannelId(type: NotificationData['type']): string {
    switch (type) {
      case 'job_update':
        return 'job-updates';
      case 'bid_received':
        return 'bid-notifications';
      case 'meeting_scheduled':
        return 'meeting-reminders';
      default:
        return 'default';
    }
  }

  /**
   * Parse time string to minutes
   */
  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Set up notification listeners
   */
  static setupNotificationListeners(): void {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      logger.info('Notification received', { notification });
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener(response => {
      logger.info('Notification tapped', { response });
      // Handle navigation based on notification data
      this.handleNotificationTap(response.notification.request.content.data);
    });
  }

  /**
   * Handle notification tap navigation
   */
  private static handleNotificationTap(data: any): void {
    // This would integrate with navigation
    // Implementation depends on your navigation structure
    logger.info('Handling notification tap', { data });
  }
}