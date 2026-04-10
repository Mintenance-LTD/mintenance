import * as Notifications from 'expo-notifications';

// Database row type (snake_case matching Supabase schema)
interface DatabaseNotificationRow {
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
  type:
    | 'job_update'
    | 'bid_received'
    | 'bid_rejected'
    | 'meeting_scheduled'
    | 'payment_received'
    | 'payment_released'
    | 'message_received'
    | 'quote_sent'
    | 'contract_created'
    | 'contract_signed'
    | 'job_completed'
    | 'job_started'
    | 'review_requested'
    | 'system';
  priority: 'low' | 'normal' | 'high';
  userId: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  newJobs: boolean;
  newBids: boolean;
  newMessages: boolean;
  jobUpdates: boolean;
  paymentUpdates: boolean;
  emailEnabled: boolean;
  weeklyDigest: boolean;
  promotionalEmails: boolean;
  securityAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
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
