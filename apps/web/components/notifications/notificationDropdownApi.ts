import { logger } from '@mintenance/shared';
import type { Notification } from './notificationDropdownUtils';

interface FetchNotificationsResult {
  notifications: Notification[];
  authExpired: boolean;
}

export async function fetchNotificationsApi(
  userId: string
): Promise<FetchNotificationsResult> {
  // Fetch contractor-relevant notifications only (bids, jobs, messages, payments)
  // Social notifications are deprecated and available on dedicated /contractor/social page
  // Security fix: API now uses authenticated user, no userId param needed
  const regularResponse = await fetch('/api/notifications', {
    credentials: 'include',
  }).catch((err) => {
    logger.error('Error fetching notifications', err, {
      service: 'NotificationDropdown',
      userId,
    });
    return null;
  });

  const notifications: Notification[] = [];

  // Handle auth failures — stop polling if session expired
  if (regularResponse && regularResponse.status === 401) {
    return { notifications: [], authExpired: true };
  }

  // Add regular notifications
  if (regularResponse?.ok) {
    try {
      const regularData = await regularResponse.json();
      let parsedNotifications: Notification[] = [];

      if (Array.isArray(regularData)) {
        parsedNotifications = regularData;
      } else if (Array.isArray(regularData.notifications)) {
        parsedNotifications = regularData.notifications;
      } else if (regularData && typeof regularData === 'object') {
        const notifArray = regularData.notifications || regularData.data || [];
        if (Array.isArray(notifArray)) {
          parsedNotifications = notifArray;
        }
      }

      notifications.push(...parsedNotifications);
    } catch (parseError) {
      logger.error('Error parsing notifications response', parseError, {
        service: 'NotificationDropdown',
      });
    }
  }

  // Sort by created_at (newest first) and remove duplicates
  const uniqueNotifications = notifications
    .filter((n, index, self) => index === self.findIndex((t) => t.id === n.id))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return { notifications: uniqueNotifications, authExpired: false };
}

export async function markAsReadApi(notificationId: string): Promise<void> {
  await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
}

export async function markAllAsReadApi(): Promise<void> {
  // Security fix: API now uses authenticated user, no userId in body needed
  await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
}
