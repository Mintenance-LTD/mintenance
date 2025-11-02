'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: string;
}

interface NotificationsDropdownProps {
  currentUserId?: string;
}

export function NotificationsDropdown({ currentUserId }: NotificationsDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Fetch unread count periodically
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Every 30 seconds

    fetchUnreadCount();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/social?limit=10&unread_only=false');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/social?limit=1&unread_only=true');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      router.push(notification.action_url);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_liked':
        return 'heart';
      case 'comment_added':
      case 'comment_replied':
        return 'messages';
      case 'new_follower':
        return 'userPlus';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'post_liked':
        return theme.colors.error;
      case 'comment_added':
      case 'comment_replied':
        return theme.colors.primary;
      case 'new_follower':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (!currentUserId) {
    return null;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: theme.spacing[2],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="bell" size={20} color={theme.colors.textSecondary} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: theme.colors.error,
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.bold,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 1000,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.lg,
            width: '360px',
            maxHeight: '500px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
              borderBottom: `1px solid ${theme.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                margin: 0,
              }}
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span
                style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  backgroundColor: theme.colors.primary + '20',
                  color: theme.colors.primary,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
            {loading ? (
              <div style={{ padding: theme.spacing[6], textAlign: 'center', color: theme.colors.textSecondary }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: theme.spacing[6], textAlign: 'center', color: theme.colors.textSecondary }}>
                <Icon name="bell" size={48} color={theme.colors.textQuaternary} />
                <p style={{ marginTop: theme.spacing[2] }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    width: '100%',
                    padding: theme.spacing[4],
                    borderBottom: `1px solid ${theme.colors.border}`,
                    background: notification.read ? 'transparent' : theme.colors.primary + '08',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: theme.spacing[3],
                    alignItems: 'flex-start',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : theme.colors.primary + '08';
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: getNotificationColor(notification.type) + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={getNotificationIcon(notification.type)} size={20} color={getNotificationColor(notification.type)} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: notification.read ? theme.typography.fontWeight.normal : theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing[1],
                      }}
                    >
                      {notification.title}
                    </div>
                    <div
                      style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                        lineHeight: 1.4,
                        marginBottom: theme.spacing[1],
                      }}
                    >
                      {notification.message}
                    </div>
                    <div
                      style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textTertiary,
                      }}
                    >
                      {new Date(notification.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {!notification.read && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: theme.colors.primary,
                        flexShrink: 0,
                        marginTop: theme.spacing[1],
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: theme.spacing[3],
                borderTop: `1px solid ${theme.colors.border}`,
                textAlign: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  router.push('/contractor/notifications');
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.primary,
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

