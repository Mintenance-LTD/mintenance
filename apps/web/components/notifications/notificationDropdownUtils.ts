import { theme } from '@/lib/theme';

export interface Notification {
  id: string;
  type:
    | 'message'
    | 'bid'
    | 'bid_received'
    | 'bid_accepted'
    | 'bid_rejected'
    | 'job_update'
    | 'job_viewed'
    | 'job_nearby'
    | 'payment'
    | 'quote_viewed'
    | 'quote_accepted'
    | 'project_reminder'
    | 'post_liked'
    | 'comment_added'
    | 'comment_replied'
    | 'new_follower'
    | 'contract_created'
    | 'contract_signed';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  action_url?: string;
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'message':
      return 'messages';
    case 'bid':
    case 'bid_received':
      return 'currencyDollar';
    case 'bid_accepted':
      return 'checkCircle';
    case 'bid_rejected':
      return 'xCircle';
    case 'job_update':
      return 'briefcase';
    case 'job_viewed':
      return 'eye';
    case 'job_nearby':
      return 'briefcase';
    case 'payment':
      return 'creditCard';
    case 'quote_viewed':
      return 'eye';
    case 'quote_accepted':
      return 'checkCircle';
    case 'project_reminder':
      return 'calendar';
    case 'post_liked':
      return 'heart';
    case 'comment_added':
    case 'comment_replied':
      return 'messages';
    case 'new_follower':
      return 'userPlus';
    case 'job_assigned':
      return 'userPlus';
    case 'job_started':
      return 'briefcase';
    case 'job_completed':
      return 'checkCircle';
    case 'job_confirmed':
    case 'completion_confirmed':
      return 'checkCircle';
    case 'job_cancelled':
      return 'xCircle';
    case 'job_scheduled':
      return 'calendar';
    case 'contract_created':
      return 'fileText';
    case 'contract_pending_signature':
      return 'fileText';
    case 'contract_signed':
      return 'fileText';
    case 'payment_required':
      return 'creditCard';
    case 'payment_failed':
      return 'creditCard';
    case 'changes_requested':
      return 'messages';
    case 'appointment_scheduled':
      return 'calendar';
    case 'contractor_en_route':
      return 'navigation';
    case 'contractor_arrived':
      return 'mapPin';
    default:
      return 'bell';
  }
}

export function getNotificationColor(type: string): string {
  switch (type) {
    case 'message':
      return theme.colors.info;
    case 'bid':
    case 'bid_received':
      return theme.colors.success;
    case 'bid_accepted':
      return theme.colors.success; // Green for accepted
    case 'bid_rejected':
      return theme.colors.textSecondary; // Gray for rejected
    case 'job_update':
      return theme.colors.warning;
    case 'job_viewed':
      return '#3B82F6'; // Blue for viewed
    case 'job_nearby':
      return theme.colors.warning; // Amber for nearby jobs
    case 'payment':
      return theme.colors.secondary;
    case 'quote_viewed':
      return '#3B82F6'; // Blue for viewed
    case 'quote_accepted':
      return theme.colors.success; // Green for accepted
    case 'project_reminder':
      return '#F59E0B'; // Amber for reminders
    case 'post_liked':
      return theme.colors.error; // Red for likes
    case 'comment_added':
    case 'comment_replied':
      return theme.colors.primary; // Blue for comments
    case 'new_follower':
      return theme.colors.success; // Green for followers
    case 'job_assigned':
      return theme.colors.success;
    case 'job_started':
      return theme.colors.primary;
    case 'job_completed':
      return theme.colors.success;
    case 'job_confirmed':
    case 'completion_confirmed':
      return theme.colors.success;
    case 'job_cancelled':
      return theme.colors.error;
    case 'job_scheduled':
      return '#0D9488'; // Teal
    case 'contract_created':
      return '#0D9488'; // Teal for contract created
    case 'contract_pending_signature':
      return '#F59E0B'; // Amber - action needed
    case 'contract_signed':
      return theme.colors.success;
    case 'payment_required':
      return '#F59E0B'; // Amber - action needed
    case 'payment_failed':
      return theme.colors.error;
    case 'changes_requested':
      return '#F59E0B'; // Amber - action needed
    case 'appointment_scheduled':
      return '#0D9488'; // Teal for appointments
    case 'contractor_en_route':
      return '#3B82F6'; // Blue for en route
    case 'contractor_arrived':
      return theme.colors.success; // Green for arrived
    default:
      return theme.colors.textSecondary;
  }
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB');
}
