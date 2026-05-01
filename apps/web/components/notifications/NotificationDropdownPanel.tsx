'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import { NotificationItem } from './NotificationItem';
import type { Notification } from './notificationDropdownUtils';
import { safeActionUrl } from '@/lib/notifications/safe-action-url';

interface NotificationDropdownPanelProps {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function NotificationDropdownPanel({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        width: '380px',
        maxHeight: '500px',
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: theme.spacing[4],
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}
        >
          Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.primary,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              padding: theme.spacing[1],
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '400px',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: theme.spacing[8],
              textAlign: 'center',
              color: theme.colors.textSecondary,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: '3px solid #d1d5db',
                  borderTopColor: '#6b7280',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              padding: theme.spacing[8],
              textAlign: 'center',
            }}
          >
            <Icon name='bell' size={48} color={theme.colors.textTertiary} />
            <p
              style={{
                marginTop: theme.spacing[3],
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              }}
            >
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            // 2026-04-30 audit: clamp action_url / link to allow-listed
            // internal paths so a bad value can't redirect the user
            // outside the app.
            const rawUrl = notification.link || notification.action_url;
            const hasLink = !!rawUrl;
            const linkUrl = safeActionUrl(rawUrl, '/notifications');

            return (
              <div key={notification.id}>
                {hasLink ? (
                  <Link
                    href={linkUrl}
                    style={{ textDecoration: 'none' }}
                    onClick={() => {
                      // Mark as read when clicked
                      if (!notification.read) {
                        onMarkAsRead(notification.id);
                      }
                      // Close dropdown after navigation
                      onClose();
                    }}
                  >
                    <NotificationItem
                      notification={notification}
                      onMarkAsRead={onMarkAsRead}
                    />
                  </Link>
                ) : (
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <span className='notification-dropdown-footer-link'>
          <Link
            href='/notifications'
            style={{
              padding: theme.spacing[3],
              textAlign: 'center',
              borderTop: `1px solid ${theme.colors.border}`,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.primary,
              textDecoration: 'none',
              display: 'block',
              transition: 'background-color 0.2s',
            }}
          >
            View all notifications
          </Link>
        </span>
      )}
    </div>
  );
}
