'use client';

import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { LegacyNotificationsView } from '@/app/notifications/LegacyNotificationsView';
import { useNotificationsRealtime } from '@/app/notifications/useNotificationsRealtime';
import {
  computeInboxCounts,
  NotificationsInboxView,
  type InboxFilter,
  type InboxNotification,
} from '@/components/notifications/NotificationsInboxView';
import { LoadingSpinner } from '@/components/ui';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { fetchInboxPage, type Cursor } from '@/lib/notifications/fetch-inbox';
import { safeActionUrl } from '@/lib/notifications/safe-action-url';

export default function ContractorNotificationsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { user, loading } = useCurrentUser();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  const queryKey = ['notifications', 'web-inbox', user?.id] as const;
  const inbox = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchInboxPage(pageParam, signal),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: user?.role === 'contractor',
  });
  const notifications =
    inbox.data?.pages.flatMap((page) => page.notifications) ?? [];
  const counts = computeInboxCounts(notifications);
  const unreadTotal = inbox.data?.pages.at(-1)?.unreadCount ?? counts.unread;

  useEffect(() => {
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  useEffect(() => {
    if (!loading && !user)
      router.push('/login?redirect=/contractor/notifications');
  }, [loading, router, user]);

  function refreshInbox() {
    void queryClient.invalidateQueries({ queryKey });
  }
  useNotificationsRealtime(user?.id, refreshInbox);

  async function update(path: string, method: 'POST' | 'DELETE') {
    const response = await fetchWithCsrf(path, { method });
    if (!response.ok) throw new Error('Notification update failed');
    refreshInbox();
    window.dispatchEvent(new Event('mintenance:notifications-updated'));
  }

  async function openNotification(notification: InboxNotification) {
    if (!notification.is_read) {
      try {
        await update(
          '/api/notifications/' + notification.id + '/read?inbox=1',
          'POST'
        );
      } catch {
        toast.error('Could not mark the notification as read.');
      }
    }
    if (notification.action_url)
      router.push(
        safeActionUrl(notification.action_url, '/contractor/notifications')
      );
  }

  async function markAllRead() {
    try {
      await update('/api/notifications/mark-all-read', 'POST');
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not mark all notifications as read.');
    }
  }

  async function deleteNotification(id: string) {
    if (
      !(await confirm({
        title: 'Delete this notification?',
        confirmText: 'Delete',
        destructive: true,
      }))
    )
      return;

    try {
      await update('/api/notifications/' + id + '?inbox=1', 'DELETE');
    } catch {
      toast.error('Could not delete the notification.');
    }
  }

  async function clearLoadedNotifications() {
    if (
      !(await confirm({
        title: 'Clear loaded notifications?',
        description: 'This action cannot be undone.',
        confirmText: 'Clear loaded',
        destructive: true,
      }))
    )
      return;

    try {
      for (let start = 0; start < notifications.length; start += 100) {
        const ids = notifications.slice(start, start + 100).map(({ id }) => id);
        const response = await fetchWithCsrf('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error('Notification delete failed');
      }
      toast.success('Loaded notifications cleared');
    } catch {
      toast.error('Some loaded notifications could not be cleared.');
    } finally {
      refreshInbox();
      window.dispatchEvent(new Event('mintenance:notifications-updated'));
    }
  }

  if (loading) return <LoadingSpinner fullScreen />;
  if (user?.role !== 'contractor') return null;

  return (
    <ContractorPageWrapper>
      {inbox.isError && !inbox.data ? (
        <p role='alert' className='t-body'>
          Could not load notifications.{' '}
          <button
            type='button'
            className='btn btn-secondary'
            onClick={() => void inbox.refetch()}
          >
            Retry
          </button>
        </p>
      ) : isMintEditorial ? (
        <NotificationsInboxView
          notifications={notifications}
          loading={inbox.isPending}
          filter={filter}
          onFilterChange={setFilter}
          preferencesHref='/contractor/settings'
          unreadTotal={unreadTotal}
          showUnreadFilter
          onClearLoaded={clearLoadedNotifications}
          onMarkAllRead={markAllRead}
          onNotificationClick={openNotification}
          onDelete={deleteNotification}
        />
      ) : (
        <LegacyNotificationsView
          dashboardHref='/contractor/dashboard-enhanced'
          notifications={notifications}
          loading={inbox.isPending}
          filter={filter === 'money' ? 'payments' : filter}
          onFilterChange={(value) =>
            setFilter(value === 'payments' ? 'money' : value)
          }
          counts={{ ...counts, unread: unreadTotal, payments: counts.money }}
          hasOlder={inbox.hasNextPage}
          onClickNotification={openNotification}
          onMarkAllRead={markAllRead}
          onClearAll={clearLoadedNotifications}
          onDelete={deleteNotification}
        />
      )}
      {inbox.hasNextPage && (
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          {inbox.isFetchNextPageError && (
            <p role='alert'>Could not load older notifications.</p>
          )}
          <button
            type='button'
            className='btn btn-secondary'
            disabled={inbox.isFetching}
            onClick={() => void inbox.fetchNextPage()}
          >
            {inbox.isFetchingNextPage
              ? 'Loading older notifications…'
              : 'Load older notifications'}
          </button>
        </div>
      )}
    </ContractorPageWrapper>
  );
}
