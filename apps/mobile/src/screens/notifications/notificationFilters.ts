/**
 * Notification filtering and text utility functions.
 */

import { NotificationData } from '../../services/NotificationService';
import { FilterTab } from './notificationConfig';

export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function stripEmoji(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1FFFF}]|[\u200D]|[\u{E0020}-\u{E007F}]/gu,
      ''
    )
    .trim();
}

export const filterNotifications = (
  notifications: NotificationData[],
  tab: FilterTab
): NotificationData[] => {
  switch (tab) {
    case 'unread':
      return notifications.filter((n) => !n.read);
    case 'jobs':
      return notifications.filter((n) =>
        [
          'job_update',
          'bid_received',
          'quote_sent',
          'new_job',
          'job_posted',
          'job_completed',
          'bid_accepted',
          'contract_created',
          'contract_accepted',
        ].includes(n.type)
      );
    case 'payments':
      return notifications.filter((n) =>
        ['payment_received', 'escrow_released'].includes(n.type)
      );
    case 'messages':
      return notifications.filter((n) =>
        ['message_received', 'meeting_scheduled', 'new_message'].includes(
          n.type
        )
      );
    default:
      return notifications;
  }
};
