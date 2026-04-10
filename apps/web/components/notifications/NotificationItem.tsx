'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import {
  getNotificationIcon,
  getNotificationColor,
  formatTime,
} from './notificationDropdownUtils';
import type { Notification } from './notificationDropdownUtils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  return (
    <div
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
      className={`group relative transition-all duration-200 ${
        !notification.read ? 'border-l-4 border-l-primary-600' : ''
      }`}
      style={{
        padding: theme.spacing[4],
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: notification.read
          ? theme.colors.surface
          : theme.colors.backgroundSecondary,
        cursor: 'pointer',
        display: 'flex',
        gap: theme.spacing[3],
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read
          ? theme.colors.surface
          : theme.colors.backgroundSecondary;
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: theme.borderRadius.full,
          backgroundColor: `${getNotificationColor(notification.type)}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          name={getNotificationIcon(notification.type)}
          size={20}
          color={getNotificationColor(notification.type)}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing[1],
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: notification.read
                ? theme.typography.fontWeight.medium
                : theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}
          >
            {notification.title}
          </h4>
          <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className='p-1.5 rounded-lg hover:bg-gray-200 transition-colors'
                aria-label='Mark as read'
              >
                <Icon
                  name='check'
                  size={14}
                  color={theme.colors.textSecondary}
                />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete if needed
              }}
              className='p-1.5 rounded-lg hover:bg-red-100 transition-colors'
              aria-label='Delete notification'
            >
              <Icon name='trash' size={14} color={theme.colors.error} />
            </button>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {notification.message}
        </p>
        <p
          style={{
            margin: 0,
            marginTop: theme.spacing[1],
            fontSize: '10px',
            color: theme.colors.textTertiary,
          }}
        >
          {formatTime(notification.created_at)}
        </p>
      </div>
    </div>
  );
}
