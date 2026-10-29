'use client';

/** Shared notification bell. HTTP remains authoritative if realtime is unavailable. */

import React, { useEffect, useRef, useState } from 'react';
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
  const userId = user?.id;
  const [snapshot, setSnapshot] = useState<{
    userId: string;
    count: number;
  } | null>(null);
  const refreshRef = useRef<() => void>(() => {});
  const count = snapshot?.userId === userId ? (snapshot?.count ?? null) : null;

  useEffect(() => {
    setSnapshot(null);
    if (!userId) return;
    let disposed = false;
    let controller: AbortController | null = null;
    let refreshAgain = false;
    const refresh = async () => {
      if (disposed) return;
      if (controller) {
        refreshAgain = true;
        return;
      }
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10_000);
      try {
        const res = await fetch('/api/notifications/unread-count', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Unread count request failed');
        const data = (await res.json()) as { count?: number };
        if (!Number.isSafeInteger(data.count) || data.count! < 0) {
          throw new Error('Invalid unread count');
        }
        if (!disposed) setSnapshot({ userId, count: data.count! });
      } catch {
        if (!disposed) {
          // Unknown is not zero. Do not show a false "no unread" result.
          setSnapshot(null);
          logger.warn('NotificationBell: unread-count load failed', {
            service: 'ui',
          });
        }
      } finally {
        window.clearTimeout(timeout);
        controller = null;
        if (refreshAgain && !disposed) {
          refreshAgain = false;
          void refresh();
        }
      }
    };
    const requestRefresh = () => {
      void refresh();
    };
    refreshRef.current = requestRefresh;
    requestRefresh();
    // Also reconciles missed events and incomplete RLS old-row payloads.
    const interval = window.setInterval(requestRefresh, 30_000);
    window.addEventListener('online', requestRefresh);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', requestRefresh);
      refreshRef.current = () => {};
    };
  }, [userId]);

  const { status } = useRealtime(
    userId
      ? {
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
          onInsert: () => refreshRef.current(),
          onUpdate: () => refreshRef.current(),
          onDelete: () => refreshRef.current(),
        }
      : undefined
  );
  useEffect(() => {
    if (status.connected) refreshRef.current();
  }, [status.connected]);

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
