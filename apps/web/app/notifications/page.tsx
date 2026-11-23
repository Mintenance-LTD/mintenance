'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  computeInboxCounts,
  NotificationsInboxView,
  type InboxFilter,
  type InboxNotification,
} from '@/components/notifications/NotificationsInboxView';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { safeActionUrl } from '@/lib/notifications/safe-action-url';
import { LegacyNotificationsView } from './LegacyNotificationsView';
import type { FilterType } from './MintEditorialNotifications';
import { useNotificationsRealtime } from './useNotificationsRealtime';

type Cursor = { before: string; beforeId: string };
type InboxPage = {
  notifications: InboxNotification[];
  unreadCount: number;
  nextCursor: Cursor | null;
};

async function fetchInboxPage(
  cursor: Cursor | null,
  signal: AbortSignal
): Promise<InboxPage> {
  const params = new URLSearchParams({ inbox: '1', ...cursor });
  const response = await fetch('/api/notifications?' + params, {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('Could not load notifications.');
  const data = await response.json();
  if (
    !Array.isArray(data?.notifications) ||
    typeof data.unreadCount !== 'number'
  ) {
    throw new Error('Could not load notifications.');
  }
  return {
    ...data,
    notifications: data.notifications.map(
      (row: Omit<InboxNotification, 'is_read'> & { read: boolean }) => ({
        ...row,
        is_read: row.read,
      })
    ),
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { user, loading: loadingUser } = useCurrentUser();
  const [filter, setFilter] = useState<FilterType>('all');
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  const queryKey = ['notifications', 'web-inbox', user?.id] as const;
  const inbox = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchInboxPage(pageParam, signal),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(user),
  });

  useEffect(() => {
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  useEffect(() => {
    if (!loadingUser && !user) router.push('/login?redirect=/notifications');
  }, [user, loadingUser, router]);

  const refreshInbox = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({
      queryKey: ['notifications', 'counts'],
    });
  };
  useNotificationsRealtime(user?.id, refreshInbox);

  if (loadingUser) return <LoadingSpinner fullScreen />;
  if (!user) return null;

  const notifications =
    inbox.data?.pages.flatMap((page) => page.notifications) ?? [];
  const loaded = computeInboxCounts(notifications);
  const unreadTotal = inbox.data?.pages.at(-1)?.unreadCount ?? loaded.unread;
  const inboxFilter: InboxFilter =
    filter === 'payments' ? 'money' : filter === 'unread' ? 'all' : filter;

  async function updateInbox(path: string, method: 'POST' | 'DELETE') {
    const response = await fetchWithCsrf(path, { method });
    if (!response.ok) throw new Error('Could not update notifications.');
  }

  async function markAsRead(notificationId: string) {
    try {
      await updateInbox(
        `/api/notifications/${notificationId}/read?inbox=1`,
        'POST'
      );
      refreshInbox();
    } catch {
      toast.error('Could not mark the notification as read.');
    }
  }

  async function markAllAsRead() {
    try {
      await updateInbox('/api/notifications/mark-all-read', 'POST');
      refreshInbox();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not mark all notifications as read.');
    }
  }

  async function deleteNotification(notificationId: string) {
    const ok = await confirm({
      title: 'Delete this notification?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await updateInbox(
        `/api/notifications/${notificationId}?inbox=1`,
        'DELETE'
      );
      refreshInbox();
      toast.success('Notification deleted');
    } catch {
      toast.error('Could not delete the notification.');
    }
  }

  async function clearLoadedNotifications() {
    const ok = await confirm({
      title: 'Clear loaded notifications?',
      description: 'This action cannot be undone.',
      confirmText: 'Clear loaded',
      destructive: true,
    });
    if (!ok) return;
    try {
      for (let start = 0; start < notifications.length; start += 100) {
        const ids = notifications.slice(start, start + 100).map(({ id }) => id);
        const response = await fetchWithCsrf('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!response.ok)
          throw new Error('Could not clear the loaded notifications.');
      }
      toast.success('Loaded notifications cleared');
    } catch {
      toast.error('Some loaded notifications could not be cleared.');
    } finally {
      refreshInbox();
    }
  }

  function openNotification(notification: InboxNotification) {
    if (!notification.is_read) void markAsRead(notification.id);
    if (notification.action_url)
      router.push(safeActionUrl(notification.action_url));
  }

  return (
    <HomeownerPageWrapper>
      {inbox.isError && !inbox.data ? (
        <div
          className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950'
          role='alert'
        >
          Could not load notifications.{' '}
          <button
            type='button'
            className='underline'
            onClick={() => void inbox.refetch()}
          >
            Retry
          </button>
        </div>
      ) : isMintEditorial ? (
        <NotificationsInboxView
          notifications={notifications}
          loading={inbox.isPending}
          filter={inboxFilter}
          onFilterChange={(value) =>
            setFilter(value === 'money' ? 'payments' : value)
          }
          preferencesHref='/settings/notifications'
          unreadTotal={unreadTotal}
          onMarkAllRead={markAllAsRead}
          onNotificationClick={openNotification}
          onDelete={deleteNotification}
        />
      ) : (
        <LegacyNotificationsView
          notifications={notifications}
          loading={inbox.isPending}
          filter={filter}
          onFilterChange={setFilter}
          counts={{ ...loaded, unread: unreadTotal, payments: loaded.money }}
          hasOlder={inbox.hasNextPage}
          onClickNotification={openNotification}
          onMarkAllRead={markAllAsRead}
          onClearAll={clearLoadedNotifications}
          onDelete={deleteNotification}
        />
      )}
      {inbox.data && inbox.hasNextPage && (
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          {inbox.isFetchNextPageError && (
            <p role='alert'>Could not load older notifications.</p>
          )}
          <button
            type='button'
            className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-teal-900 disabled:opacity-60'
            disabled={inbox.isFetching}
            onClick={() => void inbox.fetchNextPage()}
          >
            {inbox.isFetchingNextPage
              ? 'Loading older notifications…'
              : 'Load older notifications'}
          </button>
        </div>
      )}
    </HomeownerPageWrapper>
  );
}
