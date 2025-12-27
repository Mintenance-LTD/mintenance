/**
 * Notification Service
 *
 * Handles push notifications, in-app notifications, and notification preferences.
 * Integrates with Expo Notifications and Firebase for cross-platform support.
 * Includes background notification handling and deep linking support.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

// Storage keys for notification queue
const NOTIFICATION_QUEUE_KEY = '@mintenance/notification_queue';
const LAST_NOTIFICATION_ID_KEY = '@mintenance/last_notification_id';

// Configure notification behavior for foreground, background, and killed states
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const type = data?.type as NotificationData['type'] | undefined;
    const priority = data?.priority || 'normal';

    // Determine notification behavior based on type and priority
    let shouldShowAlert = true;
    let shouldPlaySound = true;
    let shouldSetBadge = true;

    // Quiet notifications for low priority items
    if (priority === 'low') {
      shouldPlaySound = false;
    }

    // Always update badge count
    shouldSetBadge = true;

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
    };
  },
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

export interface QueuedNotification {
  id: string;
  notification: Notifications.Notification;
  receivedAt: string;
  processed: boolean;
}

export interface DeepLinkParams {
  screen: string;
  params?: Record<string, any>;
}

// Type for navigation reference (set externally)
type NavigationRef = {
  navigate: (screen: string, params?: any) => void;
  reset: (state: any) => void;
  isReady: () => boolean;
} | null;

export class NotificationService {
  private static expoPushToken: string | null = null;
  private static navigationRef: NavigationRef = null;
  private static notificationQueue: QueuedNotification[] = [];
  private static receivedListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;
  private static isInitialized: boolean = false;

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
        read: false,
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
   * Set navigation reference for deep linking
   */
  static setNavigationRef(navRef: NavigationRef): void {
    this.navigationRef = navRef;
    logger.info('Navigation reference set for notifications');

    // BUGFIX: Process any queued notifications that were waiting for navigation
    this.processQueuedNotifications().catch(error => {
      logger.error('Failed to process queued notifications after navigation ready', error);
    });
  }

  /**
   * Process queued notifications
   */
  private static async processQueuedNotifications(): Promise<void> {
    try {
      const queuedNotifications = await this.getQueuedNotifications();

      if (queuedNotifications.length === 0) {
        return;
      }

      logger.info(`Processing ${queuedNotifications.length} queued notifications`);

      for (const notification of queuedNotifications) {
        try {
          // Create a response object compatible with handleNotificationResponse
          const response = {
            notification,
            actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
          };

          await this.handleNotificationResponse(response);
        } catch (error) {
          logger.error('Failed to process queued notification', error);
        }
      }

      // Clear the queue after processing
      await AsyncStorage.removeItem(this.NOTIFICATION_QUEUE_KEY);
    } catch (error) {
      logger.error('Failed to process notification queue', error);
    }
  }

  /**
   * Set up notification listeners for foreground, background, and killed states
   */
  static setupNotificationListeners(): void {
    if (this.isInitialized) {
      logger.warn('Notification listeners already initialized');
      return;
    }

    // Load queued notifications from previous sessions
    this.loadNotificationQueue().catch(error => {
      logger.error('Failed to load notification queue', error);
    });

    // Handle notification received while app is in foreground
    this.receivedListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        logger.info('Notification received in foreground', {
          title: notification.request.content.title,
          type: notification.request.content.data?.type,
        });

        // Queue notification for processing
        await this.queueNotification(notification);

        // Update badge count
        await this.updateBadgeCount();
      }
    );

    // Handle notification response (user tapped notification)
    // Works when app is in foreground, background, or killed state
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const notification = response.notification;
        const data = notification.request.content.data;

        logger.info('Notification response received', {
          actionIdentifier: response.actionIdentifier,
          type: data?.type,
          data,
        });

        // Mark as read
        if (data?.notificationId) {
          await this.markAsRead(data.notificationId).catch(error => {
            logger.error('Failed to mark notification as read', error);
          });
        }

        // Handle the tap with deep linking
        await this.handleNotificationResponse(response);

        // Update badge count after handling
        await this.updateBadgeCount();
      }
    );

    // Process any notifications that came while app was killed
    this.processLastNotificationResponse().catch(error => {
      logger.error('Failed to process last notification', error);
    });

    this.isInitialized = true;
    logger.info('Notification listeners initialized successfully');
  }

  /**
   * Clean up notification listeners
   */
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
  }

  /**
   * Handle notification response and deep link to appropriate screen
   */
  private static async handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): Promise<void> {
    const data = response.notification.request.content.data;
    const type = data?.type as NotificationData['type'];

    logger.info('Processing notification tap', { type, data });

    // Wait for navigation to be ready
    if (!this.navigationRef) {
      logger.warn('Navigation not ready, queuing notification for later processing');
      await this.queueNotification(response.notification);
      return;
    }

    if (!this.navigationRef.isReady()) {
      logger.warn('Navigation not ready, waiting...');
      // Wait up to 3 seconds for navigation to be ready
      await this.waitForNavigation(3000);
    }

    // Get deep link params based on notification type
    const deepLinkParams = this.getDeepLinkParams(type, data);

    if (!deepLinkParams) {
      logger.warn('No deep link configured for notification type', { type });
      return;
    }

    // Navigate to the appropriate screen
    try {
      this.navigationRef.navigate(deepLinkParams.screen, deepLinkParams.params);
      logger.info('Navigated to screen', deepLinkParams);
    } catch (error) {
      logger.error('Navigation failed', error);
    }
  }

  /**
   * Get deep link parameters based on notification type and data
   */
  private static getDeepLinkParams(
    type: NotificationData['type'],
    data: any
  ): DeepLinkParams | null {
    switch (type) {
      case 'job_update':
        if (data?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: data.jobId },
              },
            },
          };
        }
        break;

      case 'bid_received':
        if (data?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: data.jobId },
              },
            },
          };
        }
        break;

      case 'message_received':
        if (data?.conversationId) {
          return {
            screen: 'Main',
            params: {
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
            },
          };
        }
        break;

      case 'meeting_scheduled':
        if (data?.meetingId) {
          return {
            screen: 'Modal',
            params: {
              screen: 'MeetingDetails',
              params: { meetingId: data.meetingId },
            },
          };
        }
        break;

      case 'payment_received':
        if (data?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: data.jobId },
              },
            },
          };
        }
        break;

      case 'quote_sent':
        if (data?.quoteId || data?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: data.jobId },
              },
            },
          };
        }
        break;

      case 'system':
        // System notifications go to home by default
        return {
          screen: 'Main',
          params: { screen: 'HomeTab' },
        };

      default:
        logger.warn('Unknown notification type', { type });
        return null;
    }

    return null;
  }

  /**
   * Queue notification for later processing
   */
  private static async queueNotification(
    notification: Notifications.Notification
  ): Promise<void> {
    try {
      const queuedNotification: QueuedNotification = {
        id: notification.request.identifier,
        notification,
        receivedAt: new Date().toISOString(),
        processed: false,
      };

      this.notificationQueue.push(queuedNotification);

      // Persist to storage
      await AsyncStorage.setItem(
        NOTIFICATION_QUEUE_KEY,
        JSON.stringify(this.notificationQueue)
      );

      // Keep last notification ID for processing on app restart
      await AsyncStorage.setItem(
        LAST_NOTIFICATION_ID_KEY,
        notification.request.identifier
      );

      logger.info('Notification queued', {
        id: queuedNotification.id,
        queueLength: this.notificationQueue.length,
      });
    } catch (error) {
      logger.error('Failed to queue notification', error);
    }
  }

  /**
   * Load notification queue from storage
   */
  private static async loadNotificationQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(NOTIFICATION_QUEUE_KEY);

      if (queueData) {
        this.notificationQueue = JSON.parse(queueData);
        logger.info('Loaded notification queue', {
          count: this.notificationQueue.length,
        });

        // Process unprocessed notifications
        await this.processQueue();
      }
    } catch (error) {
      logger.error('Failed to load notification queue', error);
    }
  }

  /**
   * Process queued notifications
   */
  private static async processQueue(): Promise<void> {
    const unprocessed = this.notificationQueue.filter(q => !q.processed);

    if (unprocessed.length === 0) {
      return;
    }

    logger.info('Processing queued notifications', { count: unprocessed.length });

    for (const queued of unprocessed) {
      // Mark as processed
      queued.processed = true;

      // Log for analytics/debugging
      logger.info('Processed queued notification', {
        id: queued.id,
        type: queued.notification.request.content.data?.type,
        receivedAt: queued.receivedAt,
      });
    }

    // Update storage
    await AsyncStorage.setItem(
      NOTIFICATION_QUEUE_KEY,
      JSON.stringify(this.notificationQueue)
    );

    // Clear old processed notifications (keep last 50)
    this.notificationQueue = this.notificationQueue
      .filter(q => !q.processed)
      .concat(
        this.notificationQueue
          .filter(q => q.processed)
          .slice(-50)
      );

    await AsyncStorage.setItem(
      NOTIFICATION_QUEUE_KEY,
      JSON.stringify(this.notificationQueue)
    );
  }

  /**
   * Process the last notification that was received (for app killed state)
   */
  private static async processLastNotificationResponse(): Promise<void> {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response) {
        logger.info('Processing notification from killed state', {
          type: response.notification.request.content.data?.type,
        });

        await this.handleNotificationResponse(response);
      }
    } catch (error) {
      logger.error('Failed to process last notification response', error);
    }
  }

  /**
   * Wait for navigation to be ready
   */
  private static async waitForNavigation(
    timeoutMs: number = 3000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.navigationRef?.isReady()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Update app badge count based on unread notifications
   */
  private static async updateBadgeCount(): Promise<void> {
    try {
      // Get current user ID (would need to be passed or retrieved from storage)
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

  /**
   * Clear all notifications and reset badge count
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      this.notificationQueue = [];
      await AsyncStorage.removeItem(NOTIFICATION_QUEUE_KEY);
      await AsyncStorage.removeItem(LAST_NOTIFICATION_ID_KEY);

      logger.info('All notifications cleared');
    } catch (error) {
      logger.error('Failed to clear notifications', error);
    }
  }

  /**
   * Handle notification tap navigation (legacy method for backwards compatibility)
   */
  private static handleNotificationTap(data: any): void {
    logger.info('Legacy handleNotificationTap called', { data });
    // This method is kept for backwards compatibility but is superseded by handleNotificationResponse
  }
}