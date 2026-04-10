'use client';

import React, { useState, useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import type { Notification } from './notificationDropdownUtils';
import {
  fetchNotificationsApi,
  markAsReadApi,
  markAllAsReadApi,
} from './notificationDropdownApi';
import { NotificationDropdownButton } from './NotificationDropdownButton';
import { NotificationDropdownPanel } from './NotificationDropdownPanel';

interface NotificationDropdownProps {
  userId: string;
}

export function NotificationDropdown(props: NotificationDropdownProps) {
  // Defensive prop destructuring with defaults to prevent test crashes
  const { userId = '' } = props || {};

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );
  const prevUnreadRef = useRef<number>(-1);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch notifications when dropdown opens or on mount
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Poll for new notifications every 60 seconds
      pollingRef.current = setInterval(fetchNotifications, 60000);
      return () => clearInterval(pollingRef.current);
    }
  }, [userId]);

  // Also fetch when dropdown opens to get latest notifications
  useEffect(() => {
    if (isOpen && userId) {
      fetchNotifications();
    }
  }, [isOpen, userId]);

  const fetchNotifications = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const result = await fetchNotificationsApi(userId);

      if (result.authExpired) {
        clearInterval(pollingRef.current);
        return;
      }

      setNotifications(result.notifications);

      // Only log when count changes to avoid console spam
      const unreadCount = result.notifications.filter((n) => !n.read).length;
      if (unreadCount !== prevUnreadRef.current) {
        prevUnreadRef.current = unreadCount;
        logger.info('Notifications updated', {
          service: 'NotificationDropdown',
          total: result.notifications.length,
          unread: unreadCount,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch notifications', error, {
        service: 'NotificationDropdown',
        userId,
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await markAsReadApi(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      logger.error('Failed to mark notification as read', error, {
        service: 'NotificationDropdown',
        notificationId,
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllAsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      logger.error('Failed to mark all as read', error, {
        service: 'NotificationDropdown',
        userId,
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <NotificationDropdownButton
        unreadCount={unreadCount}
        mounted={mounted}
        onClick={() => setIsOpen(!isOpen)}
      />

      {isOpen && mounted && (
        <NotificationDropdownPanel
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}

      <style jsx>{`
        .icon-btn:hover {
          background-color: ${theme.colors.backgroundTertiary};
        }
        .icon-btn:hover svg {
          stroke: ${theme.colors.primary};
        }
        .notification-dropdown-footer-link:hover a {
          background-color: ${theme.colors.backgroundSecondary} !important;
        }
      `}</style>
    </div>
  );
}
