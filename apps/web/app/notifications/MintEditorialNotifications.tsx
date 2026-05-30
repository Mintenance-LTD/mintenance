'use client';

/**
 * Mint Editorial notifications inbox.
 *
 * Pure presentational layer: the page (page.tsx) owns the fetch,
 * Supabase Realtime subscription, and every mutation handler. This
 * component receives the data + the handlers + the filter state as
 * props and renders the Mint Editorial layout. Both branches share
 * one source of truth so behaviour can't drift between them.
 */

import { Bell, Clock, Inbox, Trash2 } from 'lucide-react';
import {
  getNotificationColor,
  getNotificationIcon,
} from './notification-icons';
import { normalizeNotificationType } from '@/lib/notifications/normalize-type';

export type FilterType = 'all' | 'unread' | 'jobs' | 'messages' | 'payments';

export interface NotificationItem {
  id: string;
  type: 'job' | 'bid' | 'message' | 'payment' | 'system';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

interface Counts {
  all: number;
  unread: number;
  jobs: number;
  messages: number;
  payments: number;
}

interface Props {
  notifications: NotificationItem[];
  loading: boolean;
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  counts: Counts;
  onClickNotification: (n: NotificationItem) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
}

const TABS: { id: FilterType; label: string; key: keyof Counts }[] = [
  { id: 'all', label: 'All', key: 'all' },
  { id: 'unread', label: 'Unread', key: 'unread' },
  { id: 'jobs', label: 'Jobs', key: 'jobs' },
  { id: 'messages', label: 'Messages', key: 'messages' },
  { id: 'payments', label: 'Payments', key: 'payments' },
];

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function filteredList(
  notifications: NotificationItem[],
  filter: FilterType
): NotificationItem[] {
  switch (filter) {
    case 'unread':
      return notifications.filter((n) => !n.is_read);
    case 'jobs':
      return notifications.filter((n) => {
        const bucket = normalizeNotificationType(n.type);
        return bucket === 'job' || bucket === 'bid';
      });
    case 'messages':
      return notifications.filter(
        (n) => normalizeNotificationType(n.type) === 'message'
      );
    case 'payments':
      return notifications.filter(
        (n) => normalizeNotificationType(n.type) === 'payment'
      );
    default:
      return notifications;
  }
}

function NotificationRow({
  notification,
  onClick,
  onDelete,
}: {
  notification: NotificationItem;
  onClick: () => void;
  onDelete: () => void;
}) {
  const isUnread = !notification.is_read;
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr auto',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--me-line-2)',
        background: isUnread ? 'var(--me-brand-soft)' : 'transparent',
        borderLeft: isUnread
          ? '3px solid var(--me-brand)'
          : '3px solid transparent',
        cursor: 'pointer',
      }}
    >
      <div
        className={`${getNotificationColor(notification.type)} text-white`}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getNotificationIcon(notification.type)}
      </div>
      <div className='col' style={{ gap: 4, minWidth: 0 }}>
        <div className='row' style={{ gap: 8 }}>
          <h3 className='t-h4'>{notification.title}</h3>
          {isUnread ? (
            <span
              aria-label='Unread'
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--me-brand)',
                flexShrink: 0,
              }}
            />
          ) : null}
        </div>
        {notification.message ? (
          <p
            className='t-body'
            style={{
              fontSize: 13,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {notification.message}
          </p>
        ) : null}
        <div className='row' style={{ gap: 6, fontSize: 12 }}>
          <Clock
            size={11}
            strokeWidth={1.75}
            style={{ color: 'var(--me-ink-3)' }}
          />
          <span className='t-meta'>
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>
      </div>
      <div className='row' style={{ gap: 6 }}>
        {notification.action_url ? (
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View
          </button>
        ) : null}
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          aria-label='Delete notification'
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ padding: '6px 8px' }}
        >
          <Trash2
            size={14}
            strokeWidth={1.75}
            style={{ color: 'var(--me-err-fg)' }}
          />
        </button>
      </div>
    </div>
  );
}

export function MintEditorialNotifications({
  notifications,
  loading,
  filter,
  onFilterChange,
  counts,
  onClickNotification,
  onMarkAllRead,
  onClearAll,
  onDelete,
}: Props) {
  const visible = filteredList(notifications, filter);

  return (
    <>
      {/* Page header */}
      <div className='between' style={{ marginBottom: 18 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Notifications</h1>
          <p className='t-body'>
            {counts.unread > 0
              ? `${counts.unread} unread ${counts.unread === 1 ? 'notification' : 'notifications'}`
              : "You're all caught up."}
          </p>
        </div>
        <div className='row' style={{ gap: 8 }}>
          {notifications.length > 0 ? (
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={onClearAll}
            >
              Clear all
            </button>
          ) : null}
          {counts.unread > 0 ? (
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={onMarkAllRead}
            >
              Mark all as read
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter chips */}
      <div
        className='row'
        style={{ gap: 6, flexWrap: 'wrap', marginBottom: 14 }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type='button'
            className={'chip ' + (filter === t.id ? 'on' : '')}
            onClick={() => onFilterChange(t.id)}
          >
            {t.label} · {counts[t.key]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className='card' style={{ padding: 40, textAlign: 'center' }}>
          <p className='t-body'>Loading notifications…</p>
        </div>
      ) : visible.length === 0 ? (
        <div
          className='card'
          style={{ padding: '56px 24px', textAlign: 'center' }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--me-brand-soft)',
              color: 'var(--me-brand)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            {filter === 'unread' ? (
              <Inbox size={24} strokeWidth={1.5} />
            ) : (
              <Bell size={24} strokeWidth={1.5} />
            )}
          </span>
          <h2 className='t-h4' style={{ marginBottom: 4 }}>
            {filter === 'unread'
              ? 'No unread notifications'
              : 'No notifications'}
          </h2>
          <p className='t-body'>
            {filter === 'unread'
              ? "You're all caught up."
              : 'Notifications will appear here as jobs, bids, and payments move along.'}
          </p>
        </div>
      ) : (
        <div className='card' style={{ overflow: 'hidden' }}>
          {visible.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onClick={() => onClickNotification(n)}
              onDelete={() => onDelete(n.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
