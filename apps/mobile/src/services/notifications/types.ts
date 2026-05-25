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
    // 2026-05-24 audit-39 P1: location sharing events the homeowner
    // request flow + the contractor accept/decline path produce. Was
    // previously falling through to the inbox because the discriminated
    // union didn't list them and the router default kicked in.
    | 'location_sharing_request'
    | 'location_sharing_started'
    | 'location_sharing_stopped'
    // 2026-05-25 audit-43 P1: scheduling fan-out — appointment_scheduled
    // from /api/contractor/appointments POST (with metadata.jobId +
    // appointmentId) and job_scheduled from /api/jobs/[id]/schedule +
    // /api/bookings/[id]/reschedule. Previously both fell through to
    // the inbox because the discriminated union didn't list them.
    | 'appointment_scheduled'
    | 'job_scheduled'
    // 2026-05-25 audit-44 P1: admin verification outcomes from
    // /api/admin/verifications/[id] (account-level) and
    // /api/admin/verifications/documents (per-document). Previously
    // taps fell through to the inbox instead of opening the contractor
    // verification surface where the badge / next step lives.
    | 'verification_approved'
    | 'verification_rejected'
    // 2026-05-25 audit-45 P1: Stripe webhook tip-payment-handler fires
    // this on payment_intent.succeeded for `metadata.type === 'job_tip'`.
    // Now carries jobId + tipId so the routingTable can deep-link to
    // the contractor's JobDetails where TipsReceivedSection lives.
    | 'job_tip_received'
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
