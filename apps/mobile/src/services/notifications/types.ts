import * as Notifications from 'expo-notifications';

// Database row type (snake_case matching Supabase schema)
export interface DatabaseNotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  data: unknown | null;
  type: string;
  priority: 'low' | 'normal' | 'high';
  read: boolean;
  created_at: string;
  updated_at: string | null;
}

// Type for notification data in deep links
export interface NotificationDeepLinkData {
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
export type NavigationRef = {
  navigate: (screen: string, params?: unknown) => void;
  reset: (state: unknown) => void;
  isReady: () => boolean;
} | null;
