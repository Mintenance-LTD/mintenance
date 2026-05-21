'use client';

/**
 * NotificationBell — shared topbar bell with live unread badge.
 *
 * Used by:
 *   - homeowner Mint Editorial shell (links to /notifications)
 *   - contractor Mint Editorial shell (links to /contractor/notifications)
 *
 * Sources of truth:
 *   - initial count: GET /api/notifications/unread-count
 *   - live updates: Supabase Realtime on the `notifications` table,
 *     filtered to the current user. Mirrors the pattern in
 *     `apps/web/app/notifications/useNotificationsRealtime.ts` so the
 *     badge and the inbox stay in lock-step without a second round-trip.
 *
 * Pure UI: shows a soft mint dot when count > 0, or a "9+" pill when
 * count > 9. Renders nothing while loading so it doesn't flash a stale
 * zero.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { logger } from '@mintenance/shared';

interface NotificationBellProps {
  /** Destination route — homeowner shell passes /notifications, contractor passes /contractor/notifications. */
  href: string;
}

export function NotificationBell({ href }: NotificationBellProps) {
  const { user } = useCurrentUser();
  const [count, setCount] = useState<number | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications/unread-count', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled) {
          setCount(typeof data.count === 'number' ? data.count : 0);
        }
      } catch (e) {
        logger.warn('NotificationBell: unread-count load failed', {
          service: 'ui',
          error: e instanceof Error ? e.message : String(e),
        });
        if (!cancelled) setCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Live updates. Mirrors useNotificationsRealtime — but instead of
  // mutating an array, we adjust the count by ±1 on insert/delete and
  // on update we read the new `read` boolean to figure out whether the
  // row just became read (-1) or unread (+1). UPDATE payloads include
  // both `old` and `new` so we can tell the direction.
  useRealtime(
    user
      ? {
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
          onInsert: (payload) => {
            const row = payload.new as { read?: boolean };
            const wasUnread = !(row?.read ?? false);
            if (wasUnread) {
              setCount((c) => (c == null ? 1 : c + 1));
            }
          },
          onUpdate: (payload) => {
            const before = payload.old as { read?: boolean } | null;
            const after = payload.new as { read?: boolean };
            const wasRead = !!before?.read;
            const isRead = !!after?.read;
            if (wasRead && !isRead) {
              setCount((c) => (c == null ? 1 : c + 1));
            } else if (!wasRead && isRead) {
              setCount((c) => (c == null ? 0 : Math.max(0, c - 1)));
            }
          },
          onDelete: (payload) => {
            const row = payload.old as { read?: boolean } | null;
            const wasUnread = !(row?.read ?? false);
            if (wasUnread) {
              setCount((c) => (c == null ? 0 : Math.max(0, c - 1)));
            }
          },
        }
      : undefined
  );

  // While the initial fetch is in flight we render the plain bell —
  // skipping the badge avoids flashing "0" then snapping to a real count.
  const showBadge = count != null && count > 0;
  const label =
    count == null
      ? 'Notifications'
      : count > 0
        ? `Notifications, ${count} unread`
        : 'Notifications, no unread';

  return (
    <Link
      href={href}
      className='btn btn-ghost btn-sm'
      aria-label={label}
      style={{ position: 'relative' }}
    >
      <Bell size={15} strokeWidth={1.75} />
      {showBadge ? (
        <span
          aria-hidden='true'
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 9999,
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: '16px',
            textAlign: 'center',
            border: '2px solid var(--me-surface)',
            boxSizing: 'content-box',
          }}
        >
          {count! > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  );
}
