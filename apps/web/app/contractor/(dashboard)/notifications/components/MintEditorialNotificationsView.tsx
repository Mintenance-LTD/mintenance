'use client';

/**
 * Mint Editorial port of `/contractor/notifications`.
 *
 * Canonical primitives used (mint-editorial.css):
 *   - `.t-h1` + `.t-body` page header with the unread-count line
 *   - `.btn-secondary` for "Clear all" + `.btn-primary` for "Mark
 *     all read"
 *   - `.chip` row for filters (All / Unread / Jobs / Messages /
 *     Payments) with brand-tinted count pills
 *   - `MintEditorialEmptyState` for the no-notifications case
 *   - `.card` list with per-row brand-soft icon tile, brand
 *     border-left + brand-soft background for unread rows, .t-h3
 *     title + .t-body message + .t-meta timestamp
 *   - `.btn-ghost` Delete; `.btn-primary btn-sm` View (when an
 *     action_url is present)
 *
 * Self-contained presentational component — all data + handlers
 * come from the parent (page.tsx). No fetch / no mutation logic
 * lives here so the canonical look is decoupled from the
 * controller.
 */

import React from 'react';
import { Bell, Clock, Trash2 } from 'lucide-react';
import {
  getNotificationIcon,
  getNotificationColor,
} from '../notification-icons';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';
import type {
  Notification,
  FilterType,
  NotificationFilterTab,
} from '../notification-types';

interface MintEditorialNotificationsViewProps {
  notifications: Notification[];
  filteredNotifications: Notification[];
  loadingNotifications: boolean;
  unreadCount: number;
  filterTabs: NotificationFilterTab[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notification: Notification) => void;
  onDeleteNotification: (id: string) => void;
  formatTimeAgo: (dateString: string) => string;
}

export function MintEditorialNotificationsView({
  notifications,
  filteredNotifications,
  loadingNotifications,
  unreadCount,
  filterTabs,
  filter,
  onFilterChange,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
  onDeleteNotification,
  formatTimeAgo,
}: MintEditorialNotificationsViewProps) {
  return (
    <div className='col' style={{ gap: 20 }}>
      {/* Header */}
      <div className='between' style={{ alignItems: 'flex-start' }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Notifications</h1>
          <p className='t-body'>
            {unreadCount > 0
              ? `${unreadCount} unread notification${
                  unreadCount === 1 ? '' : 's'
                } — tap any row to view the linked job, bid, or message.`
              : "You're all caught up — new alerts will appear here."}
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
          {unreadCount > 0 ? (
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={onMarkAllAsRead}
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter chips */}
      <div className='card' style={{ padding: 14 }}>
        <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type='button'
              className={`chip ${filter === tab.value ? 'on' : ''}`}
              onClick={() => onFilterChange(tab.value)}
            >
              {tab.label}
              {tab.count > 0 ? (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      filter === tab.value
                        ? 'var(--me-on-brand)'
                        : 'var(--me-ink-3)',
                  }}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loadingNotifications ? (
        <div
          className='card'
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--me-ink-3)',
            fontSize: 13,
          }}
        >
          Loading notifications…
        </div>
      ) : filteredNotifications.length === 0 ? (
        <MintEditorialEmptyState
          icon={Bell}
          title={
            filter === 'unread'
              ? 'No unread notifications'
              : 'No notifications yet'
          }
          body={
            filter === 'unread'
              ? "You're all caught up — new alerts will appear here as homeowners interact with your jobs and bids."
              : 'When a homeowner accepts a bid, requests a quote, or sends a message you’ll see it here.'
          }
        />
      ) : (
        <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
          {filteredNotifications.map((notification, index) => {
            const isUnread = !notification.is_read;
            // `getNotificationColor` returns a Tailwind class name
            // (bg-teal-600, bg-amber-500, etc.). The shell-level
            // me-legacy-fit covers some of these for us; for clarity
            // we still apply it via className so the SVG icon
            // stays white-on-coloured.
            const iconBgClass = getNotificationColor(notification.type);
            return (
              <div
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  background: isUnread ? 'var(--me-brand-soft)' : 'transparent',
                  borderLeft: isUnread
                    ? '3px solid var(--me-brand)'
                    : '3px solid transparent',
                  borderBottom:
                    index < filteredNotifications.length - 1
                      ? '1px solid var(--me-line-2)'
                      : undefined,
                  alignItems: 'flex-start',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isUnread
                    ? 'var(--me-brand-soft)'
                    : 'var(--me-bg-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isUnread
                    ? 'var(--me-brand-soft)'
                    : 'transparent';
                }}
              >
                {/* Icon tile */}
                <div
                  className={iconBgClass}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--me-on-brand)',
                    flexShrink: 0,
                  }}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className='col' style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <div className='row' style={{ gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--me-ink)',
                      }}
                    >
                      {notification.title}
                    </span>
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

                  <p
                    className='t-body'
                    style={{
                      color: 'var(--me-ink-2)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {notification.message}
                  </p>

                  <div
                    className='row'
                    style={{
                      gap: 12,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      className='t-meta'
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Clock size={11} strokeWidth={1.75} />
                      {formatTimeAgo(notification.created_at)}
                    </span>
                    <div className='row' style={{ gap: 6 }}>
                      {notification.action_url ? (
                        <button
                          type='button'
                          className='btn btn-primary btn-sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            onNotificationClick(notification);
                          }}
                        >
                          View
                        </button>
                      ) : null}
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notification.id);
                        }}
                        aria-label='Delete notification'
                        style={{ color: 'var(--me-err)' }}
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
