import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { z } from 'zod';
import { validateSchema } from '../types/schemas';

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

const NotificationDataSchema = z.object({
  type: z.enum([
    'job_created',
    'job_updated',
    'bid_received',
    'bid_accepted',
    'bid_rejected',
    'message_received',
    'payment_received',
    'reminder',
    'system_update',
  ]),
  title: z.string(),
  body: z.string(),
  data: z.record(z.any()).optional(),
  actionId: z.string().optional(),
  categoryId: z.string().optional(),
});

const NotificationPermissionSchema = z.object({
  status: z.enum(['granted', 'denied', 'undetermined']),
  canAskAgain: z.boolean(),
  canSetBadge: z.boolean(),
  canPlaySound: z.boolean(),
  canShowAlert: z.boolean(),
});

export type NotificationData = z.infer<typeof NotificationDataSchema>;
export type NotificationPermission = z.infer<typeof NotificationPermissionSchema>;

// ============================================================================
// NOTIFICATION CATEGORIES
// ============================================================================

const NotificationCategories = {
  JOB_ALERT: 'job_alert',
  BID_ALERT: 'bid_alert',
  MESSAGE_ALERT: 'message_alert',
  PAYMENT_ALERT: 'payment_alert',
  REMINDER: 'reminder',
} as const;

const NotificationActions = {
  VIEW: 'view',
  REPLY: 'reply',
  ACCEPT: 'accept',
  REJECT: 'reject',
  DISMISS: 'dismiss',
} as const;

// ============================================================================
// PUSH NOTIFICATION SERVICE
// ============================================================================

export class PushNotificationService {
  private isInitialized = false;
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notification behavior
      await this.configureNotifications();

      // Setup notification categories
      await this.setupNotificationCategories();

      // Register for push notifications
      await this.registerForPushNotifications();

      // Setup event listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('📱 Push notification service initialized');
    } catch (error) {
      console.error('🚨 Failed to initialize push notifications:', error);
      throw error;
    }
  }

  private async configureNotifications(): Promise<void> {
    // Configure how notifications are presented when app is in foreground
    await Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        
        // Show notification in foreground for certain types
        const showInForeground = [
          'message_received',
          'bid_received',
          'payment_received',
        ].includes(data?.type);

        return {
          shouldShowAlert: showInForeground,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });
  }

  private async setupNotificationCategories(): Promise<void> {
    const categories = [
      {
        identifier: NotificationCategories.JOB_ALERT,
        actions: [
          {
            identifier: NotificationActions.VIEW,
            buttonTitle: 'View Job',
            options: { opensAppToForeground: true },
          },
          {
            identifier: NotificationActions.DISMISS,
            buttonTitle: 'Dismiss',
            options: { opensAppToForeground: false },
          },
        ],
        options: { customDismissAction: true },
      },
      {
        identifier: NotificationCategories.BID_ALERT,
        actions: [
          {
            identifier: NotificationActions.ACCEPT,
            buttonTitle: 'Accept',
            options: { opensAppToForeground: true, isDestructive: false },
          },
          {
            identifier: NotificationActions.REJECT,
            buttonTitle: 'Reject',
            options: { opensAppToForeground: false, isDestructive: true },
          },
          {
            identifier: NotificationActions.VIEW,
            buttonTitle: 'View Details',
            options: { opensAppToForeground: true },
          },
        ],
      },
      {
        identifier: NotificationCategories.MESSAGE_ALERT,
        actions: [
          {
            identifier: NotificationActions.REPLY,
            buttonTitle: 'Reply',
            options: { 
              opensAppToForeground: false,
              isAuthenticationRequired: false,
            },
            textInput: {
              buttonTitle: 'Send',
              placeholder: 'Type your message...',
            },
          },
          {
            identifier: NotificationActions.VIEW,
            buttonTitle: 'View',
            options: { opensAppToForeground: true },
          },
        ],
      },
      {
        identifier: NotificationCategories.PAYMENT_ALERT,
        actions: [
          {
            identifier: NotificationActions.VIEW,
            buttonTitle: 'View Payment',
            options: { opensAppToForeground: true },
          },
        ],
      },
    ];

    await Notifications.setNotificationCategoryAsync(
      categories[0].identifier,
      categories[0].actions,
      categories[0].options
    );
  }

  private async registerForPushNotifications(): Promise<void> {
    if (!Device.isDevice) {
      console.warn('📱 Push notifications require a physical device');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('📱 Push notification permissions not granted');
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      
      this.expoPushToken = token.data;
      console.log('📱 Expo push token:', this.expoPushToken);
    } catch (error) {
      console.error('🚨 Failed to get push token:', error);
    }

    // Platform-specific configuration
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Create channels for different notification types
      await this.createAndroidChannels();
    }
  }

  private async createAndroidChannels(): Promise<void> {
    const channels = [
      {
        id: 'job_notifications',
        name: 'Job Notifications',
        description: 'Notifications about job postings and updates',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'bid_notifications', 
        name: 'Bid Notifications',
        description: 'Notifications about bids and proposals',
        importance: Notifications.AndroidImportance.MAX,
      },
      {
        id: 'message_notifications',
        name: 'Message Notifications',
        description: 'Chat and messaging notifications',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'payment_notifications',
        name: 'Payment Notifications',
        description: 'Payment and transaction notifications',
        importance: Notifications.AndroidImportance.MAX,
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
  }

  private setupNotificationListeners(): void {
    // Listen for notification received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listen for user interaction with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
  }

  // ============================================================================
  // NOTIFICATION HANDLERS
  // ============================================================================

  private handleNotificationReceived(notification: Notifications.Notification): void {
    console.log('📱 Notification received:', notification);
    
    const data = notification.request.content.data;
    
    // Handle specific notification types
    switch (data?.type) {
      case 'message_received':
        this.handleMessageNotification(data);
        break;
      case 'bid_received':
        this.handleBidNotification(data);
        break;
      case 'job_created':
        this.handleJobNotification(data);
        break;
      case 'payment_received':
        this.handlePaymentNotification(data);
        break;
      default:
        console.log('📱 Unknown notification type:', data?.type);
    }
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    console.log('📱 Notification response:', response);
    
    const { actionIdentifier, userText } = response;
    const data = response.notification.request.content.data;

    switch (actionIdentifier) {
      case NotificationActions.VIEW:
        this.handleViewAction(data);
        break;
      case NotificationActions.REPLY:
        this.handleReplyAction(data, userText);
        break;
      case NotificationActions.ACCEPT:
        this.handleAcceptAction(data);
        break;
      case NotificationActions.REJECT:
        this.handleRejectAction(data);
        break;
      case NotificationActions.DISMISS:
        this.handleDismissAction(data);
        break;
      default:
        // Default action (tap notification)
        this.handleDefaultAction(data);
    }
  }

  private handleMessageNotification(data: any): void {
    // Update app state with new message
    console.log('💬 Message notification handled:', data);
  }

  private handleBidNotification(data: any): void {
    // Update app state with new bid
    console.log('💼 Bid notification handled:', data);
  }

  private handleJobNotification(data: any): void {
    // Update app state with new job
    console.log('🔨 Job notification handled:', data);
  }

  private handlePaymentNotification(data: any): void {
    // Update app state with payment info
    console.log('💰 Payment notification handled:', data);
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  private handleViewAction(data: any): void {
    console.log('👀 View action triggered:', data);
    // Navigate to relevant screen
  }

  private handleReplyAction(data: any, userText?: string): void {
    console.log('💬 Reply action triggered:', data, userText);
    // Send quick reply
  }

  private handleAcceptAction(data: any): void {
    console.log('✅ Accept action triggered:', data);
    // Accept bid/request
  }

  private handleRejectAction(data: any): void {
    console.log('❌ Reject action triggered:', data);
    // Reject bid/request
  }

  private handleDismissAction(data: any): void {
    console.log('🚫 Dismiss action triggered:', data);
    // Mark as dismissed
  }

  private handleDefaultAction(data: any): void {
    console.log('🎯 Default action triggered:', data);
    // Navigate to relevant screen based on notification type
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async getPermissions(): Promise<NotificationPermission> {
    const permissions = await Notifications.getPermissionsAsync();
    
    return validateSchema(NotificationPermissionSchema, {
      status: permissions.status,
      canAskAgain: permissions.canAskAgain,
      canSetBadge: permissions.ios?.allowsBadge ?? true,
      canPlaySound: permissions.ios?.allowsSound ?? true,
      canShowAlert: permissions.ios?.allowsAlert ?? true,
    });
  }

  async requestPermissions(): Promise<NotificationPermission> {
    const permissions = await Notifications.requestPermissionsAsync();
    
    return validateSchema(NotificationPermissionSchema, {
      status: permissions.status,
      canAskAgain: permissions.canAskAgain,
      canSetBadge: permissions.ios?.allowsBadge ?? true,
      canPlaySound: permissions.ios?.allowsSound ?? true,
      canShowAlert: permissions.ios?.allowsAlert ?? true,
    });
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async scheduleLocalNotification(
    notificationData: NotificationData,
    scheduleOptions?: {
      seconds?: number;
      date?: Date;
      repeats?: boolean;
    }
  ): Promise<string> {
    const validated = validateSchema(NotificationDataSchema, notificationData);

    const trigger = scheduleOptions?.date 
      ? { date: scheduleOptions.date }
      : scheduleOptions?.seconds 
      ? { seconds: scheduleOptions.seconds }
      : null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: validated.title,
        body: validated.body,
        data: validated.data || {},
        categoryIdentifier: validated.categoryId,
        sound: 'default',
      },
      trigger,
    });

    console.log('📱 Local notification scheduled:', identifier);
    return identifier;
  }

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log('📱 Notification cancelled:', identifier);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('📱 All notifications cancelled');
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }

    this.isInitialized = false;
    console.log('📱 Push notification service cleaned up');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pushNotificationServiceInstance: PushNotificationService | null = null;

export const getPushNotificationService = (): PushNotificationService => {
  if (!pushNotificationServiceInstance) {
    pushNotificationServiceInstance = new PushNotificationService();
  }
  return pushNotificationServiceInstance;
};

export default PushNotificationService;
