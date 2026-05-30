'use client';

/**
 * NotificationsInboxView — canonical, role-agnostic notifications inbox.
 *
 * Shared by:
 *   - /notifications        (homeowner)
 *   - /contractor/notifications  (contractor)
 *
 * Replaces the previous two divergent layouts (MintEditorialNotifications
 * for homeowners and MintEditorialNotificationsView for contractors)
 * which had drifted on tab labels, button copy, prop shapes and icon
 * styling — exact UX bug reported 2026-05-21.
 *
 * Design source: docs/mockups/support-hub.html
 *   • tabs: All / Bids & jobs / Messages / Money (Unread removed —
 *     per-row green dot indicates unread instead)
 *   • date-bucket groups: TODAY / YESTERDAY / THIS WEEK / OLDER
 *   • sentence-style rows (no separate title + message blocks)
 *   • subtler per-type icons inside a soft brand circle
 *   • "Mark all read" + "Preferences" actions in the header
 */

import React from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  PoundSterling,
  Settings,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { normalizeNotificationType } from '@/lib/notifications/normalize-type';

export type NotificationType = 'job' | 'bid' | 'message' | 'payment' | 'system';

export type InboxFilter = 'all' | 'jobs' | 'messages' | 'money';

export interface InboxNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

interface Counts {
  all: number;
  jobs: number;
  messages: number;
  money: number;
  unread: number;
}

interface NotificationsInboxViewProps {
  notifications: InboxNotification[];
  loading: boolean;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  /** Route for the Preferences button. Differs per role. */
  preferencesHref: string;
  onMarkAllRead: () => void;
  onNotificationClick: (n: InboxNotification) => void;
  onDelete: (id: string) => void;
}

const TABS: { id: InboxFilter; label: string; countKey: keyof Counts }[] = [
  { id: 'all', label: 'All', countKey: 'all' },
  { id: 'jobs', label: 'Bids & jobs', countKey: 'jobs' },
  { id: 'messages', label: 'Messages', countKey: 'messages' },
  { id: 'money', label: 'Money', countKey: 'money' },
];

// ── Filter ──────────────────────────────────────────────────────────

function filteredList(
  notifications: InboxNotification[],
  filter: InboxFilter
): InboxNotification[] {
  if (filter === 'all') return notifications;
  return notifications.filter((n) => mapFilter(n.type) === filter);
}

/**
 * Map a raw notification type onto the canonical filter bucket.
 * job + bid → Bids & jobs · payment → Money · message → Messages ·
 * system → All only. DB stores full event names (bid_received, …) and
 * pages pass raw rows in, so normalise first or every tab counts 0.
 */
function mapFilter(type: string): InboxFilter | 'system' {
  switch (normalizeNotificationType(type)) {
    case 'job':
    case 'bid':
      return 'jobs';
    case 'message':
      return 'messages';
    case 'payment':
      return 'money';
    case 'system':
    default:
      return 'system';
  }
}

export function computeInboxCounts(notifications: InboxNotification[]): Counts {
  let jobs = 0;
  let messages = 0;
  let money = 0;
  let unread = 0;
  for (const n of notifications) {
    if (!n.is_read) unread += 1;
    const bucket = mapFilter(n.type);
    if (bucket === 'jobs') jobs += 1;
    else if (bucket === 'messages') messages += 1;
    else if (bucket === 'money') money += 1;
  }
  return { all: notifications.length, jobs, messages, money, unread };
}

// ── Date bucketing ──────────────────────────────────────────────────

type DateBucket = 'today' | 'yesterday' | 'this_week' | 'older';

function bucketFor(dateString: string): DateBucket {
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  // Use a rolling 7-day window so timezones don't shift the bucket.
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfWeek) return 'this_week';
  return 'older';
}

const BUCKET_LABELS: Record<DateBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  older: 'Older',
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

// ── Icons ───────────────────────────────────────────────────────────

function IconForType({ type }: { type: NotificationType }) {
  const Icon = (() => {
    switch (normalizeNotificationType(type)) {
      case 'bid':
        return PoundSterling;
      case 'job':
        return CalendarDays;
      case 'message':
        return MessageSquare;
      case 'payment':
        return CheckCircle2;
      case 'system':
        return ShieldAlert;
      default:
        return Bell;
    }
  })();
  return (
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--me-brand-soft)',
        color: 'var(--me-brand)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={16} strokeWidth={1.75} />
    </span>
  );
}

// ── Row ─────────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onClick,
  onDelete,
}: {
  notification: InboxNotification;
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
        padding: '14px 18px',
        background: isUnread ? 'var(--me-brand-soft)' : 'transparent',
        borderRadius: 'var(--me-radius-card, 14px)',
        cursor: 'pointer',
      }}
    >
      <IconForType type={notification.type} />
      <div
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Sentence-style row text. We preserve newlines from the
            message field but expect the server-side notification
            builder to keep title + message terse for this layout. */}
        <p
          className='t-body'
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--me-ink)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <strong style={{ fontWeight: 600 }}>{notification.title}</strong>
          {notification.message ? (
            <>
              {' — '}
              <span style={{ color: 'var(--me-ink-2)' }}>
                {notification.message}
              </span>
            </>
          ) : null}
        </p>
        <span
          className='t-meta'
          style={{ fontSize: 12, color: 'var(--me-ink-3)' }}
        >
          {formatTimeAgo(notification.created_at)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {isUnread ? (
          <span
            aria-label='Unread'
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--me-brand)',
            }}
          />
        ) : null}
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          aria-label='Delete notification'
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ padding: '4px 6px' }}
        >
          <Trash2
            size={14}
            strokeWidth={1.75}
            style={{ color: 'var(--me-ink-3)' }}
          />
        </button>
      </div>
    </div>
  );
}

// ── View ────────────────────────────────────────────────────────────

export function NotificationsInboxView({
  notifications,
  loading,
  filter,
  onFilterChange,
  preferencesHref,
  onMarkAllRead,
  onNotificationClick,
  onDelete,
}: NotificationsInboxViewProps) {
  const counts = computeInboxCounts(notifications);
  const visible = filteredList(notifications, filter);

  // Bucket by date (already filtered).
  const buckets: Record<DateBucket, InboxNotification[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    older: [],
  };
  for (const n of visible) buckets[bucketFor(n.created_at)].push(n);

  const subtitle =
    counts.unread > 0
      ? `${counts.unread} unread. We try not to ping unless it matters.`
      : "You're all caught up. We try not to ping unless it matters.";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div className='between' style={{ alignItems: 'flex-start' }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Notifications</h1>
          <p className='t-body' style={{ color: 'var(--me-ink-3)' }}>
            {subtitle}
          </p>
        </div>
        <div className='row' style={{ gap: 8 }}>
          {counts.unread > 0 ? (
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={onMarkAllRead}
            >
              Mark all read
            </button>
          ) : null}
          <Link
            href={preferencesHref}
            className='btn btn-ghost btn-sm'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Settings size={14} strokeWidth={1.75} />
            Preferences
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div
        className='row'
        style={{
          gap: 24,
          borderBottom: '1px solid var(--me-line)',
          paddingBottom: 0,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = filter === tab.id;
          const count = counts[tab.countKey];
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => onFilterChange(tab.id)}
              className='btn btn-ghost'
              style={{
                background: 'transparent',
                padding: '10px 2px',
                borderRadius: 0,
                borderBottom: isActive
                  ? '2px solid var(--me-brand)'
                  : '2px solid transparent',
                color: isActive ? 'var(--me-brand)' : 'var(--me-ink-2)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label} · {count}
            </button>
          );
        })}
      </div>

      {/* Body */}
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
            <Bell size={24} strokeWidth={1.5} />
          </span>
          <h2 className='t-h4' style={{ marginBottom: 4 }}>
            Nothing here yet
          </h2>
          <p className='t-body' style={{ color: 'var(--me-ink-3)' }}>
            Bids, messages and money updates will land in this tab.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {(Object.keys(buckets) as DateBucket[]).map((bucket) => {
            const items = buckets[bucket];
            if (items.length === 0) return null;
            return (
              <section
                key={bucket}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <h3
                  className='t-meta'
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--me-ink-3)',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  {BUCKET_LABELS[bucket]}
                </h3>
                <div className='card' style={{ padding: 6 }}>
                  {items.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => onNotificationClick(n)}
                      onDelete={() => onDelete(n.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
