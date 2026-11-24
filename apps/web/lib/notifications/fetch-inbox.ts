import type { InboxNotification } from '@/components/notifications/NotificationsInboxView';

export type Cursor = { before: string; beforeId: string };
type InboxPage = {
  notifications: InboxNotification[];
  unreadCount: number;
  nextCursor: Cursor | null;
};

export async function fetchInboxPage(
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
