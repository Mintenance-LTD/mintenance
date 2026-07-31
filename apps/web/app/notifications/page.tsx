'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import {
  fadeIn,
  staggerContainer,
  staggerItem,
} from '@/lib/animations/variants';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ArrowLeft } from 'lucide-react';
import { useNotificationsRealtime } from './useNotificationsRealtime';
import {
  getNotificationIcon,
  getNotificationColor,
} from './notification-icons';
import { safeActionUrl } from '@/lib/notifications/safe-action-url';
import { normalizeNotificationType } from '@/lib/notifications/normalize-type';
import {
  type NotificationItem,
  type FilterType as MeFilterType,
} from './MintEditorialNotifications';
import { LegacyNotificationsView } from './LegacyNotificationsView';
import {
  NotificationsInboxView,
  type InboxFilter,
  type InboxNotification,
} from '@/components/notifications/NotificationsInboxView';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Notification {
  id: string;
  type: 'job' | 'bid' | 'message' | 'payment' | 'system';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

type FilterType = 'all' | 'unread' | 'jobs' | 'messages' | 'payments';

/**
 * Map the new canonical InboxFilter (used by NotificationsInboxView)
 * onto the legacy FilterType still threaded through the page state +
 * Mint Editorial / Legacy fallback views. "money" maps to "payments"
 * (server-side type stayed the same; only the tab label is new).
 */
function inboxToLegacy(filter: InboxFilter): FilterType {
  switch (filter) {
    case 'jobs':
      return 'jobs';
    case 'messages':
      return 'messages';
    case 'money':
      return 'payments';
    case 'all':
    default:
      return 'all';
  }
}

function legacyToInbox(filter: FilterType): InboxFilter {
  switch (filter) {
    case 'jobs':
      return 'jobs';
    case 'messages':
      return 'messages';
    case 'payments':
      return 'money';
    case 'unread':
    case 'all':
    default:
      return 'all';
  }
}

export default function NotificationsPage2025() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, loading: loadingUser } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Phase-2 design rebrand. Hydration-safe theme detection — same
  // pattern as HomeownerPageWrapper / /jobs / /messages.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch notifications');
        }

        const data = await response.json();

        interface NotificationApiResponse {
          id: string;
          type?: string;
          title?: string;
          message?: string;
          created_at?: string;
          read?: boolean;
          is_read?: boolean;
          action_url?: string;
          link?: string;
          metadata?: Record<string, unknown>;
        }

        // API now returns array directly, not wrapped in notifications property
        const notificationsArray = Array.isArray(data)
          ? data
          : data.notifications || [];

        const transformedNotifications: Notification[] = notificationsArray.map(
          (n: NotificationApiResponse) => ({
            id: n.id,
            type: (n.type || 'system') as Notification['type'],
            title: n.title || 'Notification',
            message: n.message || '',
            created_at: n.created_at || new Date().toISOString(),
            is_read: n.is_read ?? n.read ?? false,
            action_url: n.action_url || n.link,
            metadata: n.metadata,
          })
        );

        setNotifications(transformedNotifications);
      } catch (error) {
        logger.error('Error fetching notifications:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to load notifications'
        );
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [user]);

  // Live Supabase Realtime — extracted to a hook to keep this file lean.
  useNotificationsRealtime(user?.id ?? null, setNotifications);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark as read');
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to mark notification as read'
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark all as read');
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      logger.error('Error marking all as read:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to mark all as read'
      );
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Clear all notifications?',
      description: 'This action cannot be undone.',
      confirmText: 'Clear all',
      destructive: true,
    });
    if (!ok) return;

    try {
      const deletePromises = notifications.map((n) =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Failed to delete notification ${n.id}`
            );
          }
          return response;
        })
      );

      const results = await Promise.allSettled(deletePromises);

      // Check if any deletions failed
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        logger.error('Some notifications failed to delete:', failures);
        toast.error(`${failures.length} notification(s) failed to delete`);
        // Still remove successfully deleted ones from state
        const successfulIds = results
          .map((r, i) =>
            r.status === 'fulfilled' ? notifications[i].id : null
          )
          .filter(Boolean) as string[];
        setNotifications((prev) =>
          prev.filter((n) => !successfulIds.includes(n.id))
        );
      } else {
        setNotifications([]);
        toast.success('All notifications cleared');
      }
    } catch (error) {
      logger.error('Error clearing notifications:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to clear all notifications'
      );
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const ok = await confirm({
      title: 'Delete this notification?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // 2026-04-30 audit: only allow internal allow-listed paths.
    // A bad action_url silently routes to /notifications instead of
    // letting the user land outside the app or on a stale screen.
    if (notification.action_url) {
      router.push(safeActionUrl(notification.action_url));
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/notifications');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) return null;

  const userDisplayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.email;

  // Filter notifications. DB stores full event names (`message_received`,
  // `bid_accepted`, `contract_created`, …) so we normalise to the
  // canonical 5-bucket union before comparing — otherwise every category
  // tab counts 0.
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    const bucket = normalizeNotificationType(n.type);
    if (filter === 'jobs') return bucket === 'job' || bucket === 'bid';
    if (filter === 'messages') return bucket === 'message';
    if (filter === 'payments') return bucket === 'payment';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const jobsCount = notifications.filter((n) => {
    const bucket = normalizeNotificationType(n.type);
    return bucket === 'job' || bucket === 'bid';
  }).length;
  const messagesCount = notifications.filter(
    (n) => normalizeNotificationType(n.type) === 'message'
  ).length;
  const paymentsCount = notifications.filter(
    (n) => normalizeNotificationType(n.type) === 'payment'
  ).length;

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  // Mint Editorial branch — uses the canonical role-agnostic
  // NotificationsInboxView so the homeowner + contractor inboxes can't
  // drift again. The same fetch, realtime subscription, and mutation
  // handlers feed it; only the visual layer changes.
  if (isMintEditorial) {
    return (
      <HomeownerPageWrapper>
        <NotificationsInboxView
          notifications={notifications as InboxNotification[]}
          loading={loadingNotifications}
          filter={legacyToInbox(filter)}
          onFilterChange={(f) => setFilter(inboxToLegacy(f))}
          preferencesHref='/settings/notifications'
          onMarkAllRead={handleMarkAllAsRead}
          onNotificationClick={(n) =>
            handleNotificationClick(n as Notification)
          }
          onDelete={handleDeleteNotification}
        />
      </HomeownerPageWrapper>
    );
  }

  return (
    <HomeownerPageWrapper>
      <LegacyNotificationsView
        notifications={notifications as NotificationItem[]}
        loading={loadingNotifications}
        filter={filter as MeFilterType}
        onFilterChange={(f) => setFilter(f as FilterType)}
        counts={{
          all: notifications.length,
          unread: unreadCount,
          jobs: jobsCount,
          messages: messagesCount,
          payments: paymentsCount,
        }}
        onClickNotification={(n) => handleNotificationClick(n as Notification)}
        onMarkAllRead={handleMarkAllAsRead}
        onClearAll={handleClearAll}
        onDelete={handleDeleteNotification}
      />
    </HomeownerPageWrapper>
  );
}
