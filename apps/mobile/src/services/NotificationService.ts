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
import * as sentry from '../config/sentry';
import type { Tables } from '../types/database';

// Storage keys for notification queue
const NOTIFICATION_QUEUE_KEY = '@mintenance/notification_queue';
const LAST_NOTIFICATION_ID_KEY = '@mintenance/last_notification_id';

// Database row types (snake_case)
type DatabaseNotificationRow = Tables['notifications']['Row'];
type DatabaseUserPushTokenRow = Tables['user_push_tokens']['Row'];
type DatabaseNotificationPreferencesRow = Tables['user_notification_preferences']['Row'];

// Type for notification data in deep links
interface NotificationDeepLinkData {
  type?: NotificationData['type'];
  jobId?: string;
  conversationId?: string;
  jobTitle?: string;
  senderId?: string;
  senderName?: string;
  meetingId?: string;
  quoteId?: string;
  notificationId?: string;
  [key: string]: unknown;
}

// Configure notification behavior for foreground, background, and killed states
Notifications.setNotificationHandler({
  handleNotification: async (notification): Promise<Notifications.NotificationBehavior> => {
    const data = notification.request.content.data;
    const type = data?.type as NotificationData['type'] | undefined;
    const priority = data?.priority || 'normal';

    // Determine notification behavior based on type and priority
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

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: unknown;
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
  params?: Record<string, unknown>;
}

// Type for navigation reference (set externally)
type NavigationRef = {
  navigate: (screen: string, params?: unknown) => void;
  reset: (state: unknown) => void;
  isReady: () => boolean;
} | null;

export class NotificationService {
  private static expoPushToken: string | null = null;
  private static navigationRef: NavigationRef = null;
  private static notificationQueue: QueuedNotification[] = [];
  private static receivedListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;
  private static isInitialized: boolean = false;
  private static deviceOverride: boolean | null = null;

  private static addBreadcrumb(
    message: string,
    level: 'info' | 'warning' | 'error' | 'debug',
    data?: Record<string, unknown>
  ): void {
    // Include level in data since sentry.addBreadcrumb doesn't accept it as a separate param
    const breadcrumbData = data ? { ...data, level } : { level };
    sentry.addBreadcrumb(message, 'notification', breadcrumbData);
  }

  /**
   * Initialize push notifications and request permissions
   */
  static async initialize(): Promise<string | null> {
    try {
      const isDevice =
        NotificationService.deviceOverride !== null
          ? NotificationService.deviceOverride
          : Device.isDevice as boolean;

      if (!isDevice) {
        logger.warn('Push notifications only work on physical devices');
        this.addBreadcrumb(
          'Push notifications only work on physical devices',
          'warning'
        );
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
      this.addBreadcrumb(
        'Push notification permission denied',
        'warning'
      );
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
      this.addBreadcrumb(
        'Notification Service initialized',
        'info',
        { token: token.data }
      );

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

        this.addBreadcrumb(
          'Android notification channels created',
          'info',
          {
            channels: [
              'default',
              'job-updates',
              'bid-notifications',
              'meeting-reminders',
            ],
          }
        );
      }

      return token.data;
    } catch (error) {
      logger.error('Failed to initialize push notifications', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(
        'Failed to initialize push notifications',
        'error',
        { error: errorMessage }
      );
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
      this.addBreadcrumb(
        'Push token saved',
        'info',
        {
          userId,
          platform: Platform.OS,
        }
      );
    } catch (error) {
      logger.error('Failed to save push token', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(
        'Failed to save push token',
        'error',
        {
          userId,
          error: errorMessage,
        }
      );
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
    data?: unknown,
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
        this.addBreadcrumb(
          'No push token found for user',
          'warning',
          { userId }
        );
        return;
      }

      // Check user preferences
      const preferences = await this.getNotificationPreferences(userId);
      if (!this.shouldSendNotification(preferences, type)) {
        logger.info('Notification blocked by user preferences', { userId, type });
        this.addBreadcrumb(
          'Notification blocked by user preferences',
          'info',
          { userId, type }
        );
        return;
      }

      // Send notification via Expo
      const messageData = data && typeof data === 'object' && !Array.isArray(data)
        ? { ...(data as Record<string, unknown>), type, userId }
        : { type, userId };

      const message = {
        to: tokenData.push_token,
        sound: 'default' as const,
        title,
        body,
        data: messageData,
        channelId: this.getChannelId(type),
      };

      try {
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
          timeoutId = setTimeout(() => {
            reject(new Error('Push notification request timed out'));
          }, timeoutMs);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          throw new Error(`Push notification failed: ${response.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Push notification request timed out')) {
          this.addBreadcrumb(
            'Push notification timeout',
            'error',
            { userId, timeout: 10000 }
          );
          throw new Error('Push notification request timed out');
        }
        this.addBreadcrumb(
          'Failed to send push notification',
          'error',
          { userId, error: errorMessage }
        );
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
      this.addBreadcrumb(
        'Push notification sent',
        'info',
        { userId, type, title }
      );
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
    data?: unknown,
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
    data?: unknown
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as Record<string, unknown> | undefined,
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
   * Schedule a local notification with breadcrumb tracking
   */
  static async scheduleLocalNotification(
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

      const triggerSeconds = (trigger as { seconds?: number }).seconds;
      this.addBreadcrumb(
        'Local notification scheduled',
        'info',
        {
          id,
          title,
          ...(triggerSeconds !== undefined && { triggerSeconds }),
        }
      );

      return id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(
        'Failed to schedule notification',
        'error',
        { error: errorMessage }
      );
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
   * Cancel a scheduled notification with breadcrumb tracking
   */
  static async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    this.addBreadcrumb(
      'Scheduled notification cancelled',
      'info',
      { id: notificationId }
    );
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

      const defaultPreferences: NotificationPreferences = {
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

      if (!data) {
        this.addBreadcrumb(
          'Fetched notification preferences',
          'debug',
          { userId, preferences: defaultPreferences }
        );
        return defaultPreferences;
      }

      const preferences =
        (data as { preferences?: NotificationPreferences; notification_settings?: NotificationPreferences })
          .preferences ||
        (data as { notification_settings?: NotificationPreferences }).notification_settings ||
        defaultPreferences;

      this.addBreadcrumb(
        'Fetched notification preferences',
        'debug',
        { userId, preferences }
      );

      return preferences as NotificationPreferences;
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
        .update({
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
      logger.info('Notification preferences updated', { userId });
      this.addBreadcrumb(
        'Updated notification preferences',
        'info',
        {
          userId,
          quietHoursEnabled: Boolean(preferences.quietHours?.enabled),
        }
      );
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

      // Transform database rows to NotificationData
      return (data || []).map((row: DatabaseNotificationRow) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        data: row.data,
        type: row.type,
        priority: row.priority,
        userId: row.user_id,
        createdAt: row.created_at,
        read: row.read,
      }));
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
    const safePreferences: NotificationPreferences = {
      jobUpdates: preferences?.jobUpdates ?? true,
      bidNotifications: preferences?.bidNotifications ?? true,
      meetingReminders: preferences?.meetingReminders ?? true,
      paymentAlerts: preferences?.paymentAlerts ?? true,
      messages: preferences?.messages ?? true,
      quotes: preferences?.quotes ?? true,
      systemAnnouncements: preferences?.systemAnnouncements ?? true,
      quietHours: {
        enabled: preferences?.quietHours?.enabled ?? false,
        start: preferences?.quietHours?.start || '22:00',
        end: preferences?.quietHours?.end || '08:00',
      },
    };

    // Check quiet hours
    if (safePreferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = this.parseTime(safePreferences.quietHours.start);
      const endTime = this.parseTime(safePreferences.quietHours.end);

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
        return safePreferences.jobUpdates;
      case 'bid_received':
        return safePreferences.bidNotifications;
      case 'meeting_scheduled':
        return safePreferences.meetingReminders;
      case 'payment_received':
        return safePreferences.paymentAlerts;
      case 'message_received':
        return safePreferences.messages;
      case 'quote_sent':
        return safePreferences.quotes;
      case 'system':
        return safePreferences.systemAnnouncements;
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
   * Get queued notifications from storage
   */
  private static async getQueuedNotifications(): Promise<QueuedNotification[]> {
    try {
      const queueData = await AsyncStorage.getItem(NOTIFICATION_QUEUE_KEY);
      if (!queueData) {
        return [];
      }
      const parsed = JSON.parse(queueData) as QueuedNotification[];
      return parsed.filter(q => !q.processed);
    } catch (error) {
      logger.error('Failed to get queued notifications', error);
      return [];
    }
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
          const response: Notifications.NotificationResponse = {
            notification: notification.notification,
            actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
          };

          await this.handleNotificationResponse(response);
        } catch (error) {
          logger.error('Failed to process queued notification', error);
        }
      }

      // Clear the queue after processing
      await AsyncStorage.removeItem(NOTIFICATION_QUEUE_KEY);
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
        const data = notification.request.content.data as NotificationDeepLinkData | undefined;

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
   * Public wrapper to register listeners with breadcrumb tracking
   */
  static registerListeners(navRef: NavigationRef): void {
    this.setNavigationRef(navRef);
    this.setupNotificationListeners();
    this.addBreadcrumb('Notification listeners registered', 'info');
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
    this.addBreadcrumb('Notification listeners cleaned up', 'info');
  }

  /**
   * Handle notification response and deep link to appropriate screen
   */
  private static async handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): Promise<void> {
    const data = response.notification.request.content.data as NotificationDeepLinkData | undefined;
    const type = data?.type;
    const actionIdentifier = response.actionIdentifier;

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

    // Ensure we have a valid type
    if (!type) {
      logger.warn('No notification type found in data');
      return;
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
      this.addBreadcrumb(
        'Notification response handled',
        'info',
        {
          type,
          actionIdentifier,
          navigatedTo: deepLinkParams.screen,
        }
      );
    } catch (error) {
      logger.error('Navigation failed', error);
    }
  }

  /**
   * Get deep link parameters based on notification type and data
   */
  private static getDeepLinkParams(
    type: NotificationData['type'],
    data: unknown
  ): DeepLinkParams | null {
    // Type guard to safely access data properties
    const deepLinkData = data as NotificationDeepLinkData | undefined;

    switch (type) {
      case 'job_update':
        if (deepLinkData?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: deepLinkData.jobId },
              },
            },
          };
        }
        break;

      case 'bid_received':
        if (deepLinkData?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: deepLinkData.jobId },
              },
            },
          };
        }
        break;

      case 'message_received':
        if (deepLinkData?.conversationId) {
          return {
            screen: 'Main',
            params: {
              screen: 'MessagingTab',
              params: {
                screen: 'Messaging',
                params: {
                  conversationId: deepLinkData.conversationId,
                  jobTitle: deepLinkData.jobTitle,
                  recipientId: deepLinkData.senderId,
                  recipientName: deepLinkData.senderName,
                },
              },
            },
          };
        }
        break;

      case 'meeting_scheduled':
        if (deepLinkData?.meetingId) {
          return {
            screen: 'Modal',
            params: {
              screen: 'MeetingDetails',
              params: { meetingId: deepLinkData.meetingId },
            },
          };
        }
        break;

      case 'payment_received':
        if (deepLinkData?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: deepLinkData.jobId },
              },
            },
          };
        }
        break;

      case 'quote_sent':
        if (deepLinkData?.quoteId || deepLinkData?.jobId) {
          return {
            screen: 'Main',
            params: {
              screen: 'JobsTab',
              params: {
                screen: 'JobDetails',
                params: { jobId: deepLinkData.jobId },
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
  static async queueNotification(
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
      this.addBreadcrumb(
        'Notification queued',
        'info',
        {
          id: queuedNotification.id,
          type: notification.request.content.data?.type,
        }
      );
    } catch (error) {
      logger.error('Failed to queue notification', error);
    }
  }

  /**
   * Process queued notifications from storage
   */
  static async processNotificationQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(NOTIFICATION_QUEUE_KEY);
      const queuedNotifications: QueuedNotification[] = queueData
        ? JSON.parse(queueData)
        : [];
      const unprocessed = queuedNotifications.filter(q => !q.processed);

      this.addBreadcrumb(
        'Processing notification queue',
        'info',
        {
          queueSize: queuedNotifications.length,
          unprocessedCount: unprocessed.length,
        }
      );

      for (const queued of unprocessed) {
        queued.processed = true;
      }

      await AsyncStorage.setItem(
        NOTIFICATION_QUEUE_KEY,
        JSON.stringify(queuedNotifications)
      );

      this.addBreadcrumb(
        'Notification queue processed',
        'info',
        { processedCount: unprocessed.length }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(
        'Failed to process notification queue',
        'error',
        { error: errorMessage }
      );
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
   * Set app badge count explicitly
   */
  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
    this.addBreadcrumb(
      'Badge count updated',
      'debug',
      { count }
    );
  }

  /**
   * Clear app badge count
   */
  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
    this.addBreadcrumb('Badge cleared', 'debug');
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
  private static handleNotificationTap(data: unknown): void {
    logger.info('Legacy handleNotificationTap called', { data });
    // This method is kept for backwards compatibility but is superseded by handleNotificationResponse
  }
}
