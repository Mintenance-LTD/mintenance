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
    // 2026-05-27 audit-70 P2: bid_accepted was handled by the
    // routing-table switch but missing from this union. The gap let
    // real production notification types drift past compile-time
    // checks (the router accepts `string` so unmapped types are
    // invisible). Live data: 3 bid_accepted rows + the router has had
    // the case wired since the original cut.
    | 'bid_accepted'
    | 'meeting_scheduled'
    | 'payment_received'
    | 'payment_released'
    | 'message_received'
    // 2026-05-27 audit-70 P1: legacy bare 'message' alias still
    // present in live data — one row found via Supabase MCP. Router
    // now folds it into the message_received handler.
    | 'message'
    | 'quote_sent'
    | 'contract_created'
    | 'contract_signed'
    // 2026-05-27 audit-70 P1: web /api/contracts/[id]/sign emits
    // `contract_pending_signature` for the second-signer notification.
    // Critical two-party flow — missing from the union meant taps
    // fell through to the inbox instead of the signing surface.
    | 'contract_pending_signature'
    | 'job_completed'
    | 'job_started'
    // 2026-05-27 audit-70 P1: contractor proximity alert when a new
    // job posts in their service area. Live DB has 6 unrouted rows;
    // router now sends them to JobDetails where the Bid CTA lives.
    | 'job_nearby'
    // 2026-05-27 audit-70 P1: assignment lifecycle notifications.
    // job_assigned fires when a homeowner accepts a contractor's
    // bid; job_confirmed mirrors it for the contractor side; both
    // were unrouted despite live data.
    | 'job_assigned'
    | 'job_confirmed'
    // 2026-05-27 audit-70 P1: homeowner approval-of-completion
    // emitted by /api/jobs/[id]/confirm-completion. Previously fell
    // through to the inbox.
    | 'completion_confirmed'
    | 'review_requested'
    // 2026-05-24 audit-39 P1: location sharing events the homeowner
    // request flow + the contractor accept/decline path produce. Was
    // previously falling through to the inbox because the discriminated
    // union didn't list them and the router default kicked in.
    | 'location_sharing_request'
    | 'location_sharing_started'
    | 'location_sharing_stopped'
    // 2026-05-27 audit-70 P2: web alias for the same event —
    // /api/jobs/[id]/enable-location-sharing emits this spelling.
    | 'location_sharing_enabled'
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
