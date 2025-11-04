'use client';

import React, { useState, useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'message' | 'bid' | 'bid_received' | 'bid_accepted' | 'bid_rejected' | 'job_update' | 'job_viewed' | 'job_nearby' | 'payment' | 'quote_viewed' | 'quote_accepted' | 'project_reminder' | 'post_liked' | 'comment_added' | 'comment_replied' | 'new_follower' | 'contract_created' | 'contract_signed';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  action_url?: string;
}

interface NotificationDropdownProps {
  userId: string;
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch notifications when dropdown opens or on mount
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
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
      // Fetch both regular notifications and social notifications
      const [regularResponse, socialResponse] = await Promise.all([
        fetch(`/api/notifications?userId=${userId}`).catch((err) => {
          console.error('Error fetching regular notifications:', err);
          return null;
        }),
        fetch('/api/notifications/social?limit=20&unread_only=false').catch((err) => {
          console.error('Error fetching social notifications:', err);
          return null;
        }),
      ]);

      const notifications: Notification[] = [];

      // Add regular notifications
      if (regularResponse?.ok) {
        try {
          const regularData = await regularResponse.json();
          let parsedNotifications: Notification[] = [];
          
          if (Array.isArray(regularData)) {
            parsedNotifications = regularData;
          } else if (Array.isArray(regularData.notifications)) {
            parsedNotifications = regularData.notifications;
          } else if (regularData && typeof regularData === 'object') {
            // Handle case where API returns object with notifications array
            const notifArray = regularData.notifications || regularData.data || [];
            if (Array.isArray(notifArray)) {
              parsedNotifications = notifArray;
            }
          }
          
          notifications.push(...parsedNotifications);
          
          // Debug: Log bid_accepted notifications
          const bidAccepted = parsedNotifications.filter(n => n.type === 'bid_accepted');
          if (bidAccepted.length > 0) {
            console.log(`[NotificationDropdown] Found ${bidAccepted.length} bid_accepted notification(s)`, bidAccepted);
          }
        } catch (parseError) {
          console.error('Error parsing regular notifications response:', parseError);
        }
      } else if (regularResponse) {
        const errorText = await regularResponse.text().catch(() => 'Unknown error');
        console.warn('Regular notifications API returned non-OK status:', {
          status: regularResponse.status,
          statusText: regularResponse.statusText,
          error: errorText,
        });
      }

      // Add social notifications
      if (socialResponse?.ok) {
        const socialData = await socialResponse.json();
        if (Array.isArray(socialData.notifications)) {
          notifications.push(...socialData.notifications);
        }
      }

      // Sort by created_at (newest first) and remove duplicates
      const uniqueNotifications = notifications
        .filter((n, index, self) => index === self.findIndex((t) => t.id === n.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(uniqueNotifications);
      
      // Debug logging
      if (typeof window !== 'undefined' && uniqueNotifications.length > 0) {
        console.log('Notifications fetched:', {
          total: uniqueNotifications.length,
          unread: uniqueNotifications.filter(n => !n.read).length,
          types: uniqueNotifications.map(n => n.type),
          notifications: uniqueNotifications.slice(0, 3).map(n => ({ id: n.id, type: n.type, title: n.title, read: n.read })),
        });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return 'messages';
      case 'bid':
      case 'bid_received':
        return 'currencyDollar';
      case 'bid_accepted':
        return 'checkCircle';
      case 'bid_rejected':
        return 'xCircle';
      case 'job_update':
        return 'briefcase';
      case 'job_viewed':
        return 'eye';
      case 'job_nearby':
        return 'briefcase';
      case 'payment':
        return 'creditCard';
      case 'quote_viewed':
        return 'eye';
      case 'quote_accepted':
        return 'checkCircle';
      case 'project_reminder':
        return 'calendar';
      case 'post_liked':
        return 'heart';
      case 'comment_added':
      case 'comment_replied':
        return 'messages';
      case 'new_follower':
        return 'userPlus';
      case 'contract_created':
      case 'contract_signed':
        return 'fileText';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message':
        return theme.colors.info;
      case 'bid':
      case 'bid_received':
        return theme.colors.success;
      case 'bid_accepted':
        return theme.colors.success; // Green for accepted
      case 'bid_rejected':
        return theme.colors.textSecondary; // Gray for rejected
      case 'job_update':
        return theme.colors.warning;
      case 'job_viewed':
        return '#3B82F6'; // Blue for viewed
      case 'job_nearby':
        return theme.colors.warning; // Amber for nearby jobs
      case 'payment':
        return theme.colors.secondary;
      case 'quote_viewed':
        return '#3B82F6'; // Blue for viewed
      case 'quote_accepted':
        return theme.colors.success; // Green for accepted
      case 'project_reminder':
        return '#F59E0B'; // Amber for reminders
      case 'post_liked':
        return theme.colors.error; // Red for likes
      case 'comment_added':
      case 'comment_replied':
        return theme.colors.primary; // Blue for comments
      case 'new_follower':
        return theme.colors.success; // Green for followers
      case 'contract_created':
        return theme.colors.primary; // Blue for contract created
      case 'contract_signed':
        return theme.colors.success; // Green for contract signed
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationContent = (notification: Notification) => (
    <div
      onClick={() => !notification.read && markAsRead(notification.id)}
      style={{
        padding: theme.spacing[4],
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: notification.read
          ? theme.colors.surface
          : theme.colors.backgroundSecondary,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
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
          {!notification.read && (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary,
                flexShrink: 0,
                marginLeft: theme.spacing[2],
              }}
            />
          )}
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

  // Prevent hydration mismatch - render placeholder on server
  // Match the client structure exactly - use exact same values
  if (!mounted) {
    // Use theme values directly to match client exactly
    const backgroundColor = theme.colors.backgroundSecondary;
    const iconColor = theme.colors.textSecondary;
    
    return (
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label="Notifications"
          aria-live="polite"
          className="icon-btn"
          style={{
            position: 'relative',
            display: 'flex',
            height: '40px',
            width: '40px',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.full,
            backgroundColor: backgroundColor,
            border: 'none',
            transition: 'all 0.2s',
          }}
        >
          <Icon name="bell" size={20} color={iconColor} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Notification Button */}
      <button
        type="button"
        aria-label="Notifications"
        aria-live="polite"
        className="icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          display: 'flex',
          height: '40px',
          width: '40px',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.backgroundSecondary,
          border: 'none',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
        }}
      >
        <Icon name="bell" size={20} color={theme.colors.textSecondary} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              right: '6px',
              top: '6px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.full,
              backgroundColor: '#EF4444',
              color: 'white',
              fontSize: '10px',
              fontWeight: theme.typography.fontWeight.bold,
              padding: '0 4px',
              border: '2px solid white',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
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
                onClick={markAllAsRead}
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
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: theme.spacing[8],
                  textAlign: 'center',
                }}
              >
                <Icon name="bell" size={48} color={theme.colors.textTertiary} />
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
                const hasLink = !!(notification.link || notification.action_url);
                const linkUrl = notification.link || notification.action_url || '/notifications';

                return (
                  <div key={notification.id}>
                    {hasLink ? (
                      <Link 
                        href={linkUrl} 
                        style={{ textDecoration: 'none' }}
                        onClick={() => {
                          // Mark as read when clicked
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                          // Close dropdown after navigation
                          setIsOpen(false);
                        }}
                      >
                        {renderNotificationContent(notification)}
                      </Link>
                    ) : (
                      renderNotificationContent(notification)
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <span className="notification-dropdown-footer-link">
              <Link
                href="/notifications"
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

